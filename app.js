/**
 * STOCKIFY PRO - ULTIMATE HYBRID ENGINE
 * Developed for: Sabbir Hosen Akash
 */

// === 1. CONFIGURATION (FIREBASE & CLOUDINARY) ===
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

// Initialize Firebase with protection
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

// Cloudinary Configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

// Global State
let localDB;
let localProducts = [];
let scannerInstance = null;
let currentFilter = 'all';

// === 2. HYBRID STORAGE ENGINE (IndexedDB + Firebase) ===
const initLocalDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('Stockify_Akash_v3', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { localDB = e.target.result; resolve(); };
        request.onerror = (e) => reject(e.target.error);
    });
};

// Advanced Hybrid Sync: Local First -> Cloud Backup
window.syncData = async () => {
    try {
        // 1. Get Local Data first for instant UI
        const tx = localDB.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const request = store.getAll();

        request.onsuccess = async () => {
            localProducts = request.result;
            renderDashboard();
            renderProducts();

            // 2. Fetch from Cloud Background
            try {
                const snapshot = await firestore.collection('stockify_products').get();
                const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Update local with cloud data (Master Sync)
                const updateTx = localDB.transaction('products', 'readwrite');
                const updateStore = updateTx.objectStore('products');
                
                // Optimized merge
                cloudData.forEach(p => updateStore.put(p));
                
                // Final render
                localProducts = cloudData;
                renderDashboard();
                renderProducts();
            } catch (err) { console.warn("Offline Mode: Cloud backup not accessible."); }
        };
    } catch (e) { console.error("Database Error:", e); }
};

// === 3. SMART FORMS & UI LOGIC ===
window.openAddProductForm = (sku = '') => {
    document.getElementById('products-form-view').classList.remove('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-sku').value = sku;
    
    // Clear Image Previews
    document.getElementById('form-img-output').src = '';
    document.getElementById('form-img-output').classList.add('hidden');
    document.getElementById('image-placeholder').classList.remove('hidden');
};

window.closeProductForm = () => {
    document.getElementById('products-form-view').classList.add('hidden');
};

// Image Upload Handler
window.handleFormImage = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('form-img-output').src = e.target.result;
            document.getElementById('form-img-output').classList.remove('hidden');
            document.getElementById('image-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// Calculations
window.calculateTotalPieces = () => {
    const cartons = parseInt(document.getElementById('form-cartons').value) || 0;
    const perCtn = parseInt(document.getElementById('form-pcs-per').value) || 1;
    document.getElementById('form-total-pcs').value = cartons * perCtn;
};

window.calculatePrices = (source) => {
    const pcsPerCtn = parseInt(document.getElementById('form-pcs-per').value) || 1;
    const ctnPriceField = document.getElementById('form-carton-price');
    const pcsPriceField = document.getElementById('form-piece-price');

    if (source === 'carton') {
        pcsPriceField.value = (parseFloat(ctnPriceField.value || 0) / pcsPerCtn).toFixed(2);
    } else {
        ctnPriceField.value = (parseFloat(pcsPriceField.value || 0) * pcsPerCtn).toFixed(2);
    }
};

// === 4. SAVING & SYNCING (indexedDB + Cloudinary + Firebase) ===
window.saveProduct = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        let finalImageUrl = document.getElementById('form-img-output').src;
        const fileInput = document.querySelector('input[type="file"]');

        // Cloudinary Upload if new image selected
        if (fileInput.files && fileInput.files[0]) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            
            const cloudinaryRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await cloudinaryRes.json();
            finalImageUrl = data.secure_url;
        }

        const id = document.getElementById('form-id').value || Date.now().toString();
        
        const payload = {
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

        // SAVE 1: IndexedDB (Instant Local)
        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').put(payload);

        // SAVE 2: Firebase (Async Backup)
        await firestore.collection('stockify_products').doc(id).set(payload);

        closeProductForm();
        syncData(); // Final sync
    } catch (err) {
        alert("Sync Failed: " + err.message);
    } finally {
        btn.innerText = "Save & Sync"; btn.disabled = false;
    }
};

