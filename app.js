/**
 * STOCKIFY PRO MAX - HYBRID CORE ENGINE
 * Developed by: Sabbir Hosen Akash
 * Version: 3.0.1 (Stable)
 */

// === 1. FIREBASE & CLOUDINARY CONFIG ===
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

// Initialize Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

// Global State
let products = [];
let currentFilter = 'all';
let scanner = null;
let stockChart = null;

// === 2. INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    loadLocalData();
    syncWithCloud();
    initChart();
    lucide.createIcons();
});

// === 3. CORE SYNC ENGINE (LOCAL FIRST, CLOUD SECOND) ===
function loadLocalData() {
    const saved = localStorage.getItem('akash_stock_db');
    if (saved) {
        products = JSON.parse(saved);
        renderProducts();
        updateOverview();
    }
}

async function syncWithCloud() {
    const statusEl = document.getElementById('sync-status');
    try {
        const snapshot = await db.collection('products').orderBy('updatedAt', 'desc').get();
        const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (cloudData.length > 0) {
            products = cloudData;
            localStorage.setItem('akash_stock_db', JSON.stringify(products));
            renderProducts();
            updateOverview();
            if(statusEl) statusEl.innerHTML = '<span class="w-2 h-2 bg-primary rounded-full animate-ping"></span> Live Cloud Synced';
        }
    } catch (e) {
        if(statusEl) statusEl.innerHTML = '<span class="w-2 h-2 bg-orange-500 rounded-full"></span> Offline Mode';
        console.warn("Using Local Cache: Offline");
    }
}

