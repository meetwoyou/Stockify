// === FIREBASE SETUP ENGINE (MODERN SDK) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// আপনার কনফিগারেশন (বদলানোর প্রয়োজন নেই)
const firebaseConfig = {
  apiKey: "AIzaSyBl_CcAlhQC04DiWKrjtaJDJejcBofE-Q8",
  authDomain: "stockify-cffcc.firebaseapp.com",
  projectId: "stockify-cffcc",
  storageBucket: "stockify-cffcc.firebasestorage.app",
  messagingSenderId: "733602526131",
  appId: "1:733602526131:web:ed529d1ff01b2ddee091c6",
  measurementId: "G-F1FJS6Z7CQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// === APP STATE ===
let localProducts = [];
let currentCategory = 'All';
let scannerInstance = null;
let selectedFileBlob = null;

// === ROUTING SYSTEM ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.remove('hidden');

    // UI Active state handling for Sidebar & Bottom Nav
    updateNavUI(pageId);

    // Scanner Logic
    if (pageId === 'scanner') startScanner();
    else stopScanner();
    
    lucide.createIcons();
};

function updateNavUI(activePage) {
    // Desktop Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const page = btn.getAttribute('onclick')?.match(/'([^']+)'/)[1];
        if (page === activePage) btn.classList.add('active-nav');
        else btn.classList.remove('active-nav');
    });
    // Mobile Nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        const page = btn.getAttribute('data-page');
        if (page === activePage) btn.classList.replace('text-slate-400', 'text-primary');
        else btn.classList.replace('text-primary', 'text-slate-400');
    });
}

// === IMAGE COMPRESSION ENGINE ===
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}

// === FORMS & CALCULATIONS ===
window.handleFormImage = async (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFileBlob = await compressImage(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('form-img-output').src = ev.target.result;
            document.getElementById('image-preview-box').classList.remove('hidden');
            document.getElementById('image-input-label').classList.add('hidden');
        };
        reader.readAsDataURL(selectedFileBlob);
    }
};

window.removeFormImage = () => {
    selectedFileBlob = null;
    document.getElementById('form-image-input').value = '';
    document.getElementById('image-preview-box').classList.add('hidden');
    document.getElementById('image-input-label').classList.remove('hidden');
};

const calcStockAndPrice = (trigger) => {
    const ctns = parseInt(document.getElementById('form-cartons').value) || 0;
    const perCtn = parseInt(document.getElementById('form-pcs-per').value) || 1;
    const totalPcsField = document.getElementById('form-total-pcs');
    const ctnPriceField = document.getElementById('form-carton-price');
    const pcePriceField = document.getElementById('form-piece-price');

    totalPcsField.value = ctns * perCtn;

    if (trigger === 'ctn') {
        pcePriceField.value = ((parseFloat(ctnPriceField.value) || 0) / perCtn).toFixed(2);
    } else {
        ctnPriceField.value = ((parseFloat(pcePriceField.value) || 0) * perCtn).toFixed(2);
    }
};

// === CRUD OPERATIONS ===
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('form-id').value;
    submitBtn.disabled = true;
    submitBtn.innerText = "সেভ হচ্ছে...";

    try {
        let imageUrl = document.getElementById('form-img-output').src;

        if (selectedFileBlob) {
            const storageRef = ref(storage, `products/${Date.now()}.jpg`);
            const uploadTask = await uploadBytes(storageRef, selectedFileBlob);
            imageUrl = await getDownloadURL(uploadTask.ref);
        }

        const data = {
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: document.getElementById('form-category').value,
            cartons: parseInt(document.getElementById('form-cartons').value) || 0,
            piecesPerCarton: parseInt(document.getElementById('form-pcs-per').value) || 0,
            totalPieces: parseInt(document.getElementById('form-total-pcs').value) || 0,
            cartonPrice: parseFloat(document.getElementById('form-carton-price').value) || 0,
            piecePrice: parseFloat(document.getElementById('form-piece-price').value) || 0,
            expiryDate: document.getElementById('form-expiry').value,
            image: imageUrl.startsWith('data:') ? '' : imageUrl,
            updatedAt: new Date().toISOString()
        };

        if (id) await updateDoc(doc(db, 'products', id), data);
        else await addDoc(collection(db, 'products'), data);

        window.closeProductForm();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "সেভ করুন";
    }
});

