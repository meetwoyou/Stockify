// === FIREBASE CONFIGURATION ===
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Cloudinary Configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

// === STATE MANAGEMENT ===
let localProducts = [];
let currentCategory = 'All';
let scannerInstance = null;
let selectedFile = null;

// === ROUTING SYSTEM ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.remove('hidden');

    // Update active states for bottom nav icons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-tab');
    });
    // Find button based on logic or index
    
    if (pageId === 'scanner') startScannerEngine();
    else stopScannerEngine();

    if (pageId === 'dashboard' || pageId === 'products') syncData();
    lucide.createIcons();
};

// === IMAGE HANDLING (Cloudinary) ===
window.handleFormImage = (input) => {
    selectedFile = input.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('form-img-output').src = e.target.result;
            document.getElementById('form-img-output').classList.remove('hidden');
            document.getElementById('image-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(selectedFile);
    }
};

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    // image optimization: resize to 600px automatically
    return data.secure_url.replace('/upload/', '/upload/w_600,c_scale,q_auto/');
}

// === DATA SYNCHRONIZATION (Firestore) ===
async function syncData() {
    try {
        const snapshot = await db.collection('stockify_products').orderBy('updatedAt', 'desc').get();
        localProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        updateDashboard();
        renderProducts();
    } catch (err) {
        console.error("Sync Error:", err);
    }
}

function updateDashboard() {
    document.getElementById('dash-total').innerText = localProducts.length;
    let totalPcs = 0;
    let expiredCount = 0;
    const today = new Date();

    localProducts.forEach(p => {
        totalPcs += (parseInt(p.totalPieces) || 0);
        if (p.expiryDate && new Date(p.expiryDate) < today) expiredCount++;
    });

    document.getElementById('dash-pieces').innerText = totalPcs;
    document.getElementById('dash-expired').innerText = expiredCount;
}

// === PRODUCT OPERATIONS ===
window.saveProduct = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerText;
    btn.innerText = "SAVING...";
    btn.disabled = true;

    try {
        let imageUrl = document.getElementById('form-img-output').src;
        if (selectedFile) {
            imageUrl = await uploadToCloudinary(selectedFile);
        }

        const productData = {
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: document.getElementById('form-category').value,
            cartons: document.getElementById('form-cartons').value,
            pcsPerCtn: document.getElementById('form-pcs-per').value,
            totalPieces: document.getElementById('form-total-pcs').value,
            expiryDate: document.getElementById('form-expiry').value,
            image: imageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docId = document.getElementById('form-id').value;
        if (docId) {
            await db.collection('stockify_products').doc(docId).update(productData);
        } else {
            await db.collection('stockify_products').add(productData);
        }

        closeForm();
        syncData();
        alert("Data Synced Successfully!");
    } catch (err) {
        alert("Error saving: " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        selectedFile = null;
    }
};

window.renderProducts = () => {
    const grid = document.getElementById('product-grid');
    const query = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = localProducts.filter(p => 
        p.name.toLowerCase().includes(query) || p.sku.includes(query)
    );

    grid.innerHTML = filtered.map(p => `
        <div class="glass-card p-4 rounded-[2rem] flex items-center gap-4">
            <img src="${p.image || 'https://via.placeholder.com/100'}" class="w-20 h-20 rounded-2xl object-cover border border-white/10">
            <div class="flex-1">
                <h4 class="font-bold text-white">${p.name}</h4>
                <p class="text-[10px] font-mono text-slate-500">${p.sku}</p>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs font-black text-primary">${p.totalPieces} PCS</span>
                    <div class="flex gap-2">
                        <button onclick="editProduct('${p.id}')" class="p-2 bg-slate-800 rounded-lg"><i data-lucide="edit-3" class="w-3 h-3 text-slate-400"></i></button>
                        <button onclick="deleteProduct('${p.id}')" class="p-2 bg-red-950/30 rounded-lg"><i data-lucide="trash-2" class="w-3 h-3 text-red-500"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
};

window.editProduct = (id) => {
    const p = localProducts.find(item => item.id === id);
    openForm();
    document.getElementById('form-title').innerText = "Edit Product";
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-sku').value = p.sku;
    document.getElementById('form-category').value = p.category;
    document.getElementById('form-cartons').value = p.cartons;
    document.getElementById('form-pcs-per').value = p.pcsPerCtn;
    document.getElementById('form-total-pcs').value = p.totalPieces;
    document.getElementById('form-expiry').value = p.expiryDate;
    document.getElementById('form-img-output').src = p.image;
    document.getElementById('form-img-output').classList.remove('hidden');
    document.getElementById('image-placeholder').classList.add('hidden');
};

window.deleteProduct = async (id) => {
    if (confirm("Are you sure?")) {
        await db.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

// === SCANNER ENGINE (Back Camera Optimized) ===
async function startScannerEngine() {
    scannerInstance = new ZXing.BrowserMultiFormatReader();
    const devices = await scannerInstance.listVideoInputDevices();
    const backCam = devices.find(d => d.label.toLowerCase().includes('back')) || devices[devices.length - 1];

    scannerInstance.decodeFromVideoDevice(backCam.deviceId, 'scan-video', (result) => {
        if (result) {
            if (navigator.vibrate) navigator.vibrate(100);
            const found = localProducts.find(p => p.sku === result.text);
            if (found) {
                alert(`Found: ${found.name} (${found.totalPieces} Pcs)`);
            } else {
                openForm();
                document.getElementById('form-sku').value = result.text;
            }
            switchPage('products');
        }
    });
}

function stopScannerEngine() {
    if (scannerInstance) scannerInstance.reset();
}

// === INITIALIZE ===
document.addEventListener('DOMContentLoaded', () => {
    syncData();
    switchPage('dashboard');
    
    // Search listener
    document.getElementById('search-input').addEventListener('input', renderProducts);
});
