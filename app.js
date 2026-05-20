// === ১. কনফিগারেশন এবং ইনিশিয়ালাইজেশন ===
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

// Firebase Initialize
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// Cloudinary Settings
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

let localDB;
let localProducts = [];
let scanner = null;
let compressedBase64 = null;

// === ২. ডাটাবেস এবং সিঙ্ক ইঞ্জিন ===
const initLocalDB = () => {
    return new Promise((resolve) => {
        const request = indexedDB.open('StockifyDB_v2', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { 
            localDB = e.target.result; 
            resolve(); 
        };
    });
};

window.syncData = async () => {
    // লোকালাইজড ডাটা লোড
    const tx = localDB.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    store.getAll().onsuccess = async (e) => {
        localProducts = e.target.result;
        renderDashboard();
        renderProducts();

        // ক্লাউড ব্যাকআপ থেকে লেটেস্ট ডাটা আনা
        try {
            const snapshot = await firestore.collection('stockify_products').get();
            const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const updateTx = localDB.transaction('products', 'readwrite');
            cloudData.forEach(p => updateTx.objectStore('products').put(p));
            
            localProducts = cloudData;
            renderDashboard();
            renderProducts();
        } catch (err) { console.log("Cloud sync paused (Offline)"); }
    };
};

// === ৩. ইমেজ প্রসেসিং (Compression 200-300kb) ===
window.compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max_size = 800;

                if (width > height && width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                } else if (height > max_size) {
                    width *= max_size / height;
                    height = max_size;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% Quality for compression
            };
        };
    });
};

window.handleFormImage = async (input) => {
    if (input.files && input.files[0]) {
        compressedBase64 = await compressImage(input.files[0]);
        const output = document.getElementById('form-img-output');
        output.src = compressedBase64;
        output.classList.remove('hidden');
        document.getElementById('image-placeholder').classList.add('hidden');
    }
};

window.removeFormImage = () => {
    compressedBase64 = null;
    document.getElementById('form-img-output').src = '';
    document.getElementById('form-img-output').classList.add('hidden');
    document.getElementById('image-placeholder').classList.remove('hidden');
};

// === ৪. নেভিগেশন এবং UI কন্ট্রোল ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    
    document.querySelectorAll('.mobile-nav-btn, .nav-btn').forEach(btn => {
        const isTarget = btn.getAttribute('data-page') === pageId;
        btn.style.color = isTarget ? '#16a34a' : '#94a3b8';
    });

    if (pageId === 'scanner') startScanner();
    else if (scanner) { scanner.stop(); scanner = null; }
    
    lucide.createIcons();
};

window.openAddProductForm = (sku = '') => {
    document.getElementById('products-list-view').classList.add('hidden');
    document.getElementById('products-form-view').classList.remove('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-sku').value = sku;
    removeFormImage();
};

window.closeProductForm = () => {
    document.getElementById('products-form-view').classList.add('hidden');
    document.getElementById('products-list-view').classList.remove('hidden');
};

// === ৫. ক্যালকুলেশন এবং CRUD ===
window.calculateTotalPieces = () => {
    const cartons = parseInt(document.getElementById('form-cartons').value) || 0;
    const perCtn = parseInt(document.getElementById('form-pcs-per').value) || 1;
    document.getElementById('form-total-pcs').value = cartons * perCtn;
};

window.calculatePrices = (source) => {
    const pcsPerCtn = parseInt(document.getElementById('form-pcs-per').value) || 1;
    const ctnPrice = document.getElementById('form-carton-price');
    const pcsPrice = document.getElementById('form-piece-price');

    if (source === 'carton') {
        pcsPrice.value = (parseFloat(ctnPrice.value || 0) / pcsPerCtn).toFixed(2);
    } else {
        ctnPrice.value = (parseFloat(pcsPrice.value || 0) * pcsPerCtn).toFixed(2);
    }
};

window.saveProduct = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = "Syncing..."; saveBtn.disabled = true;

    try {
        let finalImageUrl = document.getElementById('form-img-output').src;

        if (compressedBase64) {
            const formData = new FormData();
            formData.append('file', compressedBase64);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();
            finalImageUrl = data.secure_url;
        }

        const id = document.getElementById('form-id').value || Date.now().toString();
        const product = {
            id,
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: document.getElementById('form-category').value,
            cartons: document.getElementById('form-cartons').value,
            pcsPerCarton: document.getElementById('form-pcs-per').value,
            totalPieces: document.getElementById('form-total-pcs').value,
            cartonPrice: document.getElementById('form-carton-price').value,
            piecePrice: document.getElementById('form-piece-price').value,
            expiryDate: document.getElementById('form-expiry').value,
            image: finalImageUrl,
            updatedAt: Date.now()
        };

        // Local & Cloud Save
        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').put(product);
        await firestore.collection('stockify_products').doc(id).set(product);

        closeProductForm();
        syncData();
    } catch (err) {
        alert("Sync Failed: " + err.message);
    } finally {
        saveBtn.innerText = "Save & Cloud Backup"; saveBtn.disabled = false;
    }
};