// === 5. RENDERING THE GRID (WITH CARTON PRICE) ===
window.renderProducts = () => {
    const grid = document.getElementById('product-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    const today = new Date();

    let filtered = localProducts.filter(p => p.name.toLowerCase().includes(search) || p.sku.includes(search));
    
    if (currentFilter === 'expired') {
        filtered = filtered.filter(p => new Date(p.expiryDate) < today);
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    grid.innerHTML = filtered.map(p => {
        const isExp = new Date(p.expiryDate) < today;
        return `
        <div onclick="viewProductDetails('${p.id}')" class="bg-surface p-4 rounded-[2.5rem] border ${isExp ? 'border-red-500 bg-red-500/5 shadow-red-500/10' : 'border-slate-800'} relative active:scale-95 transition-all shadow-sm">
            <div class="h-40 rounded-3xl overflow-hidden mb-4 bg-black">
                <img src="${p.image}" class="w-full h-full object-cover">
                ${isExp ? '<div class="absolute top-6 right-6 bg-red-600 text-[8px] text-white px-2 py-1 rounded-full font-black uppercase">EXPIRED</div>' : ''}
            </div>
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h4 class="font-black text-sm uppercase text-white truncate">${p.name}</h4>
                    <p class="text-[9px] font-bold text-slate-500 mt-0.5">Barcode: ${p.sku}</p>
                </div>
                <span class="bg-slate-800 text-[9px] px-2 py-1 rounded-md font-bold text-slate-400 uppercase">${p.category}</span>
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t border-slate-800 space-x-4">
                <span class="text-sm font-black text-primary">${p.totalPieces} Pcs</span>
                <div class="flex gap-x-4 text-[11px] font-black text-white/90">
                    <div class="text-center"><p class="text-[8px] text-slate-500">CTN</p>${p.cartonPrice}</div>
                    <div class="text-center border-l border-slate-700 pl-4"><p class="text-[8px] text-slate-500">PCS</p>${p.piecePrice}</div>
                </div>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
};

window.viewProductDetails = (id) => {
    const p = localProducts.find(item => item.id === id);
    if (!p) return;

    document.getElementById('detail-img').src = p.image;
    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('detail-category').innerText = p.category;
    document.getElementById('detail-sku').innerText = p.sku;
    document.getElementById('detail-stock').innerText = `${p.cartons} Cartons × ${p.pcsPerCarton} (${p.totalPieces} Pcs)`;
    document.getElementById('detail-ctn-price').innerText = p.cartonPrice;
    document.getElementById('detail-pce-price').innerText = p.piecePrice;
    document.getElementById('detail-expiry').innerText = p.expiryDate;

    document.getElementById('details-modal').classList.remove('hidden');
    document.getElementById('details-modal').classList.add('flex');
    lucide.createIcons();
};

window.deleteProduct = async (id) => {
    if (confirm("Delete this product permanently?")) {
        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').delete(id);
        await firestore.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

// === 6. NAVIGATION & SETTINGS ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isTarget = btn.getAttribute('data-page') === pageId;
        if (isTarget) btn.classList.add('text-primary'); else btn.classList.remove('text-primary');
    });

    if (pageId === 'scanner') startScanner();
    else if (scannerInstance) { scannerInstance.stop(); scannerInstance = null; }
    
    lucide.createIcons();
};

window.setFilter = (filter) => {
    currentFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(btn => {
        const isTarget = btn.innerText.toLowerCase().includes(filter.toLowerCase()) || (filter === 'all' && btn.innerText === 'All');
        if(isTarget) btn.classList.add('active'); else btn.classList.remove('active');
    });
    renderProducts();
};

// === 7. SMART SCANNER (Auto-Add Feature) ===
window.startScanner = () => {
    scannerInstance = new Html5Qrcode("scanner-container");
    const config = { fps: 15, qrbox: 250 };
    scannerInstance.start({ facingMode: "environment" }, config, (decoded) => {
        const match = localProducts.find(p => p.sku === decoded);
        if (match) {
            scannerInstance.stop();
            switchPage('products');
            viewProductDetails(match.id);
        } else {
            scannerInstance.stop();
            if(confirm("New Product: " + decoded + "\nProduct not found. Add now?")) {
                openAddProductForm(decoded);
            } else { startScanner(); }
        }
    });
};

window.renderDashboard = () => {
    const today = new Date();
    let expCount = 0;
    localProducts.forEach(p => { if (new Date(p.expiryDate) < today) expCount++; });
    document.getElementById('dash-total').innerText = localProducts.length;
    document.getElementById('dash-expired').innerText = expCount;
};

// === INIT ===
document.addEventListener('DOMContentLoaded', async () => {
    await initLocalDB();
    syncData();
    lucide.createIcons();
});
