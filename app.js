// === FIREBASE SETUP ENGINE (ES MODULES) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Firebase App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBl_CcAlhQC04DiWKrjtaJDJejcBofE-Q8",
  authDomain: "stockify-cffcc.firebaseapp.com",
  projectId: "stockify-cffcc",
  storageBucket: "stockify-cffcc.firebasestorage.app",
  messagingSenderId: "733602526131",
  appId: "1:733602526131:web:ed529d1ff01b2ddee091c6",
  measurementId: "G-F1FJS6Z7CQ"
};

// Initialize Core Engines
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// === APP GLOBAL STATE ===
let localProducts = [];
let currentCategory = 'All';
let scannerInstance = null;
let isTorchOn = false;
let selectedFileBlob = null; // নতুন কোনো ইমেজ আপলোড ট্র্যাকিংয়ের জন্য

// === INTERFACE ROUTING ENGINE ===
function switchPage(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    const targetedPage = document.getElementById(`page-${pageId}`);
    if (targetedPage) targetedPage.classList.remove('hidden');

    // Desktop Nav Active State UI update
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.getAttribute('data-page') === pageId) {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-green-600 text-white shadow-md shadow-green-600/10";
        } else {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50";
        }
    });

    // Mobile Bottom Navigation UI Update
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        if(btn.getAttribute('data-page') === pageId) {
            btn.classList.replace('text-slate-400', 'text-green-600');
        } else {
            btn.classList.replace('text-green-600', 'text-slate-400');
        }
    });

    // Camera State Controller
    if (pageId === 'scanner') {
        startScannerEngine();
    } else {
        stopScannerEngine();
    }
}

// === EXPOSE CONTROLLERS TO HTML CONTEXT (Window Interface Binding) ===
window.switchPage = switchPage;
window.toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};
window.openAddProductForm = openAddProductForm;
window.closeProductForm = closeProductForm;
window.editProductTrigger = editProductTrigger;
window.deleteProductTrigger = deleteProductTrigger;
window.viewDetailsSheet = viewDetailsSheet;
window.closeDetailsSheet = closeDetailsSheet;
window.setCategoryFilter = (c) => {
    currentCategory = c;
    renderCategoryFilters();
    renderProducts();
};
window.showExpiredProductsTrigger = () => {
    currentCategory = 'Expired';
    switchPage('products');
};

// === AUDIO ALERTS ===
function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
}

