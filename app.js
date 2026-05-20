/**
 * STOCKIFY PRO MAX - MASTER ENGINE 
 * Developer: Sabbir Hosen Akash
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

// === 3. SYNC ENGINE (HYBRID) ===
function loadLocalData() {
    const saved = localStorage.getItem('akash_stock_db');
    if (saved) {
        products = JSON.parse(saved);
        renderProducts();
        updateOverview();
    }
}

async function syncWithCloud() {
    try {
        // 'stockify_products' কালেকশন থেকে ডেটা কল করা হচ্ছে
        const snapshot = await db.collection('products').orderBy('updatedAt', 'desc').get();
        const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (cloudData.length > 0) {
            products = cloudData;
            localStorage.setItem('akash_stock_db', JSON.stringify(products));
            renderProducts();
            updateOverview();
        }
    } catch (e) {
        console.warn("Offline: Local data used.");
    }
}

// === 4. RENDER & OVERVIEW (7-DAY ALERT INCLUDED) ===
function renderProducts() {
    const grid = document.getElementById('product-grid');
    if(!grid) return;

    const search = document.getElementById('search-input').value.toLowerCase();
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search) || p.sku.includes(search);
        const pExpiry = new Date(p.expiry);
        
        if (currentFilter === 'expiring_soon') {
            return matchesSearch && pExpiry >= today && pExpiry <= sevenDaysLater;
        }
        
        const matchesFilter = currentFilter === 'all' || 
                             (currentFilter === 'expired' ? pExpiry < today : p.category === currentFilter);
        return matchesSearch && matchesFilter;
    });

    grid.innerHTML = filtered.map(p => {
        const pExpiry = new Date(p.expiry);
        const isExp = pExpiry < today;
        const isSoon = pExpiry >= today && pExpiry <= sevenDaysLater;

        return `
        <div class="bg-white dark:bg-surface p-5 rounded-[2.5rem] border ${isExp ? 'border-red-500' : isSoon ? 'border-orange-500 animate-pulse' : 'border-slate-200 dark:border-slate-800'} relative shadow-sm">
            <div onclick="viewDetails('${p.id}')" class="h-44 rounded-3xl overflow-hidden mb-4 bg-black">
                <img src="${p.image}" class="w-full h-full object-cover">
                ${isSoon && !isExp ? '<div class="absolute top-8 right-8 bg-orange-500 text-[8px] text-white px-2 py-1 rounded-full font-black uppercase">7 Days Left</div>' : ''}
            </div>
            <h3 class="font-black text-lg uppercase truncate">${p.name}</h3>
            <div class="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div class="flex gap-4">
                    <div class="text-center"><p class="text-[8px] font-bold text-slate-500">CTN</p><p class="text-xs font-black">${p.priceCtn}</p></div>
                    <div class="text-center border-l border-slate-800 pl-4"><p class="text-[8px] font-bold text-slate-500">PCE</p><p class="text-xs font-black text-primary">${p.pricePce}</p></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="openEditForm('${p.id}')" class="p-3 bg-slate-100 dark:bg-[#0b1120] rounded-xl"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteProduct('${p.id}')" class="p-3 bg-red-500/10 rounded-xl text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function updateOverview() {
    if(!document.getElementById('dash-total')) return;
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    const expired = products.filter(p => new Date(p.expiry) < today).length;
    const expiringSoon = products.filter(p => {
        const exp = new Date(p.expiry);
        return exp >= today && exp <= sevenDaysLater;
    }).length;

    document.getElementById('dash-total').innerText = products.length;
    document.getElementById('dash-expired').innerText = expired;
    
    // ৭ দিনের অ্যালার্ট সংখ্যা আপডেট
    const alertBox = document.getElementById('dash-soon');
    if(alertBox) alertBox.innerText = expiringSoon;

    // Update Chart
    const catMap = {};
    products.forEach(p => catMap[p.category] = (catMap[p.category] || 0) + 1);
    stockChart.data.labels = Object.keys(catMap);
    stockChart.data.datasets[0].data = Object.values(catMap);
    stockChart.update();
}

// === 5. SCANNER WITH BEAUTIFUL SOUND & ATOMIC ADD ===
function startScanner() {
    scanner = new Html5Qrcode("scanner-container");
    scanner.start({ facingMode: "environment" }, { fps: 25, qrbox: 250 }, (decoded) => {
        // সুন্দর ডিজিটাল স্ক্যান সাউন্ড
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-37.mp3');
        audio.play();

        const found = products.find(p => p.sku === decoded);
        if (found) {
            stopScanner();
            switchPage('products');
            viewDetails(found.id);
        } else {
            stopScanner();
            if (confirm("New Barcode: " + decoded + "\nProduct not found. Add now?")) {
                openAddForm(decoded);
            } else { startScanner(); }
        }
    }).catch(err => console.error(err));
}

function stopScanner() {
    if (scanner) {
        scanner.stop().then(() => scanner = null).catch(() => {});
    }
}

// === 6. SAVE & DELETE (FIREBASE + LOCAL) ===
async function handleSave(e) {
    e.preventDefault();
    const btn = e.submitter;
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        const id = document.getElementById('form-id').value || Date.now().toString();
        let imageUrl = document.getElementById('form-img-preview').src;
        const file = document.querySelector('input[type="file"]').files[0];

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

        // Cloud + Local Save
        await db.collection('products').doc(id).set(payload);
        const index = products.findIndex(p => p.id === id);
        if (index > -1) products[index] = payload; else products.push(payload);
        localStorage.setItem('akash_stock_db', JSON.stringify(products));

        closeModal();
        renderProducts();
        updateOverview();
    } catch (err) { alert("Error: " + err.message); }
    finally { btn.innerText = "Save Product"; btn.disabled = false; }
}

async function deleteProduct(id) {
    if (confirm("Permanently delete from Cloud?")) {
        products = products.filter(p => p.id !== id);
        localStorage.setItem('akash_stock_db', JSON.stringify(products));
        await db.collection('products').doc(id).delete();
        renderProducts();
        updateOverview();
    }
}

// === 7. HELPERS ===
function initChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');
    stockChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: '#16a34a', tension: 0.4, fill: true, backgroundColor: 'rgba(22, 163, 74, 0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

window.switchPage = (pageId) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    if (pageId === 'scanner') startScanner(); else stopScanner();
    if (pageId === 'dashboard') updateOverview();
    lucide.createIcons();
};

window.openAddForm = (sku = '') => {
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
    document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase().includes(f.toLowerCase())));
    renderProducts();
};

window.viewDetails = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('detail-img').src = p.image;
    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('detail-ctn-price').innerText = p.priceCtn;
    document.getElementById('detail-pce-price').innerText = p.pricePce;
    document.getElementById('detail-expiry').innerText = p.expiry;
    document.getElementById('details-modal').classList.remove('hidden');
};