window.deleteProductTrigger = async (id) => {
    if (confirm('আপনি কি এই পণ্যটি মুছে ফেলতে চান?')) {
        const p = localProducts.find(x => x.id === id);
        if (p.image) {
            const fileRef = ref(storage, p.image);
            await deleteObject(fileRef).catch(() => {});
        }
        await deleteDoc(doc(db, 'products', id));
    }
};

window.editProductTrigger = (id) => {
    const p = localProducts.find(x => x.id === id);
    if (!p) return;
    window.openAddProductForm();
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-sku').value = p.sku;
    document.getElementById('form-category').value = p.category;
    document.getElementById('form-cartons').value = p.cartons;
    document.getElementById('form-pcs-per').value = p.piecesPerCarton;
    document.getElementById('form-carton-price').value = p.cartonPrice;
    document.getElementById('form-piece-price').value = p.piecePrice;
    document.getElementById('form-expiry').value = p.expiryDate;
    if (p.image) {
        document.getElementById('form-img-output').src = p.image;
        document.getElementById('image-preview-box').classList.remove('hidden');
        document.getElementById('image-input-label').classList.add('hidden');
    }
    calcStockAndPrice();
};

// === REALTIME SYNC & RENDER ===
onSnapshot(collection(db, 'products'), (snap) => {
    localProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
    renderProductGrid();
});

function renderDashboard() {
    document.getElementById('dash-total').innerText = localProducts.length;
    const expired = localProducts.filter(p => new Date(p.expiryDate) < new Date()).length;
    document.getElementById('dash-expired').innerText = expired;
    const totalPcs = localProducts.reduce((sum, p) => sum + p.totalPieces, 0);
    document.getElementById('dash-pieces').innerText = totalPcs;
}

function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = localProducts.filter(p => 
        p.name.toLowerCase().includes(search) || p.sku.includes(search)
    );

    grid.innerHTML = filtered.map(p => `
        <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
            <div class="relative aspect-video bg-slate-100 dark:bg-slate-900">
                <img src="${p.image || 'https://via.placeholder.com/400x225?text=No+Image'}" class="w-full h-full object-cover">
                <div class="absolute top-3 left-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-primary border border-primary/20">${p.category}</div>
            </div>
            <div class="p-5 space-y-3">
                <div>
                    <h3 class="font-bold text-lg leading-tight line-clamp-1">${p.name}</h3>
                    <p class="text-[10px] font-mono text-slate-400">SKU: ${p.sku}</p>
                </div>
                <div class="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div class="text-center">
                        <p class="text-[9px] font-black text-slate-400 uppercase">স্টক</p>
                        <p class="text-sm font-bold text-primary">${p.totalPieces} Pcs</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[9px] font-black text-slate-400 uppercase">মেয়াদ</p>
                        <p class="text-sm font-bold ${new Date(p.expiryDate) < new Date() ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}">${p.expiryDate}</p>
                    </div>
                </div>
                <div class="flex gap-2 pt-2">
                    <button onclick="editProductTrigger('${p.id}')" class="flex-1 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white rounded-xl flex items-center justify-center transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteProductTrigger('${p.id}')" class="w-10 h-10 border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// === SCANNER ENGINE ===
function startScanner() {
    scannerInstance = new Html5Qrcode("scanner-container");
    scannerInstance.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (code) => {
        const match = localProducts.find(p => p.sku === code);
        if (match) {
            alert(`পণ্য পাওয়া গেছে: ${match.name}`);
            window.switchPage('products');
            // আপনি এখানে চাইলে সরাসরি এডিট মোড ওপেন করতে পারেন
        } else {
            if (confirm("নতুন পণ্য? এন্ট্রি ফর্মে যাবো?")) {
                window.switchPage('products');
                window.openAddProductForm();
                document.getElementById('form-sku').value = code;
            }
        }
    });
}

function stopScanner() {
    if (scannerInstance) {
        scannerInstance.stop().then(() => scannerInstance = null);
    }
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    document.getElementById('form-image-input').addEventListener('change', window.handleFormImage);
    document.getElementById('form-cartons').addEventListener('input', () => calcStockAndPrice('ctn'));
    document.getElementById('form-piece-price').addEventListener('input', () => calcStockAndPrice('pce'));
    document.getElementById('form-pcs-per').addEventListener('input', () => calcStockAndPrice('ctn'));
    document.getElementById('search-input').addEventListener('input', renderProductGrid);
});
