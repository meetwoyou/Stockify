// === INDEXEDDB DATABASE LAYER ===
const DB_NAME = 'StockifyDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

let db;
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(db); };
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getAllProducts() {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
    });
}

function addProduct(product) {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(product);
        request.onsuccess = () => resolve(request.result);
    });
}

function updateProduct(product) {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(product);
        request.onsuccess = () => resolve();
    });
}

function deleteProduct(id) {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

// === STATE MANAGEMENT ===
let localProducts = [];
let currentCategory = 'All'; // 'All', 'Expired', বা নির্দিষ্ট ক্যাটাগরি ধারণ করবে
let scannerInstance = null;
let isTorchOn = false;

// === ROUTING SYSTEM ===
function switchPage(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');

    // Update active states for desktop sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.getAttribute('data-page') === pageId) {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-green-600 text-white shadow-md shadow-green-600/10";
        } else {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50";
        }
    });

    // Update active states for mobile menu navigation
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        if(btn.getAttribute('data-page') === pageId) {
            btn.classList.replace('text-slate-400', 'text-green-600');
        } else {
            btn.classList.replace('text-green-600', 'text-slate-400');
        }
    });

    // Scanner Initialization Control
    if (pageId === 'scanner') {
        startScannerEngine();
    } else {
        stopScannerEngine();
    }

    if (pageId === 'dashboard' || pageId === 'products') {
        syncData();
    }
}

// === AUDIO FEEDBACK ===
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

// === THEME SYSTEM ===
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// === SMART FORMS & CALCULATORS ===
let base64ImageStr = "";
function handleFormImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            base64ImageStr = reader.result;
            document.getElementById('form-img-output').src = base64ImageStr;
            document.getElementById('image-preview-box').classList.remove('hidden');
            document.getElementById('image-input-label').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

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

function removeFormImage() {
    base64ImageStr = "";
    document.getElementById('image-preview-box').classList.add('hidden');
    document.getElementById('image-input-label').classList.remove('hidden');
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

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('form-id').value;
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
        image: base64ImageStr
    };

    if (id) {
        payload.id = parseInt(id);
        await updateProduct(payload);
    } else {
        await addProduct(payload);
    }
    closeProductForm();
    syncData();
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
        base64ImageStr = p.image;
        document.getElementById('form-img-output').src = p.image;
        document.getElementById('image-preview-box').classList.remove('hidden');
        document.getElementById('image-input-label').classList.add('hidden');
    }
}

async function deleteProductTrigger(id) {
    if(confirm('আপনি কি নিশ্চিতভাবে এই পণ্যটি ডিলিট করতে চান?')) {
        await deleteProduct(id);
        syncData();
    }
}

// === ENGINE DATA SYNCHRONIZATION ===
async function syncData() {
    localProducts = await getAllProducts();
    
    // Calculate Dashboard metrics
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

    renderCategoryFilters();
    renderProducts();
}

// ড্যাশবোর্ডের Expired কার্ডে ক্লিক করার জন্য বিশেষ ফাংশন
function showExpiredProductsTrigger() {
    currentCategory = 'Expired'; // ফিল্টার স্টেট সেট করা হলো
    switchPage('products');      // প্রোডাক্ট পেজে রাউট করা হলো
}

function renderCategoryFilters() {
    const cats = ['All', 'Grains', 'Dairy', 'Beverages', 'Snacks', 'Packaged', 'Fresh Produce'];
    const container = document.getElementById('category-filters');
    
    // যদি ড্যাশবোর্ড থেকে Expired ট্রিপ করা হয়, তবে ক্যাটাগরি চিপস তৈরিতে এক্সপায়ার্ড বাটনটি একটিভ হাইলাইট পাবে
    let htmlContent = cats.map(c => `
        <button onclick="setCategoryFilter('${c}')" class="text-xs font-medium px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${currentCategory === c ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'}">${c}</button>
    `).join('');

    // যদি ডেডিকেটেড ফিল্টার 'Expired' চালু থাকে, তবে তার চিপস ফিল্টারে যুক্ত হবে
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

function setCategoryFilter(c) {
    currentCategory = c;
    renderCategoryFilters();
    renderProducts();
}

function renderProducts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const grid = document.getElementById('product-grid');
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
                        <button onclick="viewDetailsSheet(${p.id})" class="flex-1 h-8 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600/80 rounded-lg text-xs font-medium flex items-center justify-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5"></i> View</button>
                        <button onclick="editProductTrigger(${p.id})" class="w-8 h-8 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700"><i data-lucide="edit-2" class="w-3.5 h-3.5 text-slate-400"></i></button>
                        <button onclick="deleteProductTrigger(${p.id})" class="w-8 h-8 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/20"><i data-lucide="trash-2" class="w-3.5 h-3.5 text-red-500"></i></button>
                    </div>
                </div>
            </div>`;
    }).join('');
    lucide.createIcons();
}

// === MODAL SHEET VIEW ===
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

// === CAMERA BARCODE SCANNING ENGINE ===
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
            if (decodedText === lastScannedText && (now - lastScanTime) < 4000) {
                return; 
            }
            
            lastScannedText = decodedText;
            lastScanTime = now;
            playBeep();
            handleScannedBarcode(decodedText);
        },
        () => { /* সাইড ফ্রেম ফিল্টারিং এরর */ }
    ).catch(err => {
        alert("ক্যামেরা এক্সেস করা যায়নি। দয়া করে ব্রাউজারে ক্যামেরা পারমিশন চেক করুন।");
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
            alert("আপনার ডিভাইসের ব্যাক ক্যামেরা ফ্ল্যাশলাইট সাপোর্ট করে না।");
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
                <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md flex items-center gap-4">
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

function restartScanner() {
    startScannerEngine();
}

// === LIFECYCLE INITIALIZER ===
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    
    initDB().then(() => {
        syncData();
        switchPage('dashboard');
    });
});
