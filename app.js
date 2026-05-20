// =====================
// GLOBAL STATE
// =====================
let currentPage = "dashboard";
let products = [];
let filter = "all";
let darkMode = true;

// =====================
// PAGE SWITCH
// =====================
function switchPage(page) {
    document.querySelectorAll(".page-view").forEach(p => p.classList.add("hidden"));
    document.getElementById("page-" + page).classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("text-primary");
        btn.classList.add("text-slate-500");
    });

    document.querySelectorAll(`[data-page="${page}"]`).forEach(btn => {
        btn.classList.add("text-primary");
        btn.classList.remove("text-slate-500");
    });

    currentPage = page;

    if (page === "dashboard") updateDashboard();
    if (page === "products") renderProducts();
    if (page === "scanner") initScanner();
}

// =====================
// THEME TOGGLE
// =====================
function toggleTheme() {
    darkMode = !darkMode;
    document.documentElement.classList.toggle("dark");
}

// =====================
// ADD PRODUCT (FIXED)
// =====================
function openAddProductForm() {
    const name = prompt("Product Name:");
    if (!name) return;

    const category = prompt("Category:");
    const stock = parseInt(prompt("Stock:")) || 0;
    const expiry = prompt("Expiry Date (YYYY-MM-DD):");
    const barcode = prompt("Barcode:");

    const product = {
        id: Date.now(),
        name,
        category,
        stock,
        expiry,
        barcode,
        carton: 100,
        piece: 10,
        image: "https://source.unsplash.com/400x300/?product"
    };

    products.push(product);
    renderProducts();
    updateDashboard();
}

// =====================
// FILTER
// =====================
function setFilter(f) {
    filter = f;
    document.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
    renderProducts();
}

// =====================
// RENDER PRODUCTS (FIXED)
// =====================
function renderProducts() {
    const grid = document.getElementById("product-grid");
    const search = document.getElementById("search-input")?.value.toLowerCase() || "";

    let filtered = products.filter(p => {
        let matchSearch =
            p.name.toLowerCase().includes(search) ||
            p.category.toLowerCase().includes(search) ||
            p.barcode.includes(search);

        let matchFilter =
            filter === "all" ||
            p.category === filter ||
            (filter === "expired" && isExpired(p)) ||
            (filter === "expiring" && isExpiring(p));

        return matchSearch && matchFilter;
    });

    grid.innerHTML = "";

    filtered.forEach(p => {
        grid.innerHTML += `
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 card-hover">
            <h3 class="text-xl font-black">${p.name}</h3>
            <p class="text-xs text-slate-500 uppercase">${p.category}</p>

            <div class="mt-4 flex justify-between text-sm">
                <span>Stock</span>
                <span class="font-black">${p.stock}</span>
            </div>

            <div class="mt-2 flex justify-between text-sm">
                <span>Expiry</span>
                <span class="text-yellow-400 font-black">${p.expiry}</span>
            </div>
        </div>`;
    });

    updateDashboard();
}

// =====================
// DASHBOARD FIX
// =====================
function updateDashboard() {
    document.getElementById("dash-total").innerText = products.length;

    let expired = products.filter(isExpired).length;
    let expiring = products.filter(isExpiring).length;

    document.getElementById("dash-expired").innerText = expired;
    document.getElementById("dash-expiring").innerText = expiring;
    document.getElementById("dash-category").innerText =
        [...new Set(products.map(p => p.category))].length;

    drawCharts();
}

// =====================
// DATE HELPERS
// =====================
function isExpired(p) {
    return new Date(p.expiry) < new Date();
}

function isExpiring(p) {
    let d = new Date(p.expiry);
    let now = new Date();
    let diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
}

// =====================
// CHARTS FIXED
// =====================
let stockChart, expiryChart;

function drawCharts() {
    let ctx1 = document.getElementById("stockChart");
    let ctx2 = document.getElementById("expiryChart");

    if (!ctx1 || !ctx2) return;

    let categories = {};
    products.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
    });

    let labels = Object.keys(categories);
    let data = Object.values(categories);

    if (stockChart) stockChart.destroy();
    if (expiryChart) expiryChart.destroy();

    stockChart = new Chart(ctx1, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Products",
                data
            }]
        }
    });

    expiryChart = new Chart(ctx2, {
        type: "doughnut",
        data: {
            labels: ["Expired", "Valid"],
            datasets: [{
                data: [
                    products.filter(isExpired).length,
                    products.length - products.filter(isExpired).length
                ]
            }]
        }
    });
}

// =====================
// SCANNER FIX
// =====================
let scanner;

function initScanner() {
    if (scanner) return;

    scanner = new Html5Qrcode("scanner-container");

    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            handleScan(decodedText);
        }
    );
}

// =====================
// SCAN RESULT
// =====================
function handleScan(code) {
    document.getElementById("scan-sound").play();

    let product = products.find(p => p.barcode === code);

    if (!product) {
        alert("Product not found!");
        return;
    }

    document.getElementById("scan-product-name").innerText = product.name;
    document.getElementById("scan-product-category").innerText = product.category;
    document.getElementById("scan-product-stock").innerText = product.stock;
    document.getElementById("scan-product-expiry").innerText = product.expiry;
    document.getElementById("scan-product-sku").innerText = product.barcode;
    document.getElementById("scan-product-carton").innerText = product.carton;
    document.getElementById("scan-product-piece").innerText = product.piece;

    document.getElementById("scan-result-modal").classList.remove("hidden");
    document.getElementById("scan-result-modal").classList.add("flex");
}

function closeScanModal() {
    document.getElementById("scan-result-modal").classList.add("hidden");
}

// =====================
// INIT
// =====================
window.onload = () => {
    switchPage("dashboard");

    // demo data
    products = [
        { id: 1, name: "Rice", category: "Grains", stock: 20, expiry: "2026-06-10", barcode: "111", carton: 120, piece: 12 },
        { id: 2, name: "Milk", category: "Dairy", stock: 5, expiry: "2026-05-22", barcode: "222", carton: 60, piece: 6 }
    ];

    renderProducts();
};