// === IMAGE MANIPULATION ENGINE ===
function handleFormImage(e) {
    const file = e.target.files[0];
    if (file) {
        selectedFileBlob = file; // স্টোরেজে আপলোডের জন্য ফাইল অবজেক্ট স্টোর করা হল
        const reader = new FileReader();
        reader.onloadend = () => {
            document.getElementById('form-img-output').src = reader.result;
            document.getElementById('image-preview-box').classList.remove('hidden');
            document.getElementById('image-input-label').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function removeFormImage() {
    selectedFileBlob = null;
    document.getElementById('form-image-input').value = "";
    document.getElementById('form-img-output').src = "";
    document.getElementById('image-preview-box').classList.add('hidden');
    document.getElementById('image-input-label').classList.remove('hidden');
}

// === DYNAMIC FORMS METRICS SYSTEM ===
function calculatePrices(source) {
    const pcsPerCarton = parseInt(document.getElementById('form-pcs-per').value) || 1;
    const cartonPriceField = document.getElementById('form-carton-price');
    const piecePriceField = document.getElementById('form-piece-price');

    if (source === 'carton') {
        const cartonPrice = parseFloat(cartonPriceField.value) || 0;
        piecePriceField.value = (cartonPrice / pcsPerCarton).toFixed(2);
    } else if (source === 'piece') {
        const piecePrice = parseFloat(piecePriceField.value) || 0;
        cartonPriceField.value = (piecePrice * pcsPerCarton).toFixed(2);
    }
}

function calculateTotalPieces() {
    const cartons = parseInt(document.getElementById('form-cartons').value) || 0;
    const perCarton = parseInt(document.getElementById('form-pcs-per').value) || 0;
    document.getElementById('form-total-pcs').value = cartons * perCarton;
}

function openAddProductForm(prefilledSku = '') {
    document.getElementById('product-form').reset();
    removeFormImage();
    document.getElementById('form-id').value = '';
    document.getElementById('form-sku').value = prefilledSku;
    document.getElementById('form-carton-price').value = '0';
    document.getElementById('form-piece-price').value = '0';
    document.getElementById('form-title').innerText = 'New Product Inventory';
    document.getElementById('products-list-view').classList.add('hidden');
    document.getElementById('products-form-view').classList.remove('hidden');
    calculateTotalPieces();
}

function closeProductForm() {
    document.getElementById('products-form-view').classList.add('hidden');
    document.getElementById('products-list-view').classList.remove('hidden');
}

// === FIREBASE DATABASE (CRUD) ACTIONS ===
async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('form-id').value;
    
    // UI লোডিং ফিডব্যাক
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const initialBtnText = submitBtn.innerText;
    submitBtn.innerText = "Processing, Please Wait...";
    submitBtn.disabled = true;

    try {
        let finalImageUrl = "";

        // ১. যদি নতুন কোনো ছবি সিলেক্ট করা থাকে তবে তা Firebase Storage এ আপলোড করা হবে
        if (selectedFileBlob) {
            const fileName = `products/${Date.now()}_${selectedFileBlob.name}`;
            const fileRef = ref(storage, fileName);
            const uploadSnapshot = await uploadBytes(fileRef, selectedFileBlob);
            finalImageUrl = await getDownloadURL(uploadSnapshot.ref);
        } else if (id) {
            // যদি এডিট মোড হয় এবং নতুন ছবি না দেওয়া হয়, তবে আগের ছবিটাই বহাল থাকবে
            const existingProduct = localProducts.find(item => item.id === id);
            if (existingProduct) finalImageUrl = existingProduct.image || "";
        }

        const payload = {
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: document.getElementById('form-category').value,
            cartons: parseInt(document.getElementById('form-cartons').value) || 0,
            piecesPerCarton: parseInt(document.getElementById('form-pcs-per').value) || 0,
            totalPieces: parseInt(document.getElementById('form-total-pcs').value) || 0,
            cartonPrice: parseFloat(document.getElementById('form-carton-price').value) || 0,
            piecePrice: parseFloat(document.getElementById('form-piece-price').value) || 0,
            expiryDate: document.getElementById('form-expiry').value,
            image: finalImageUrl
        };

        if (id) {
            // Firestore Update
            const docRef = doc(db, 'products', id);
            await updateDoc(docRef, payload);
        } else {
            // Firestore Create
            await addDoc(collection(db, 'products'), payload);
        }

        closeProductForm();
    } catch (error) {
        console.error("Error saving data to Firebase:", error);
        alert("ফায়ারবেজে ডেটা সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
        submitBtn.innerText = initialBtnText;
        submitBtn.disabled = false;
    }
}

function editProductTrigger(id) {
    const p = localProducts.find(item => item.id === id);
    if (!p) return;
    
    openAddProductForm();
    document.getElementById('form-title').innerText = 'Modify Registry';
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-sku').value = p.sku;
    document.getElementById('form-category').value = p.category;
    document.getElementById('form-cartons').value = p.cartons;
    document.getElementById('form-pcs-per').value = p.piecesPerCarton;
    document.getElementById('form-total-pcs').value = p.totalPieces;
    document.getElementById('form-carton-price').value = p.cartonPrice || 0;
    document.getElementById('form-piece-price').value = p.piecePrice || 0;
    document.getElementById('form-expiry').value = p.expiryDate;
    
    if (p.image) {
        document.getElementById('form-img-output').src = p.image;
        document.getElementById('image-preview-box').classList.remove('hidden');
        document.getElementById('image-input-label').classList.add('hidden');
    }
}

async function deleteProductTrigger(id) {
    const p = localProducts.find(item => item.id === id);
    if (!p) return;

    if(confirm('আপনি কি নিশ্চিতভাবে এই পণ্যটি ডিলিট করতে চান?')) {
        try {
            // ছবি যদি ফায়ারবেজ স্টোরেজে থাকে, তবে ডাটাবেজ ডকুমেন্ট ডিলিটের সাথে ছবিটাও ডিলিট করা হবে
            if (p.image && p.image.includes("firebasestorage.googleapis.com")) {
                const fileRef = ref(storage, p.image);
                await deleteObject(fileRef).catch(e => console.log("Storage image removal skipped or errored:", e));
            }
            await deleteDoc(doc(db, 'products', id));
        } catch (err) {
            console.error("Deletion error:", err);
            alert("পণ্যটি ডিলিট করা যায়নি।");
        }
    }
}

// === REALTIME FIREBASE SYNC ENGINE ===
function initFirebaseRealtimeSync() {
    // অন-স্ম্যাপশট মেথডটি ডাটাবেজে যেকোনো পরিবর্তনের সাথে সাথে নিজে থেকেই কল হবে (রিয়েল-টাইম)
    onSnapshot(collection(db, 'products'), (snapshot) => {
        localProducts = [];
        snapshot.forEach((doc) => {
            localProducts.push({ id: doc.id, ...doc.data() });
        });
        
        // মেট্রিক্স ও ওভারভিউ আপডেট
        updateMetrics();
        renderCategoryFilters();
        renderProducts();
    }, (error) => {
        console.error("Firebase Sync Connection Lost:", error);
    });
}

function updateMetrics() {
    document.getElementById('dash-total').innerText = localProducts.length;
    
    let expiredCount = 0;
    let totalPcsSum = 0;
    const today = new Date();

    localProducts.forEach(p => {
        totalPcsSum += p.totalPieces;
        if(p.expiryDate && new Date(p.expiryDate) < today) expiredCount++;
    });

    document.getElementById('dash-expired').innerText = expiredCount;
    document.getElementById('dash-pieces').innerText = totalPcsSum;
}

function renderCategoryFilters() {
    const cats = ['All', 'Grains', 'Dairy', 'Beverages', 'Snacks', 'Packaged', 'Fresh Produce'];
    const container = document.getElementById('category-filters');
    if (!container) return;
    
    let htmlContent = cats.map(c => `
        <button onclick="setCategoryFilter('${c}')" class="text-xs font-medium px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${currentCategory === c ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'}">${c}</button>
    `).join('');

    if (currentCategory === 'Expired') {
        htmlContent = `
            <button onclick="setCategoryFilter('Expired')" class="text-xs font-medium px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all bg-red-600 text-white border-red-600 shadow-sm">⚠️ Expired Items</button>
        ` + htmlContent;
    } else {
        htmlContent = `
            <button onclick="setCategoryFilter('Expired')" class="text-xs font-medium px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all bg-slate-100 dark:bg-slate-800 text-red-500 border-transparent">⚠️ Expired</button>
        ` + htmlContent;
    }

    container.innerHTML = htmlContent;
}

function renderProducts() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.toLowerCase() : "";
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    
    const today = new Date();

    const filtered = localProducts.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query) || p.sku.includes(query);
        
        let matchesCat = false;
        if (currentCategory === 'All') {
            matchesCat = true;
        } else if (currentCategory === 'Expired') {
            matchesCat = p.expiryDate && new Date(p.expiryDate) < today;
        } else {
            matchesCat = p.category === currentCategory;
        }

        return matchesQuery && matchesCat;
    });

    if(filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800">
                <i data-lucide="package-open" class="w-12 h-12 text-slate-400 mb-2"></i>
                <h3 class="font-bold text-lg">No Match Found</h3>
                <p class="text-xs text-slate-400 mt-1 max-w-xs">কোনো ইনভেন্টরি ডাটা ম্যাচ করেনি।</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const isExpired = p.expiryDate && new Date(p.expiryDate) < today;
        return `
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-between shadow-sm group hover:shadow-md transition-shadow">
                <div class="relative aspect-[16/10] bg-slate-100 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                    ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-xs text-slate-400">No Image</div>`}
                    ${isExpired ? `<span class="absolute top-2 right-2 bg-red-500 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider">Expired</span>` : ''}
                </div>
                <div class="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-2">
                            <h3 class="font-bold text-base leading-snug line-clamp-1">${p.name}</h3>
                            <span class="text-[9px] uppercase font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded shrink-0">${p.category}</span>
                        </div>
                        <p class="text-[11px] font-mono text-slate-400 mt-0.5">SKU: ${p.sku}</p>
                        <div class="grid grid-cols-2 gap-1.5 my-3 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl text-[11px]">
                            <div class="flex items-center gap-1 text-slate-400"><i data-lucide="layers" class="w-3 h-3 text-green-500"></i> Stock: <b class="text-slate-700 dark:text-slate-200">${p.totalPieces} pcs</b></div>
                            <div class="flex items-center gap-1 text-slate-400 truncate"><i data-lucide="calendar" class="w-3 h-3 text-amber-500"></i> Exp: <b class="text-slate-700 dark:text-slate-200">${p.expiryDate}</b></div>
                            <div class="flex items-center gap-1 text-slate-400 col-span-2 border-t border-slate-200/40 dark:border-slate-700/40 pt-1 mt-1">
                                <i data-lucide="banknote" class="w-3 h-3 text-emerald-500"></i> 
                                <span>Ctn: <b>SAR ${p.cartonPrice || 0}</b> | Pce: <b>SAR ${p.piecePrice || 0}</b></span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-2.5">
                        <button onclick="viewDetailsSheet('${p.id}')" class="flex-1 h-8 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600/80 rounded-lg text-xs font-medium flex items-center justify-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5"></i> View</button>
                        <button onclick="editProductTrigger('${p.id}')" class="w-8 h-8 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700"><i data-lucide="edit-2" class="w-3.5 h-3.5 text-slate-400"></i></button>
                        <button onclick="deleteProductTrigger('${p.id}')" class="w-8 h-8 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/20"><i data-lucide="trash-2" class="w-3.5 h-3.5 text-red-500"></i></button>
                    </div>
                </div>
            </div>`;
    }).join('');
    lucide.createIcons();
}

// === DETAILS DIALOG WINDOW ===
function viewDetailsSheet(id) {
    const p = localProducts.find(item => item.id === id);
    if (!p) return;
    const modal = document.getElementById('details-modal');
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="relative aspect-[16/9] bg-slate-100 dark:bg-slate-900">
                ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-slate-400">No Image</div>`}
                <button onclick="closeDetailsSheet()" class="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            <div class="p-5 space-y-4">
                <div>
                    <span class="text-[10px] font-bold tracking-widest uppercase bg-green-500/10 text-green-500 px-2.5 py-1 rounded-md">${p.category}</span>
                    <h2 class="text-xl font-bold mt-2">${p.name}</h2>
                </div>
                <div class="space-y-2.5 border-t border-slate-100 dark:border-slate-700 pt-4 text-sm">
                    <div class="flex items-center gap-3"><i data-lucide="barcode" class="w-4 h-4 text-slate-400"></i><span class="text-slate-400 w-24">Barcode/SKU</span><span class="font-mono font-medium">${p.sku}</span></div>
                    <div class="flex items-center gap-3"><i data-lucide="layers" class="w-4 h-4 text-slate-400"></i><span class="text-slate-400 w-24">Volume Stock</span><span class="font-medium">${p.cartons} Cartons × ${p.piecesPerCarton} (${p.totalPieces} Pcs)</span></div>
                    <div class="flex items-center gap-3"><i data-lucide="banknote" class="w-4 h-4 text-slate-400"></i><span class="text-slate-400 w-24">Price Rate</span><span class="font-medium text-emerald-600 dark:text-emerald-400">Ctn: SAR ${p.cartonPrice || 0} | Pce: SAR ${p.piecePrice || 0}</span></div>
                    <div class="flex items-center gap-3"><i data-lucide="calendar" class="w-4 h-4 text-slate-400"></i><span class="text-slate-400 w-24">Expiration</span><span class="font-medium text-amber-500">${p.expiryDate}</span></div>
                </div>
                <div class="pt-2"><button onclick="closeDetailsSheet()" class="w-full h-10 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-medium">Close Sheet</button></div>
            </div>
        </div>`;
    modal.classList.replace('hidden', 'flex');
    lucide.createIcons();
}

function closeDetailsSheet() {
    document.getElementById('details-modal').classList.replace('flex', 'hidden');
}

// === HARDWARE SCANNER CONTROLLER ENGINE ===
let lastScannedText = "";
let lastScanTime = 0;

function startScannerEngine() {
    if (scannerInstance) return;
    
    lastScannedText = "";
    document.getElementById('scanner-main-view').classList.remove('hidden');
    document.getElementById('scanner-match-view').classList.add('hidden');

    scannerInstance = new Html5Qrcode("scanner-container", {
        formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A
        ]
    });

    const config = {
        fps: 24,
        qrbox: (w, h) => {
            const edge = Math.min(w, h);
            return { width: Math.floor(edge * 0.8), height: Math.floor(edge * 0.45) };
        }
    };

    scannerInstance.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
            const now = Date.now();
            if (decodedText === lastScannedText && (now - lastScanTime) < 4000) return; 
            
            lastScannedText = decodedText;
            lastScanTime = now;
            playBeep();
            handleScannedBarcode(decodedText);
        },
        () => { /* Frame alignment errors filter */ }
    ).catch(err => {
        alert("ক্যামেরা এক্সেস করা যায়নি। পারমিশন চেক করুন।");
        console.error(err);
    });
}

function stopScannerEngine() {
    if (!scannerInstance) return Promise.resolve();
    return scannerInstance.stop().then(() => {
        scannerInstance = null;
        isTorchOn = false;
    }).catch(console.error);
}

async function toggleTorch() {
    if (!scannerInstance || !scannerInstance.isScanning) return;
    try {
        const capabilities = scannerInstance.getCameraCapabilities().getCapabilities();
        if (capabilities.torch) {
            isTorchOn = !isTorchOn;
            await scannerInstance.applyVideoConstraints({ advanced: [{ torch: isTorchOn }] });
        } else {
            alert("ডিভাইস ফ্ল্যাশলাইট সাপোর্ট করে না।");
        }
    } catch (e) {}
}

function handleScannedBarcode(code) {
    stopScannerEngine().then(() => {
        const match = localProducts.find(p => p.sku === code);
        if (match) {
            document.getElementById('scanner-main-view').classList.add('hidden');
            const container = document.getElementById('matched-card-container');
            container.innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md flex items-center gap-4 w-full">
                    ${match.image ? `<img src="${match.image}" class="w-20 h-20 rounded-xl object-cover">` : `<div class="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">No Img</div>`}
                    <div>
                        <h4 class="font-bold text-lg">${match.name}</h4>
                        <p class="text-xs font-mono text-slate-400">SKU: ${match.sku}</p>
                        <p class="text-xs text-slate-500 mt-1">Stock: <b>${match.totalPieces} Pcs</b> | Rate: <b class="text-emerald-500">SAR ${match.piecePrice || 0}/pc</b></p>
                        <p class="text-[11px] text-amber-500 font-medium">Exp: ${match.expiryDate}</p>
                    </div>
                </div>`;
            document.getElementById('scanner-match-view').classList.remove('hidden');
            lucide.createIcons();
        } else {
            switchPage('products');
            openAddProductForm(code);
        }
    });
}

