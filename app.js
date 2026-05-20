// === ১. কনফিগারেশন (Meetwoyou Project Backend) ===
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    databaseURL: "https://meetwoyou-436a2-default-rtdb.firebaseio.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// অফলাইন সাপোর্ট (ইন্টারনেট ছাড়াও ডাটা সেভ হবে)
db.enablePersistence().catch((err) => {
    console.error("Persistence failed:", err.code);
});

// ক্লাউডিনারি কনফিগ
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'Meetwoyou';

let allProducts = [];
let selectedFile = null;

// === ২. স্মার্ট ক্যাটাগরি ক্যালকুলেশন ===
const categoryDefaults = {
    "Grains": 25,
    "Dairy": 12,
    "Beverages": 24,
    "Snacks": 50,
    "Packaged": 12,
    "Toiletries": 48
};

const cartonsInp = document.getElementById('form-cartons');
const pcsPerInp = document.getElementById('form-pcs-per');
const totalPcsInp = document.getElementById('form-total-pcs');
const categoryInp = document.getElementById('form-category');

categoryInp.addEventListener('change', (e) => {
    pcsPerInp.value = categoryDefaults[e.target.value] || 1;
    calculateTotal();
});

function calculateTotal() {
    const cartons = parseInt(cartonsInp.value) || 0;
    const perCarton = parseInt(pcsPerInp.value) || 0;
    totalPcsInp.value = cartons * perCarton;
}

[cartonsInp, pcsPerInp].forEach(el => {
    el.addEventListener('input', calculateTotal);
});

// === ৩. ইমেজ অপ্টিমাইজেশন ও আপলোড ===
async function uploadOptimizedImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('custom_coordinates', 'c_scale,w_800,q_auto,f_auto');

    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

// === ৪. ডাটা সেভ লজিক ===
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('save-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Syncing...";

    try {
        let finalImageUrl = document.getElementById('form-img-output').src;

        if (selectedFile) {
            const uploadedUrl = await uploadOptimizedImage(selectedFile);
            if (uploadedUrl) finalImageUrl = uploadedUrl;
        }

        const id = document.getElementById('form-id').value;
        const productData = {
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: categoryInp.value,
            cartons: parseInt(cartonsInp.value) || 0,
            pcsPerCarton: parseInt(pcsPerInp.value) || 0,
            totalPieces: parseInt(totalPcsInp.value) || 0,
            expiryDate: document.getElementById('form-expiry').value,
            imageUrl: finalImageUrl,
            developer: "Sabbir Hosen Akash",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (id) {
            await db.collection('stockify_products').doc(id).update(productData);
        } else {
            await db.collection('stockify_products').add(productData);
        }

        alert("Synced with Meetwoyou Cloud!");
        window.closeProductForm();
        selectedFile = null;
    } catch (err) {
        alert("Sync Error: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Save Data";
    }
});

// === ৫. রিয়েল-টাইম ডিসপ্লে লজিক ===
db.collection('stockify_products').orderBy('updatedAt', 'desc').onSnapshot(snap => {
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateDashboard();
    renderGrid(allProducts);
});

function renderGrid(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    
    grid.innerHTML = products.map(p => `
        <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="relative aspect-video">
                <img src="${p.imageUrl || 'profile.png'}" class="w-full h-full object-cover">
                <div class="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md">
                    ${p.category}
                </div>
            </div>
            <div class="p-5">
                <h3 class="font-black text-lg mb-1">${p.name}</h3>
                <p class="text-xs text-slate-400 font-mono mb-4">SKU: ${p.sku}</p>
                
                <div class="flex justify-between items-center mb-4">
                    <div class="text-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl flex-1 mr-2">
                        <p class="text-[8px] uppercase font-bold text-slate-400">Stock</p>
                        <p class="font-black text-primary">${p.totalPieces} Pcs</p>
                    </div>
                    <div class="text-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl flex-1">
                        <p class="text-[8px] uppercase font-bold text-slate-400">Expiry</p>
                        <p class="font-black text-red-500 text-[10px]">${p.expiryDate}</p>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button onclick="editProduct('${p.id}')" class="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <i data-lucide="edit-3" class="w-4 h-4"></i> Edit
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function updateDashboard() {
    const total = allProducts.length;
    const pieces = allProducts.reduce((s, p) => s + (p.totalPieces || 0), 0);
    const expired = allProducts.filter(p => new Date(p.expiryDate) < new Date()).length;

    if(document.getElementById('dash-total')) document.getElementById('dash-total').innerText = total;
    if(document.getElementById('dash-pieces')) document.getElementById('dash-pieces').innerText = pieces;
    if(document.getElementById('dash-expired')) document.getElementById('dash-expired').innerText = expired;
}

// এডিট এবং ডিলিট এক্সপোজ করা
window.editProduct = (id) => {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    window.openAddProductForm();
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-sku').value = p.sku;
    document.getElementById('form-category').value = p.category;
    document.getElementById('form-cartons').value = p.cartons;
    document.getElementById('form-pcs-per').value = p.pcsPerCarton;
    document.getElementById('form-total-pcs').value = p.totalPieces;
    document.getElementById('form-expiry').value = p.expiryDate;
    document.getElementById('form-img-output').src = p.imageUrl;
    document.getElementById('form-img-output').classList.remove('hidden');
    document.getElementById('upload-placeholder').classList.add('hidden');
    document.getElementById('form-title').innerText = "Update Item";
};

window.deleteProduct = async (id) => {
    if(confirm("Delete this item from Cloud?")) {
        await db.collection('stockify_products').doc(id).delete();
    }
};

// সার্চ লজিক
document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || p.sku.includes(term)
    );
    renderGrid(filtered);
});

// ইমেজ সিলেক্ট হ্যান্ডলার
document.getElementById('form-image-input').addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('form-img-output').src = ev.target.result;
            document.getElementById('form-img-output').classList.remove('hidden');
            document.getElementById('upload-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(selectedFile);
    }
});
