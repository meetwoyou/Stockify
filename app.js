// =====================
// STOCKIFY PRO ULTRA FIXED ENGINE
// =====================

// FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// GLOBAL STATE
let products = [];
let currentFilter = "all";
let scanner = null;

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    initScanner();
    initCharts();
});

// =====================
// LOAD PRODUCTS
// =====================
async function loadProducts() {
    const snap = await db.collection("stockify_products").get();
    products = snap.docs.map(d => d.data());
    renderProducts();
    updateDashboard();
}

// =====================
// DASHBOARD
// =====================
function updateDashboard() {
    const today = new Date();

    let expired = 0;
    let expiring = 0;
    let categories = new Set();

    products.forEach(p => {
        const exp = new Date(p.expiryDate);
        categories.add(p.category);

        if (exp < today) expired++;

        let diff = (exp - today) / (1000 * 3600 * 24);
        if (diff <= 7 && diff >= 0) expiring++;
    });

    document.getElementById("dash-total").innerText = products.length;
    document.getElementById("dash-expired").innerText = expired;
    document.getElementById("dash-expiring").innerText = expiring;
    document.getElementById("dash-category").innerText = categories.size;
}

// =====================
// RENDER PRODUCTS
// =====================
function renderProducts() {
    const grid = document.getElementById("product-grid");
    const search = document.getElementById("search-input")?.value?.toLowerCase() || "";

    let filtered = products.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search)
    );

    const today = new Date();

    if (currentFilter === "expired") {
        filtered = filtered.filter(p => new Date(p.expiryDate) < today);
    }

    if (currentFilter === "expiring") {
        filtered = filtered.filter(p => {
            const diff = (new Date(p.expiryDate) - today) / (1000 * 3600 * 24);
            return diff <= 7 && diff >= 0;
        });
    }

    if (currentFilter !== "all" && currentFilter !== "expired" && currentFilter !== "expiring") {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    grid.innerHTML = filtered.map(p => `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer"
            onclick="openDetails('${p.sku}')">

            <img src="${p.image}" class="h-40 w-full object-cover rounded-xl mb-3">

            <h3 class="font-black">${p.name}</h3>
            <p class="text-xs text-slate-400">${p.sku}</p>

            <div class="flex justify-between mt-3 text-sm">
                <span>${p.totalPieces} pcs</span>
                <span class="text-primary">${p.category}</span>
            </div>

            <div class="flex justify-between mt-2 text-xs text-slate-400">
                <span>CTN: ${p.cartonPrice}</span>
                <span>PCS: ${p.piecePrice}</span>
            </div>

            <div class="flex gap-2 mt-3">
                <button onclick="event.stopPropagation(); editProduct('${p.sku}')"
                    class="bg-yellow-500 px-3 py-1 rounded text-black text-xs font-bold">
                    Edit
                </button>

                <button onclick="event.stopPropagation(); deleteProduct('${p.sku}')"
                    class="bg-red-500 px-3 py-1 rounded text-white text-xs font-bold">
                    Delete
                </button>
            </div>

        </div>
    `).join("");
}

// =====================
// SAVE / UPDATE
// =====================
async function saveProduct(e) {
    e.preventDefault();

    const id = document.getElementById("form-sku").value;

    const data = {
        name: form("form-name"),
        sku: form("form-sku"),
        category: form("form-category"),
        cartons: form("form-cartons"),
        pcsPerCarton: form("form-pcs-per"),
        totalPieces: form("form-total-pcs"),
        cartonPrice: form("form-carton-price"),
        piecePrice: form("form-piece-price"),
        expiryDate: form("form-expiry"),
        image: "https://via.placeholder.com/300"
    };

    await db.collection("stockify_products").doc(id).set(data);

    closeProductForm();
    loadProducts();
}

function form(id) {
    return document.getElementById(id).value;
}

// =====================
// DELETE
// =====================
async function deleteProduct(sku) {
    if (!confirm("Delete product?")) return;

    await db.collection("stockify_products").doc(sku).delete();
    loadProducts();
}

// =====================
// EDIT
// =====================
function editProduct(sku) {
    const p = products.find(x => x.sku === sku);
    if (!p) return;

    openAddProductForm();

    document.getElementById("form-name").value = p.name;
    document.getElementById("form-sku").value = p.sku;
    document.getElementById("form-category").value = p.category;
    document.getElementById("form-cartons").value = p.cartons;
    document.getElementById("form-pcs-per").value = p.pcsPerCarton;
    document.getElementById("form-total-pcs").value = p.totalPieces;
    document.getElementById("form-carton-price").value = p.cartonPrice;
    document.getElementById("form-piece-price").value = p.piecePrice;
    document.getElementById("form-expiry").value = p.expiryDate;
}

// =====================
// OPEN DETAILS
// =====================
function openDetails(sku) {
    const p = products.find(x => x.sku === sku);
    if (!p) return;

    alert(`
NAME: ${p.name}
SKU: ${p.sku}
STOCK: ${p.totalPieces}
CATEGORY: ${p.category}
EXPIRE: ${p.expiryDate}
    `);
}

// =====================
// FILTER
// =====================
function setFilter(f) {
    currentFilter = f;
    renderProducts();
}

// =====================
// THEME
// =====================
function toggleTheme() {
    document.documentElement.classList.toggle("dark");
}

// =====================
// NAV
// =====================
function switchPage(page) {
    document.querySelectorAll(".page-view").forEach(p => p.classList.add("hidden"));
    document.getElementById("page-" + page).classList.remove("hidden");
}

// =====================
// SCANNER
// =====================
function initScanner() {
    scanner = new Html5Qrcode("scanner-container");

    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => handleScan(decodedText)
    );
}

// =====================
// SCAN LOGIC (FIXED)
// =====================
function handleScan(code) {

    playSound();

    const product = products.find(p => p.sku === code);

    if (product) {
        showScanModal(product);
    } else {
        if (confirm("Product not found. Add new?")) {
            openAddProductForm();
            document.getElementById("form-sku").value = code;
            switchPage("products");
        }
    }
}

// =====================
// MODAL
// =====================
function showScanModal(p) {
    document.getElementById("scan-product-image").src = p.image;
    document.getElementById("scan-product-name").innerText = p.name;
    document.getElementById("scan-product-category").innerText = p.category;
    document.getElementById("scan-product-stock").innerText = p.totalPieces;
    document.getElementById("scan-product-expiry").innerText = p.expiryDate;
    document.getElementById("scan-product-sku").innerText = p.sku;
    document.getElementById("scan-product-carton").innerText = p.cartonPrice;
    document.getElementById("scan-product-piece").innerText = p.piecePrice;

    document.getElementById("scan-result-modal").classList.remove("hidden");
}

// =====================
function closeScanModal() {
    document.getElementById("scan-result-modal").classList.add("hidden");
}

// =====================
// SOUND
// =====================
function playSound() {
    document.getElementById("scan-sound").play();
             }