// === DOM BINDINGS & LIFECYCLE INITIALIZER ===
document.addEventListener('DOMContentLoaded', () => {
    // থিম রিকভারি লজিক
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    
    // রিয়েল-টাইম ফায়ারবেস লিসেনার ট্রিপ অন
    initFirebaseRealtimeSync();
    switchPage('dashboard');

    // ফর্ম ইভেন্ট শ্রোতা বাইন্ডিং
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('form-image-input').addEventListener('change', handleFormImage);
    document.getElementById('remove-img-btn').addEventListener('click', removeFormImage);
    document.getElementById('search-input').addEventListener('input', renderProducts);
    
    // প্রাইস ও স্টক ক্যালকুলেটর অটোমেশন
    document.getElementById('form-cartons').addEventListener('input', () => { calculateTotalPieces(); calculatePrices('carton'); });
    document.getElementById('form-pcs-per').addEventListener('input', () => { calculateTotalPieces(); calculatePrices('piece'); });
    document.getElementById('form-carton-price').addEventListener('input', () => calculatePrices('carton'));
    document.getElementById('form-piece-price').addEventListener('input', () => calculatePrices('piece'));

    // স্ক্যানার বাটন অ্যাকশন ইভেন্টস
    document.getElementById('torch-btn').addEventListener('click', toggleTorch);
    document.getElementById('restart-scan-btn').addEventListener('click', startScannerEngine);
});
