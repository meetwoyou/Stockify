/**
 * STOCKIFY PRO - ADVANCED HYBRID ENGINE
 * Developed for: Sabbir Hosen Akash
 */

// === ১. কনফিগারেশন ===
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
let currentFilter = 'all';

// === ২. ডাটাবেস ইনিশিয়ালাইজেশন ===
const initLocalDB = () => {
    return new Promise((resolve) => {
        const request = indexedDB.open('Stockify_Sabbir_v3', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
        };
        request.onsuccess = (e) => { localDB = e.target.result; resolve(); };
    });
};

// ডাটা সিঙ্ক্রোনাইজেশন
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

// === ৩. ইমেজ কমপ্রেশন (২০০-৩০০ KB টার্গেট) ===
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
                // ০.৭ কোয়ালিটি ইমেজ সাইজ ২০০-৩০০ কেবি এর মধ্যে রাখে
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
};

window.handleFormImage = async (input) => {
    if (input.files && input.files[0]) {
        compressedBase64 = await compressImage(input.files[0]);
        document.getElementById('form-img-output').src = compressedBase64;
        document.getElementById('form-img-output').classList.remove('hidden');
        document.getElementById('image-placeholder').classList.add('hidden');
    }
};

// === ৪. নেভিগেশন এবং ফিল্টারিং ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isTarget = btn.getAttribute('data-page') === pageId;
        btn.classList.toggle('text-primary', isTarget);
        btn.classList.toggle('text-slate-500', !isTarget);
    });

    if (pageId === 'scanner') startScanner();
    else if (scanner) { scanner.stop(); scanner = null; }
    
    lucide.createIcons();
};

window.setFilter = (filter) => {
    currentFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(filter) || (filter === 'all' && btn.innerText === 'All'));
    });
    renderProducts();
};

// === ৫. প্রোডাক্ট রেন্ডারিং ===
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
        <div onclick="viewProductDetails('${p.id}')" class="bg-surface p-4 rounded-[2.5rem] border-2 ${isExp ? 'border-red-500 bg-red-500/5' : 'border-transparent'} relative active:scale-95 transition-all">
            <div class="h-36 rounded-3xl overflow-hidden mb-4 shadow-lg">
                <img src="${p.image}" class="w-full h-full object-cover">
                ${isExp ? '<span class="absolute top-6 right-6 bg-red-600 text-[8px] text-white px-2 py-1 rounded-full font-black uppercase">Expired</span>' : ''}
            </div>
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-black text-sm uppercase">${p.name}</h4>
                    <p class="text-[9px] font-bold text-slate-500 mt-0.5">Barcode: ${p.sku}</p>
                </div>
                <span class="bg-slate-800 text-[9px] px-2 py-1 rounded-md font-bold text-slate-400 uppercase">${p.category}</span>
            </div>
            <div class="flex justify-between items-center mt-4 pt-3 border-t border-slate-800">
                <span class="text-xs font-black text-primary">${p.totalPieces} Pcs</span>
                <div class="flex gap-4 text-[10px] font-bold text-slate-300">
                    <span>Ctn: ${p.cartonPrice}</span>
                    <span>Pce: ${p.piecePrice}</span>
                </div>
            </div>
            <button onclick="event.stopPropagation(); deleteProduct('${p.id}')" class="absolute -top-1 -right-1 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 hover:opacity-100 transition-opacity">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
        </div>`;
    }).join('');
    lucide.createIcons();
};

// === ৬. ভিউ শিট (Details Modal) ===
window.viewProductDetails = (id) => {
    const p = localProducts.find(item => item.id === id);
    if (!p) return;

    const modal = document.getElementById('details-modal');
    document.getElementById('detail-img').src = p.image;
    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('detail-category').innerText = p.category;
    document.getElementById('detail-sku').innerText = p.sku;
    document.getElementById('detail-stock').innerText = `${p.cartons} Cartons × ${p.pcsPerCarton} (${p.totalPieces} Pcs)`;
    document.getElementById('detail-ctn-price').innerText = p.cartonPrice;
    document.getElementById('detail-pce-price').innerText = p.piecePrice;
    document.getElementById('detail-expiry').innerText = p.expiryDate;

    const expiryLabel = document.getElementById('detail-expiry');
    const isExp = new Date(p.expiryDate) < new Date();
    expiryLabel.classList.toggle('text-red-500', isExp);
    expiryLabel.classList.toggle('text-orange-400', !isExp);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
};

// === ৭. স্ক্যানার লজিক (অটো-অ্যাড ফিচার) ===
window.startScanner = () => {
    scanner = new Html5Qrcode("scanner-container");
    scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (decoded) => {
        const match = localProducts.find(p => p.sku === decoded);
        if (match) {
            scanner.stop();
            viewProductDetails(match.id);
        } else {
            scanner.stop();
            // অটোমেটিক অ্যাড অপশন
            if(confirm("প্রোডাক্ট পাওয়া যায়নি!\nবারকোড: " + decoded + "\nআপনি কি এটি নতুন পণ্য হিসেবে যোগ করতে চান?")) {
                openAddProductForm(decoded);
            } else {
                startScanner();
            }
        }
    }).catch(err => console.error("Scanner Error", err));
};

// === ৮. ফরম কন্ট্রোল এবং সেভ ===
window.openAddProductForm = (sku = '') => {
    document.getElementById('products-form-view').classList.remove('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-sku').value = sku;
    document.getElementById('form-img-output').src = '';
    document.getElementById('form-img-output').classList.add('hidden');
    document.getElementById('image-placeholder').classList.remove('hidden');
    compressedBase64 = null;
    calculateTotalPieces();
};

window.closeProductForm = () => {
    document.getElementById('products-form-view').classList.add('hidden');
};

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

        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').put(product);
        await firestore.collection('stockify_products').doc(id).set(product);

        closeProductForm();
        syncData();
    } catch (err) { alert("Error: " + err.message); }
    finally { saveBtn.innerText = "Save & Sync"; saveBtn.disabled = false; }
};

window.deleteProduct = async (id) => {
    if (confirm("Delete permanently?")) {
        const tx = localDB.transaction('products', 'readwrite');
        tx.objectStore('products').delete(id);
        await firestore.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

window.renderDashboard = () => {
    const today = new Date();
    let expCount = 0;
    localProducts.forEach(p => {
        if (new Date(p.expiryDate) < today) expCount++;
    });
    document.getElementById('dash-total').innerText = localProducts.length;
    document.getElementById('dash-expired').innerText = expCount;
};

// === ৯. স্টার্ট অ্যাপ ===
document.addEventListener('DOMContentLoaded', async () => {
    await initLocalDB();
    syncData();
    lucide.createIcons();
});
