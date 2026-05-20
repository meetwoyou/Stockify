/**
 * STOCKIFY PRO - ADVANCED HYBRID ENGINE
 * Developed for: Sabbir Hosen Akash
 */

// === 1. CONFIGURATION ===
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
let compressedBase64 = null;

// === 2. DATABASE & SYNC ===
const initLocalDB = () => {
    return new Promise((resolve) => {
        const request = indexedDB.open('StockifyDB_Final', 1);
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
        } catch (err) { console.log("Cloud sync offline"); }
    };
};

// === 3. IMAGE COMPRESSION (Target 200-300kb) ===
window.compressImage = (file) => {
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
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 Quality for 200-300kb
            };
        };
    });
};

// === 4. GLOBAL NAVIGATION & UI ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`page-${pageId}`);
    if(target) target.classList.remove('hidden');

    if (pageId === 'scanner') startScanner();
    else if (scanner) { scanner.stop(); scanner = null; }
    
    lucide.createIcons();
};

window.handleFormImage = async (input) => {
    if (input.files && input.files[0]) {
        compressedBase64 = await compressImage(input.files[0]);
        const output = document.getElementById('form-img-output');
        if(output) {
            output.src = compressedBase64;
            output.classList.remove('hidden');
        }
        const placeholder = document.getElementById('image-placeholder');
        if(placeholder) placeholder.classList.add('hidden');
    }
};

window.openAddProductForm = (sku = '') => {
    const list = document.getElementById('products-list-view');
    const form = document.getElementById('products-form-view');
    if(list) list.classList.add('hidden');
    if(form) form.classList.remove('hidden');
    
    document.getElementById('product-form').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-sku').value = sku;
    
    const output = document.getElementById('form-img-output');
    if(output) { output.src = ''; output.classList.add('hidden'); }
    const placeholder = document.getElementById('image-placeholder');
    if(placeholder) placeholder.classList.remove('hidden');
    compressedBase64 = null;
};

window.closeProductForm = () => {
    document.getElementById('products-form-view').classList.add('hidden');
    document.getElementById('products-list-view').classList.remove('hidden');
};

// === 5. CALCULATION & CRUD ===
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
    const btn = document.getElementById('save-btn');
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        let finalUrl = document.getElementById('form-img-output').src;

        if (compressedBase64) {
            const fd = new FormData();
            fd.append('file', compressedBase64);
            fd.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
            const data = await res.json();
            finalUrl = data.secure_url;
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
            image: finalUrl,
            updatedAt: Date.now()
        };

        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').put(product);
        await firestore.collection('stockify_products').doc(id).set(product);

        closeProductForm();
        syncData();
    } catch (err) { alert(err.message); }
    finally { btn.innerText = "Save & Cloud Backup"; btn.disabled = false; }
};

// === 6. RENDER ENGINE ===
window.renderProducts = (filter = 'all') => {
    const grid = document.getElementById('product-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    const today = new Date();

    let filtered = localProducts.filter(p => p.name.toLowerCase().includes(search) || p.sku.includes(search));
    if (filter === 'expired') filtered = filtered.filter(p => new Date(p.expiryDate) < today);

    grid.innerHTML = filtered.map(p => {
        const isExp = new Date(p.expiryDate) < today;
        return `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] border-2 ${isExp ? 'border-red-500 bg-red-50/10' : 'border-transparent'} shadow-sm relative">
            <div class="h-32 rounded-3xl overflow-hidden mb-3">
                <img src="${p.image}" class="w-full h-full object-cover">
                ${isExp ? '<div class="absolute top-6 right-6 bg-red-600 text-[8px] text-white px-2 py-1 rounded-full font-black">EXPIRED</div>' : ''}
            </div>
            <h4 class="font-black text-sm uppercase truncate">${p.name}</h4>
            <div class="flex justify-between mt-1"><span class="text-[9px] font-bold text-slate-400">Barcode: ${p.sku}</span> <span class="text-[10px] font-black text-green-600">${p.totalPieces} Pcs</span></div>
            <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div class="text-[9px] font-bold">Ctn: ${p.cartonPrice}</div>
                <div class="text-[9px] font-bold">Pcs: ${p.piecePrice}</div>
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

// === 7. SMART SCANNER ===
window.startScanner = () => {
    scanner = new Html5Qrcode("scanner-container");
    scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (decoded) => {
        const match = localProducts.find(p => p.sku === decoded);
        if (match) {
            scanner.stop();
            showProductModal(match);
        } else {
            scanner.stop();
            if(confirm("Barcode: " + decoded + "\nProduct not found. Add now?")) {
                openAddProductForm(decoded);
            } else { startScanner(); }
        }
    });
};

function showProductModal(p) {
    const modal = document.getElementById('details-modal');
    if(!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 p-8 rounded-[3.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95">
        <img src="${p.image}" class="w-full h-40 object-cover rounded-3xl mb-6">
        <h2 class="text-xl font-black uppercase">${p.name}</h2>
        <p class="text-primary font-black text-lg mb-4">Price: ${p.piecePrice} SAR</p>
        <div class="grid grid-cols-2 gap-4 text-[10px] font-black uppercase text-slate-400 mb-6">
            <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl">Stock: <span class="text-slate-900 dark:text-white">${p.totalPieces}</span></div>
            <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl">Exp: <span class="${new Date(p.expiryDate) < new Date() ? 'text-red-500' : 'text-slate-900 dark:text-white'}">${p.expiryDate}</span></div>
        </div>
        <div class="flex gap-2">
            <button onclick="document.getElementById('details-modal').classList.add('hidden')" class="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-xs">CLOSE</button>
            <button onclick="document.getElementById('details-modal').classList.add('hidden'); editProductTrigger('${p.id}')" class="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs">EDIT</button>
        </div>
    </div>`;
}

// === 8. EDIT & DELETE ===
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
    const output = document.getElementById('form-img-output');
    output.src = p.image;
    output.classList.remove('hidden');
    document.getElementById('image-placeholder').classList.add('hidden');
};

window.deleteProductTrigger = async (id) => {
    if (confirm("Delete permanently?")) {
        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').delete(id);
        await firestore.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

window.toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
};

// === 9. INIT ===
document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    await initLocalDB();
    syncData();
    lucide.createIcons();
});
