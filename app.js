// === CONFIGURATION ===
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

// === DATABASE SETUP ===
let localDB;
let localProducts = [];
const initLocalDB = () => {
    return new Promise((resolve) => {
        const request = indexedDB.open('StockifyAdvanced', 2);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
        };
        request.onsuccess = (e) => { localDB = e.target.result; resolve(); };
    });
};

// === IMAGE COMPRESSION (200-300KB Target) ===
const compressImage = (file) => {
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
                // Quality 0.7 maintains 200-300kb size
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

// === CORE ENGINE ===
async function syncData() {
    const tx = localDB.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    store.getAll().onsuccess = (e) => {
        localProducts = e.target.result;
        renderDashboard();
        renderProducts();
    };

    try {
        const snapshot = await firestore.collection('stockify_products').get();
        const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const updateTx = localDB.transaction('products', 'readwrite');
        cloudData.forEach(p => updateTx.objectStore('products').put(p));
        localProducts = cloudData;
        renderDashboard();
        renderProducts();
    } catch (err) { console.log("Offline Mode"); }
}

// === RENDER LOGIC ===
function renderProducts(filterType = 'all') {
    const grid = document.getElementById('product-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    const today = new Date();

    let filtered = localProducts.filter(p => p.name.toLowerCase().includes(search) || p.sku.includes(search));

    if (filterType === 'expired') {
        filtered = filtered.filter(p => new Date(p.expiryDate) < today);
    }

    grid.innerHTML = filtered.map(p => {
        const isExpired = new Date(p.expiryDate) < today;
        return `
        <div class="bg-white dark:bg-slate-800 rounded-[2rem] p-4 border-2 ${isExpired ? 'border-red-500/50 bg-red-50/10' : 'border-transparent'} shadow-sm">
            <div class="relative h-32 rounded-2xl overflow-hidden mb-3">
                <img src="${p.image}" class="w-full h-full object-cover">
                ${isExpired ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full">EXPIRED</span>' : ''}
            </div>
            <h4 class="font-black text-sm uppercase">${p.name}</h4>
            <div class="flex justify-between items-center mt-1">
                <span class="text-[10px] font-bold text-slate-400">SKU: ${p.sku}</span>
                <span class="text-xs font-black text-green-600">${p.totalPieces} PCS</span>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div class="text-[9px] font-bold">Ctn: <span class="text-primary">${p.cartonPrice} SAR</span></div>
                <div class="text-[9px] font-bold">Pcs: <span class="text-primary">${p.piecePrice} SAR</span></div>
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="editProductTrigger('${p.id}')" class="flex-1 bg-slate-100 dark:bg-slate-700 p-2 rounded-xl text-[10px] font-black">EDIT</button>
                <button onclick="deleteProductTrigger('${p.id}')" class="bg-red-500/10 text-red-500 p-2 rounded-xl"><i data-lucide="trash" class="w-3 h-3"></i></button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// === FORM & SYNC ===
let compressedBase64 = null;
window.handleFormImage = async (input) => {
    if (input.files[0]) {
        compressedBase64 = await compressImage(input.files[0]);
        document.getElementById('form-img-output').src = compressedBase64;
        document.getElementById('form-img-output').classList.remove('hidden');
        document.getElementById('image-placeholder').classList.add('hidden');
    }
};

window.saveProduct = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.innerText = "COMPRESSING & SYNCING..."; btn.disabled = true;

    try {
        const id = document.getElementById('form-id').value || Date.now().toString();
        let finalImg = document.getElementById('form-img-output').src;

        if (compressedBase64) {
            const fd = new FormData();
            fd.append('file', compressedBase64);
            fd.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
            const data = await res.json();
            finalImg = data.secure_url;
        }

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
            image: finalImg,
            updatedAt: Date.now()
        };

        await firestore.collection('stockify_products').doc(id).set(product);
        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').put(product);
        
        closeProductForm();
        syncData();
    } catch (err) { alert(err.message); }
    finally { btn.innerText = "Sync to Cloud & Local"; btn.disabled = false; }
};

// === SCANNER LOGIC (With Auto Add) ===
let scanner = null;
window.startScanner = () => {
    scanner = new Html5Qrcode("scanner-container");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (decoded) => {
        const match = localProducts.find(p => p.sku === decoded);
        if (match) {
            scanner.stop();
            showProductDetails(match);
        } else {
            scanner.stop();
            if(confirm("New Product Detected! Add to Inventory?")) {
                openAddProductForm(decoded);
            } else {
                startScanner();
            }
        }
    });
};

function showProductDetails(p) {
    const modal = document.getElementById('details-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.innerHTML = `
    <div class="bg-white dark:bg-slate-800 p-6 rounded-[3rem] w-full max-w-xs animate-in zoom-in-95">
        <img src="${p.image}" class="w-full h-40 object-cover rounded-3xl mb-4">
        <h2 class="text-xl font-black uppercase">${p.name}</h2>
        <p class="text-green-600 font-bold">Price: ${p.piecePrice} SAR</p>
        <div class="mt-4 space-y-2 text-xs font-bold text-slate-500 uppercase">
            <div class="flex justify-between"><span>Stock:</span> <span class="text-slate-900 dark:text-white">${p.totalPieces} Pcs</span></div>
            <div class="flex justify-between"><span>Expiry:</span> <span class="${new Date(p.expiryDate) < new Date() ? 'text-red-500' : ''}">${p.expiryDate}</span></div>
        </div>
        <div class="flex gap-2 mt-6">
            <button onclick="document.getElementById('details-modal').classList.add('hidden')" class="flex-1 p-3 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-[10px]">CLOSE</button>
            <button onclick="document.getElementById('details-modal').classList.add('hidden'); editProductTrigger('${p.id}')" class="flex-1 p-3 bg-primary text-white rounded-2xl font-black text-[10px]">EDIT</button>
        </div>
    </div>`;
}

// === DASHBOARD & CATEGORY ===
function renderDashboard() {
    const today = new Date();
    document.getElementById('dash-total').innerText = localProducts.length;
    let totalPcs = 0, expiredCount = 0;
    localProducts.forEach(p => {
        totalPcs += parseInt(p.totalPieces || 0);
        if (new Date(p.expiryDate) < today) expiredCount++;
    });
    document.getElementById('dash-pieces').innerText = totalPcs;
    document.getElementById('dash-expired').innerText = expiredCount;
}

// Expired filter trigger from Dashboard
document.getElementById('dash-expired').parentElement.onclick = () => {
    switchPage('products');
    renderProducts('expired');
};

// === INITIALIZATION ===
initLocalDB().then(() => {
    syncData();
});
