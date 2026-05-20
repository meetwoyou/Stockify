// === CONFIGURATION (Firebase & Cloudinary) ===
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

// Cloudinary Settings
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

// === DATABASE LAYER (IndexedDB for Local Storage) ===
const DB_NAME = 'StockifyDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';
let localDB;

async function initLocalDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { localDB = e.target.result; resolve(); };
        request.onerror = (e) => reject(e.target.error);
    });
}

// === HYBRID DATA SYNC ENGINE ===
let localProducts = [];
let currentCategory = 'All';
let scannerInstance = null;
let selectedFile = null;

async function syncData() {
    // 1. Load from Local Database (Instant UI)
    const tx = localDB.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = async () => {
        localProducts = request.result;
        renderDashboard();
        renderProducts();

        // 2. Load from Cloud Background (Update Local)
        try {
            const snapshot = await firestore.collection('stockify_products').get();
            const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Local Sync with Cloud
            const updateTx = localDB.transaction(STORE_NAME, 'readwrite');
            const updateStore = updateTx.objectStore(STORE_NAME);
            cloudData.forEach(p => updateStore.put(p));
            
            localProducts = cloudData;
            renderDashboard();
            renderProducts();
        } catch (e) { console.warn("Cloud offline. Using local storage."); }
    };
}

// === FORM & IMAGE LOGIC ===
window.handleFormImage = (input) => {
    selectedFile = input.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('form-img-output').src = e.target.result;
            document.getElementById('image-preview-box').classList.remove('hidden');
            document.getElementById('image-input-label').classList.add('hidden');
        };
        reader.readAsDataURL(selectedFile);
    }
};

window.removeFormImage = () => {
    selectedFile = null;
    document.getElementById('form-img-output').src = '';
    document.getElementById('image-preview-box').classList.add('hidden');
    document.getElementById('image-input-label').classList.remove('hidden');
};

window.calculateTotalPieces = () => {
    const cartons = parseInt(document.getElementById('form-cartons').value) || 0;
    const perCtn = parseInt(document.getElementById('form-pcs-per').value) || 0;
    document.getElementById('form-total-pcs').value = cartons * perCtn;
};

window.calculatePrices = (source) => {
    const pcsPerCtn = parseInt(document.getElementById('form-pcs-per').value) || 1;
    const ctnPriceField = document.getElementById('form-carton-price');
    const pcsPriceField = document.getElementById('form-piece-price');

    if (source === 'carton') {
        const val = parseFloat(ctnPriceField.value) || 0;
        pcsPriceField.value = (val / pcsPerCtn).toFixed(2);
    } else {
        const val = parseFloat(pcsPriceField.value) || 0;
        ctnPriceField.value = (val * pcsPerCtn).toFixed(2);
    }
};

// === CRUD OPERATIONS ===
window.saveProduct = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        let imageUrl = document.getElementById('form-img-output').src;

        // Upload to Cloudinary if new file selected
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();
            imageUrl = data.secure_url.replace('/upload/', '/upload/w_600,c_scale,q_auto/');
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
            image: imageUrl,
            updatedAt: Date.now()
        };

        // Save Local
        const tx = localDB.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(product);

        // Save Cloud
        await firestore.collection('stockify_products').doc(id).set(product);

        closeProductForm();
        syncData();
    } catch (err) {
        alert("Sync Error: " + err.message);
    } finally {
        btn.innerText = "Save Product"; btn.disabled = false;
    }
};

// === UI RENDERING ===
function renderDashboard() {
    document.getElementById('dash-total').innerText = localProducts.length;
    let totalPcs = 0, expired = 0;
    const today = new Date();
    localProducts.forEach(p => {
        totalPcs += parseInt(p.totalPieces || 0);
        if (p.expiryDate && new Date(p.expiryDate) < today) expired++;
    });
    document.getElementById('dash-pieces').innerText = totalPcs;
    document.getElementById('dash-expired').innerText = expired;
}

window.renderProducts = () => {
    const grid = document.getElementById('product-grid');
    const query = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = localProducts.filter(p => 
        p.name.toLowerCase().includes(query) || p.sku.includes(query)
    );

    grid.innerHTML = filtered.map(p => `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col p-3 shadow-sm group">
            <div class="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 mb-3">
                <img src="${p.image || ''}" class="w-full h-full object-cover">
            </div>
            <h3 class="font-bold text-sm line-clamp-1">${p.name}</h3>
            <p class="text-[10px] font-mono text-slate-400">SKU: ${p.sku}</p>
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <span class="text-xs font-black text-green-600">${p.totalPieces} PCS</span>
                <div class="flex gap-2">
                    <button onclick="editProductTrigger('${p.id}')" class="p-2 glass rounded-lg"><i data-lucide="edit-2" class="w-3 h-3"></i></button>
                    <button onclick="deleteProductTrigger('${p.id}')" class="p-2 glass rounded-lg text-red-500"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
};

// === NAVIGATION & MODALS ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    
    // UI Update logic for nav buttons
    document.querySelectorAll('.mobile-nav-btn, .nav-btn').forEach(btn => {
        const isTarget = btn.getAttribute('data-page') === pageId;
        btn.classList.toggle('text-green-600', isTarget);
        btn.classList.toggle('text-slate-400', !isTarget);
    });

    if (pageId === 'scanner') startScanner();
    else if (scannerInstance) { scannerInstance.stop(); scannerInstance = null; }
    
    syncData();
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

window.editProductTrigger = (id) => {
    const p = localProducts.find(x => x.id === id);
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
    if (p.image) {
        document.getElementById('form-img-output').src = p.image;
        document.getElementById('image-preview-box').classList.remove('hidden');
        document.getElementById('image-input-label').classList.add('hidden');
    }
};

window.deleteProductTrigger = async (id) => {
    if (confirm("Delete this product?")) {
        const tx = localDB.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        await firestore.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

// === SCANNER ENGINE ===
async function startScanner() {
    scannerInstance = new Html5Qrcode("scanner-container");
    const config = { fps: 10, qrbox: { width: 250, height: 150 } };
    
    scannerInstance.start({ facingMode: "environment" }, config, (decodedText) => {
        const match = localProducts.find(p => p.sku === decodedText);
        if (match) {
            alert("Found: " + match.name);
            editProductTrigger(match.id);
        } else {
            openAddProductForm(decodedText);
        }
        switchPage('products');
    });
}

// === THEME ===
window.toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

// === INIT ===
document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    await initLocalDB();
    syncData();
    lucide.createIcons();
});
