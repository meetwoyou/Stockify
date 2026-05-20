// Firebase configuration remain the same
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

let localDB;
let localProducts = [];
let scanner = null;
let currentFilter = 'all';

// --- Database & Sync ---
const initLocalDB = () => {
    return new Promise((resolve) => {
        const request = indexedDB.open('StockifyFinal_v1', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
        };
        request.onsuccess = (e) => { localDB = e.target.result; resolve(); };
    });
};

window.syncData = async () => {
    const tx = localDB.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    store.getAll().onsuccess = async (e) => {
        localProducts = e.target.result;
        renderDashboard();
        renderProducts();
        try {
            const snapshot = await firestore.collection('stockify_products').get();
            const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const updateTx = localDB.transaction('products', 'readwrite');
            cloudData.forEach(p => updateTx.objectStore('products').put(p));
            localProducts = cloudData;
            renderDashboard();
            renderProducts();
        } catch (err) { console.log("Cloud offline"); }
    };
};

// --- Product Rendering & Filtering ---
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
        <div onclick="viewProductDetails('${p.id}')" class="bg-surface/40 p-4 rounded-[2rem] border border-slate-800/50 relative active:scale-95 transition-all">
            <div class="h-40 rounded-2xl overflow-hidden mb-4 bg-black">
                <img src="${p.image}" class="w-full h-full object-cover">
                ${isExp ? '<span class="absolute top-6 right-6 bg-red-600 text-[8px] text-white px-2 py-1 rounded-full font-black uppercase">Expired</span>' : ''}
            </div>
            <div class="space-y-1">
                <h4 class="font-black text-sm uppercase text-white truncate">${p.name}</h4>
                <p class="text-[10px] font-bold text-slate-500">Barcode: ${p.sku}</p>
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/50">
                    <span class="text-xs font-black text-primary">${p.totalPieces} Pcs</span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase bg-slate-800 px-2 py-1 rounded">${p.category}</span>
                </div>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
};

window.setFilter = (filter) => {
    currentFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(filter.toLowerCase()) || (filter === 'all' && btn.innerText === 'All'));
    });
    renderProducts();
};

// --- Product Sheet Modal ---
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
};

// --- Scanner Logic with Auto-Add ---
window.startScanner = () => {
    scanner = new Html5Qrcode("scanner-container");
    scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (decoded) => {
        const match = localProducts.find(p => p.sku === decoded);
        if (match) {
            scanner.stop();
            switchPage('products');
            viewProductDetails(match.id);
        } else {
            scanner.stop();
            if(confirm("New Barcode: " + decoded + "\nAdd this to inventory?")) {
                openAddProductForm(decoded);
            } else { startScanner(); }
        }
    });
};

// Helper and Navigation functions
window.switchPage = (pId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pId}`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('text-primary', b.dataset.page === pId);
        b.classList.toggle('text-slate-500', b.dataset.page !== pId);
    });
    if(pId === 'scanner') startScanner();
    else if(scanner) { scanner.stop(); scanner = null; }
    lucide.createIcons();
};

window.openAddProductForm = (sku = '') => {
    document.getElementById('products-form-view').classList.remove('hidden');
    document.getElementById('form-sku').value = sku;
};

window.closeProductForm = () => document.getElementById('products-form-view').classList.add('hidden');

// Start
document.addEventListener('DOMContentLoaded', async () => {
    await initLocalDB();
    syncData();
});