// === ৬. রেন্ডারিং এবং ফিল্টারিং ===
window.renderProducts = (filter = 'all') => {
    const grid = document.getElementById('product-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    const today = new Date();

    let filtered = localProducts.filter(p => p.name.toLowerCase().includes(search) || p.sku.includes(search));
    
    if (filter === 'expired') {
        filtered = filtered.filter(p => new Date(p.expiryDate) < today);
    }

    grid.innerHTML = filtered.map(p => {
        const isExpired = new Date(p.expiryDate) < today;
        return `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] border-2 ${isExpired ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-transparent'} relative transition-all">
            <div class="h-32 rounded-3xl overflow-hidden mb-3">
                <img src="${p.image}" class="w-full h-full object-cover">
            </div>
            <h4 class="font-black text-sm uppercase truncate">${p.name}</h4>
            <p class="text-[10px] font-bold text-slate-400 mb-2">Barcode: ${p.sku}</p>
            <div class="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-2">
                <span class="text-xs font-black text-primary">${p.totalPieces} Pcs</span>
                <span class="text-xs font-black text-slate-900 dark:text-white">${p.piecePrice} SAR</span>
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="editProductTrigger('${p.id}')" class="flex-1 bg-slate-100 dark:bg-slate-700 py-2 rounded-xl text-[10px] font-black">EDIT</button>
                <button onclick="deleteProductTrigger('${p.id}')" class="p-2 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
};

window.renderDashboard = () => {
    const today = new Date();
    let totalPcs = 0, expCount = 0;
    localProducts.forEach(p => {
        totalPcs += parseInt(p.totalPieces || 0);
        if (new Date(p.expiryDate) < today) expCount++;
    });
    document.getElementById('dash-total').innerText = localProducts.length;
    document.getElementById('dash-pieces').innerText = totalPcs;
    document.getElementById('dash-expired').innerText = expCount;
};

// === ৭. স্মার্ট স্ক্যানার এবং মডাল ===
window.startScanner = () => {
    scanner = new Html5Qrcode("scanner-container");
    scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (decoded) => {
        const match = localProducts.find(p => p.sku === decoded);
        if (match) {
            scanner.stop();
            showProductModal(match);
        } else {
            scanner.stop();
            if(confirm("New Barcode: " + decoded + "\nAdd this to inventory?")) {
                openAddProductForm(decoded);
            } else {
                startScanner();
            }
        }
    }).catch(err => console.error("Camera Error", err));
};

function showProductModal(p) {
    const modal = document.getElementById('details-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 p-8 rounded-[3.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95">
        <img src="${p.image}" class="w-full h-48 object-cover rounded-[2.5rem] mb-6">
        <h2 class="text-2xl font-black uppercase mb-1">${p.name}</h2>
        <p class="text-primary font-black text-lg mb-4">${p.piecePrice} SAR / Piece</p>
        <div class="grid grid-cols-2 gap-4 text-[10px] font-black uppercase text-slate-400 mb-8 tracking-widest">
            <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl text-center">
                <p>Stock</p><p class="text-slate-900 dark:text-white text-sm">${p.totalPieces} Pcs</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl text-center">
                <p>Expiry</p><p class="${new Date(p.expiryDate) < new Date() ? 'text-red-500' : 'text-slate-900 dark:text-white'} text-sm">${p.expiryDate}</p>
            </div>
        </div>
        <div class="flex gap-3">
            <button onclick="document.getElementById('details-modal').classList.add('hidden')" class="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-xs">CLOSE</button>
            <button onclick="document.getElementById('details-modal').classList.add('hidden'); editProductTrigger('${p.id}')" class="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs">EDIT</button>
        </div>
    </div>`;
}

// === ৮. এডিট ও ডিলিট ===
window.editProductTrigger = (id) => {
    const p = localProducts.find(x => x.id === id);
    if (!p) return;
    openAddProductForm();
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-sku').value = p.sku;
    document.getElementById('form-category').value = p.category;
    document.getElementById('form-cartons').value = p.cartons;
    document.getElementById('form-pcs-per').value = p.pcsPerCarton;
    document.getElementById('form-total-pcs').value = p.totalPieces;
    document.getElementById('form-carton-price').value = p.cartonPrice;
    document.getElementById('form-piece-price').value = p.piecePrice;
    document.getElementById('form-expiry').value = p.expiryDate;
    document.getElementById('form-img-output').src = p.image;
    document.getElementById('form-img-output').classList.remove('hidden');
    document.getElementById('image-placeholder').classList.add('hidden');
};

window.deleteProductTrigger = async (id) => {
    if (confirm("Are you sure you want to delete this product from Cloud & Local?")) {
        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').delete(id);
        await firestore.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

window.toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
};

// === ৯. অ্যাপ শুরু ===
document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    await initLocalDB();
    syncData();
    lucide.createIcons();
});