// === 4. PRODUCT RENDERING & SEARCH ===
function renderProducts() {
    const grid = document.getElementById('product-grid');
    if(!grid) return;

    const search = document.getElementById('search-input').value.toLowerCase();
    const today = new Date();

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search) || p.sku.includes(search);
        const matchesFilter = currentFilter === 'all' || 
                             (currentFilter === 'expired' ? new Date(p.expiry) < today : p.category === currentFilter);
        return matchesSearch && matchesFilter;
    });

    grid.innerHTML = filtered.map(p => {
        const isExp = new Date(p.expiry) < today;
        return `
        <div class="bg-white dark:bg-surface p-5 rounded-[2.5rem] border ${isExp ? 'border-red-500/50 bg-red-500/5' : 'border-slate-200 dark:border-slate-800'} shadow-sm relative group active:scale-[0.98] transition-all">
            <div onclick="viewDetails('${p.id}')" class="h-44 rounded-3xl overflow-hidden mb-4 bg-slate-100 dark:bg-black">
                <img src="${p.image}" class="w-full h-full object-cover">
                ${isExp ? '<div class="absolute top-8 right-8 bg-red-600 text-[8px] text-white px-2 py-1 rounded-full font-black uppercase">Expired</div>' : ''}
            </div>
            <div class="space-y-1">
                <div class="flex justify-between items-start">
                    <h3 class="font-black text-lg uppercase truncate flex-1">${p.name}</h3>
                    <span class="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase ml-2">${p.category}</span>
                </div>
                <p class="text-[10px] font-bold text-slate-500 font-mono">BC: ${p.sku}</p>
            </div>
            <div class="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div class="flex gap-4">
                    <div class="text-center"><p class="text-[8px] font-bold text-slate-400 uppercase">Ctn</p><p class="text-xs font-black text-white">${p.priceCtn}</p></div>
                    <div class="text-center border-l border-slate-800 pl-4"><p class="text-[8px] font-bold text-slate-400 uppercase">Pce</p><p class="text-xs font-black text-primary">${p.pricePce}</p></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="openEditForm('${p.id}')" class="p-3 bg-slate-100 dark:bg-[#0b1120] rounded-xl text-slate-500 hover:text-primary transition-colors"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteProduct('${p.id}')" class="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500 transition-colors hover:text-white"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// === 5. SMART SCANNER (WITH ATOMIC ADD & SOUND) ===
function startScanner() {
    scanner = new Html5Qrcode("scanner-container");
    const config = { fps: 20, qrbox: { width: 250, height: 250 } };
    
    scanner.start({ facingMode: "environment" }, config, (decoded) => {
        // Play Scan Sound
        document.getElementById('scan-sound').play().catch(() => {});
        
        const found = products.find(p => p.sku === decoded);
        if (found) {
            stopScanner();
            switchPage('products');
            viewDetails(found.id);
        } else {
            stopScanner();
            if (confirm(`New Item: ${decoded}\nNot in stock. Open Entry Form?`)) {
                openAddForm(decoded);
            } else { startScanner(); }
        }
    });
}

function stopScanner() {
    if (scanner) {
        scanner.stop().then(() => scanner = null).catch(() => {});
    }
}

// === 6. FORM & SYNC LOGIC ===
async function handleSave(e) {
    e.preventDefault();
    const submitBtn = e.submitter;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Syncing..."; submitBtn.disabled = true;

    try {
        const id = document.getElementById('form-id').value || Date.now().toString();
        let imageUrl = document.getElementById('form-img-preview').src;
        const file = document.querySelector('input[type="file"]').files[0];

        // Upload to Cloudinary if new file
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();
            imageUrl = data.secure_url;
        }

        const payload = {
            id,
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: document.getElementById('form-category').value,
            priceCtn: document.getElementById('form-price-ctn').value,
            pricePce: document.getElementById('form-price-pce').value,
            expiry: document.getElementById('form-expiry').value,
            image: imageUrl,
            updatedAt: Date.now()
        };

        // Save Local
        const index = products.findIndex(p => p.id === id);
        if (index > -1) products[index] = payload;
        else products.push(payload);
        
        localStorage.setItem('akash_stock_db', JSON.stringify(products));

        // Save Cloud (Firebase)
        await db.collection('products').doc(id).set(payload);

        closeModal();
        renderProducts();
        updateOverview();
    } catch (err) {
        alert("Sync Error: " + err.message);
    } finally {
        submitBtn.innerText = originalText; submitBtn.disabled = false;
    }
}

async function deleteProduct(id) {
    if (confirm("Delete this product permanently from Cloud?")) {
        products = products.filter(p => p.id !== id);
        localStorage.setItem('akash_stock_db', JSON.stringify(products));
        await db.collection('products').doc(id).delete();
        renderProducts();
        updateOverview();
    }
}

// === 7. OVERVIEW & ANALYTICS (CHART) ===
function initChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Items',
                data: [],
                borderColor: '#16a34a',
                borderWidth: 4,
                pointBackgroundColor: '#16a34a',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(22, 163, 74, 0.05)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: 'bold', size: 10 } } }
            }
        }
    });
}

function updateOverview() {
    if(!document.getElementById('dash-total')) return;
    
    const today = new Date();
    const expiredCount = products.filter(p => new Date(p.expiry) < today).length;
    
    document.getElementById('dash-total').innerText = products.length;
    document.getElementById('dash-expired').innerText = expiredCount;

    // Update Chart Data based on Categories
    const catMap = {};
    products.forEach(p => catMap[p.category] = (catMap[p.category] || 0) + 1);
    
    stockChart.data.labels = Object.keys(catMap);
    stockChart.data.datasets[0].data = Object.values(catMap);
    stockChart.update();
}

// === 8. UI NAVIGATION & UTILS ===
window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const active = btn.dataset.page === pageId;
        btn.classList.toggle('text-primary', active);
        btn.classList.toggle('text-slate-500', !active);
    });

    if (pageId === 'scanner') startScanner();
    else stopScanner();
    
    if (pageId === 'dashboard') updateOverview();
    lucide.createIcons();
};

window.openAddForm = (sku = '') => {
    document.getElementById('modal-title').innerText = "New Product Entry";
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-sku').value = sku;
    document.getElementById('form-img-preview').classList.add('hidden');
    document.getElementById('img-placeholder').classList.remove('hidden');
};

window.openEditForm = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    openAddForm();
    document.getElementById('modal-title').innerText = "Edit Product";
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-sku').value = p.sku;
    document.getElementById('form-category').value = p.category;
    document.getElementById('form-price-ctn').value = p.priceCtn;
    document.getElementById('form-price-pce').value = p.pricePce;
    document.getElementById('form-expiry').value = p.expiry;
    document.getElementById('form-img-preview').src = p.image;
    document.getElementById('form-img-preview').classList.remove('hidden');
    document.getElementById('img-placeholder').classList.add('hidden');
};

window.closeModal = () => document.getElementById('product-modal').classList.add('hidden');

window.setFilter = (f) => {
    currentFilter = f;
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(f.toLowerCase()));
    });
    renderProducts();
};

window.toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

window.previewImage = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('form-img-preview').src = e.target.result;
            document.getElementById('form-img-preview').classList.remove('hidden');
            document.getElementById('img-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.viewDetails = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('detail-img').src = p.image;
    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('detail-category').innerText = p.category;
    document.getElementById('detail-sku').innerText = p.sku;
    document.getElementById('detail-ctn-price').innerText = p.priceCtn;
    document.getElementById('detail-pce-price').innerText = p.pricePce;
    document.getElementById('detail-expiry').innerText = p.expiry;
    
    const modal = document.getElementById('details-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};
