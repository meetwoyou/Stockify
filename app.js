// === CONFIG ===
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// Cloudinary
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

// Global State
let localDB = null;
let products = [];
let scanner = null;
let selectedFile = null;

// === STORAGE ENGINE (IndexedDB) ===
const initLocalDB = () => {
    return new Promise((resolve) => {
        const req = indexedDB.open('StockifyLocal', 1);
        req.onupgradeneeded = (e) => e.target.result.createObjectStore('inventory', { keyPath: 'id' });
        req.onsuccess = (e) => { localDB = e.target.result; resolve(); };
    });
};

const saveLocal = (data) => {
    const tx = localDB.transaction('inventory', 'readwrite');
    tx.objectStore('inventory').put(data);
};

const getAllLocal = () => {
    return new Promise((resolve) => {
        const tx = localDB.transaction('inventory', 'readonly');
        const req = tx.objectStore('inventory').getAll();
        req.onsuccess = () => resolve(req.result);
    });
};

// === CORE LOGIC ===
async function syncData() {
    // 1. Load Local first (Instant display)
    products = await getAllLocal();
    renderUI();

    // 2. Fetch from Cloud and update Local (Background sync)
    try {
        const snapshot = await firestore.collection('stockify_products').get();
        const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Update local with cloud data
        cloudData.forEach(p => saveLocal(p));
        products = cloudData;
        renderUI();
    } catch (e) { console.log("Offline mode: Using local data"); }
}

function renderUI() {
    // Update Dashboard
    document.getElementById('dash-total').innerText = products.length;
    let totalPcs = 0;
    products.forEach(p => totalPcs += (parseInt(p.totalPieces) || 0));
    document.getElementById('dash-pieces').innerText = totalPcs;

    // Update Grid
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => `
        <div class="glass p-4 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
            <img src="${p.image || 'https://via.placeholder.com/80'}" class="w-16 h-16 rounded-2xl object-cover">
            <div class="flex-1">
                <h4 class="font-bold text-sm line-clamp-1">${p.name}</h4>
                <p class="text-[9px] font-mono text-slate-500 tracking-tighter">${p.sku}</p>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs font-black text-primary">${p.totalPieces} PCS</span>
                    <div class="flex gap-2">
                        <button onclick="editItem('${p.id}')" class="p-2 glass rounded-lg text-slate-400"><i data-lucide="edit-3" class="w-3 h-3"></i></button>
                        <button onclick="deleteItem('${p.id}')" class="p-2 glass rounded-lg text-red-500/50"><i data-lucide="trash" class="w-3 h-3"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// === FORM HANDLING ===
window.openForm = () => {
    document.getElementById('form-overlay').classList.remove('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('img-preview').classList.add('hidden');
    document.getElementById('img-placeholder').classList.remove('hidden');
};

window.closeForm = () => document.getElementById('form-overlay').classList.add('hidden');

// Auto Calculation
const updateTotals = () => {
    const ctn = parseInt(document.getElementById('p-ctn').value) || 0;
    const pcs = parseInt(document.getElementById('p-pcs-ctn').value) || 0;
    document.getElementById('p-total').value = ctn * pcs;
    
    // Auto Price calculation
    const ctnPrice = parseFloat(document.getElementById('p-price-ctn').value) || 0;
    if(ctnPrice > 0 && pcs > 0) {
        document.getElementById('p-price-pcs').value = (ctnPrice / pcs).toFixed(2);
    }
};
['p-ctn', 'p-pcs-ctn', 'p-price-ctn'].forEach(id => document.getElementById(id).oninput = updateTotals);

// Image Preview
document.getElementById('file-input').onchange = (e) => {
    selectedFile = e.target.files[0];
    if(selectedFile) {
        const reader = new FileReader();
        reader.onload = (re) => {
            document.getElementById('img-preview').src = re.target.result;
            document.getElementById('img-preview').classList.remove('hidden');
            document.getElementById('img-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(selectedFile);
    }
};

// Final Save
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.innerText = "UPLOADING..."; btn.disabled = true;

    try {
        let imgUrl = document.getElementById('img-preview').src;
        if(selectedFile) {
            const fd = new FormData();
            fd.append('file', selectedFile);
            fd.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
            const data = await res.json();
            imgUrl = data.secure_url.replace('/upload/', '/upload/w_400,c_scale,q_auto/');
        }

        const id = document.getElementById('form-id').value || Date.now().toString();
        const payload = {
            id,
            name: document.getElementById('p-name').value,
            sku: document.getElementById('p-sku').value,
            category: document.getElementById('p-cat').value,
            cartons: document.getElementById('p-ctn').value,
            pcsPerCtn: document.getElementById('p-pcs-ctn').value,
            totalPieces: document.getElementById('p-total').value,
            priceCtn: document.getElementById('p-price-ctn').value,
            pricePcs: document.getElementById('p-price-pcs').value,
            expiryDate: document.getElementById('p-expiry').value,
            image: imgUrl,
            updatedAt: Date.now()
        };

        // Save to Local & Cloud
        saveLocal(payload);
        await firestore.collection('stockify_products').doc(id).set(payload);
        
        closeForm();
        syncData();
        alert("Synced Successfully!");
    } catch (err) { alert("Error: " + err.message); }
    finally { btn.innerText = "SYNC TO CLOUD & LOCAL"; btn.disabled = false; }
};

// === SCANNER ===
async function startScanner() {
    scanner = new ZXing.BrowserMultiFormatReader();
    const devices = await scanner.listVideoInputDevices();
    const back = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
    
    scanner.decodeFromVideoDevice(back.deviceId, 'scan-video', (result) => {
        if(result) {
            if(navigator.vibrate) navigator.vibrate(100);
            const match = products.find(p => p.sku === result.text);
            if(match) {
                alert("Found: " + match.name);
                editItem(match.id);
            } else {
                openForm();
                document.getElementById('p-sku').value = result.text;
            }
            switchPage('products');
        }
    });
}

// === ROUTING ===
window.switchPage = (id) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${id}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
    const activeBtn = document.querySelector(`[data-id="${id}"]`);
    if(activeBtn) activeBtn.classList.add('nav-active');

    if(id === 'scanner') startScanner();
    else if(scanner) scanner.reset();
    
    if(id === 'dashboard' || id === 'products') syncData();
    lucide.createIcons();
};

window.editItem = (id) => {
    const p = products.find(i => i.id === id);
    openForm();
    document.getElementById('form-title').innerText = "Update Item";
    document.getElementById('form-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-sku').value = p.sku;
    document.getElementById('p-cat').value = p.category;
    document.getElementById('p-ctn').value = p.cartons;
    document.getElementById('p-pcs-ctn').value = p.pcsPerCtn;
    document.getElementById('p-total').value = p.totalPieces;
    document.getElementById('p-price-ctn').value = p.priceCtn;
    document.getElementById('p-price-pcs').value = p.pricePcs;
    document.getElementById('p-expiry').value = p.expiryDate;
    document.getElementById('img-preview').src = p.image;
    document.getElementById('img-preview').classList.remove('hidden');
    document.getElementById('img-placeholder').classList.add('hidden');
};

window.deleteItem = async (id) => {
    if(confirm("Confirm Delete?")) {
        const tx = localDB.transaction('inventory', 'readwrite');
        tx.objectStore('inventory').delete(id);
        await firestore.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

// Initialization
initLocalDB().then(() => {
    syncData();
    switchPage('dashboard');
});
