/* =========================
   STOCKIFY PRO ULTRA JS FIXED
   ========================= */

let products = JSON.parse(localStorage.getItem("products")) || [];
let currentFilter = "all";
let currentPage = "dashboard";
let chart1, chart2;

/* -------------------------
   INIT
------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    renderProducts();
    updateDashboard();
    initCharts();
    initScanner();
    applyTheme();
});

/* -------------------------
   PAGE SWITCH
------------------------- */
function switchPage(page) {
    currentPage = page;

    document.querySelectorAll(".page-view").forEach(p => p.classList.add("hidden"));
    document.getElementById("page-" + page).classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("text-primary");
        btn.classList.add("text-slate-500");
    });

    document.querySelectorAll(`[data-page="${page}"]`).forEach(btn => {
        btn.classList.add("text-primary");
    });

    lucide.createIcons();
}

/* -------------------------
   ADD PRODUCT MODAL
------------------------- */
function openAddProductForm(editId = null) {
    const product = editId ? products.find(p => p.id === editId) : {};

    const modal = document.createElement("div");
    modal.id = "product-modal";
    modal.className = "fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4";

    modal.innerHTML = `
    <div class="bg-slate-900 p-6 rounded-3xl w-full max-w-md space-y-3 border border-slate-700">
        <h2 class="text-xl font-bold">${editId ? "Edit Product" : "Add Product"}</h2>

        <input id="p-name" class="w-full p-3 bg-slate-800 rounded-xl" placeholder="Product Name" value="${product.name || ""}">
        <input id="p-barcode" class="w-full p-3 bg-slate-800 rounded-xl" placeholder="Barcode" value="${product.barcode || ""}">
        <input id="p-stock" type="number" class="w-full p-3 bg-slate-800 rounded-xl" placeholder="Stock" value="${product.stock || ""}">
        <input id="p-price" type="number" class="w-full p-3 bg-slate-800 rounded-xl" placeholder="Price" value="${product.price || ""}">
        <input id="p-expiry" type="date" class="w-full p-3 bg-slate-800 rounded-xl" value="${product.expiry || ""}">
        <input id="p-category" class="w-full p-3 bg-slate-800 rounded-xl" placeholder="Category" value="${product.category || ""}">

        <div class="flex gap-2">
            <button onclick="saveProduct('${editId || ""}')" class="flex-1 bg-green-500 text-black py-3 rounded-xl font-bold">Save</button>
            <button onclick="closeModal()" class="flex-1 bg-red-500 py-3 rounded-xl font-bold">Close</button>
        </div>
    </div>
    `;

    document.body.appendChild(modal);
}

function closeModal() {
    const m = document.getElementById("product-modal");
    if (m) m.remove();
}

/* -------------------------
   SAVE PRODUCT (ADD / EDIT)
------------------------- */
function saveProduct(id) {
    const data = {
        id: id || Date.now().toString(),
        name: document.getElementById("p-name").value,
        barcode: document.getElementById("p-barcode").value,
        stock: document.getElementById("p-stock").value,
        price: document.getElementById("p-price").value,
        expiry: document.getElementById("p-expiry").value,
        category: document.getElementById("p-category").value
    };

    if (!id) {
        products.push(data);
    } else {
        products = products.map(p => p.id === id ? data : p);
    }

    localStorage.setItem("products", JSON.stringify(products));

    closeModal();
    renderProducts();
    updateDashboard();
}

/* -------------------------
   DELETE
------------------------- */
function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    localStorage.setItem("products", JSON.stringify(products));
    renderProducts();
    updateDashboard();
}

/* -------------------------
   EDIT
------------------------- */
function editProduct(id) {
    openAddProductForm(id);
}

/* -------------------------
   RENDER PRODUCTS
------------------------- */
function renderProducts() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    let list = [...products];

    const search = document.getElementById("search-input")?.value || "";

    if (search) {
        list = list.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.barcode.includes(search)
        );
    }

    if (currentFilter !== "all") {
        list = list.filter(p => p.category === currentFilter);
    }

    grid.innerHTML = list.map(p => `
        <div class="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-2">
            <h3 class="text-xl font-bold">${p.name}</h3>
            <p class="text-xs text-slate-400">Barcode: ${p.barcode}</p>
            <p>Stock: ${p.stock}</p>
            <p>Price: ${p.price}</p>
            <p>Expiry: ${p.expiry}</p>
            <p class="text-primary">${p.category}</p>

            <div class="flex gap-2 mt-3">
                <button onclick="editProduct('${p.id}')" class="flex-1 bg-blue-500 py-2 rounded-xl">Edit</button>
                <button onclick="deleteProduct('${p.id}')" class="flex-1 bg-red-500 py-2 rounded-xl">Delete</button>
            </div>
        </div>
    `).join("");

    updateDashboard();
}

/* -------------------------
   FILTER
------------------------- */
function setFilter(val) {
    currentFilter = val;
    renderProducts();
}

/* -------------------------
   DASHBOARD
------------------------- */
function updateDashboard() {
    document.getElementById("dash-total").innerText = products.length;
}

/* -------------------------
   THEME TOGGLE
------------------------- */
function toggleTheme() {
    document.documentElement.classList.toggle("dark");

    const mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", mode);
}

function applyTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") document.documentElement.classList.remove("dark");
}

/* -------------------------
   CHARTS (SAFE)
------------------------- */
function initCharts() {
    const ctx1 = document.getElementById("stockChart");
    const ctx2 = document.getElementById("expiryChart");

    if (!ctx1 || !ctx2) return;

    chart1 = new Chart(ctx1, {
        type: "bar",
        data: {
            labels: ["Grains", "Dairy", "Snacks"],
            datasets: [{
                label: "Stock",
                data: [5, 10, 3]
            }]
        }
    });

    chart2 = new Chart(ctx2, {
        type: "pie",
        data: {
            labels: ["Expired", "Active"],
            datasets: [{
                data: [2, 10]
            }]
        }
    });
}

/* -------------------------
   SCANNER FIXED
------------------------- */
function initScanner() {
    const scanner = new Html5Qrcode("scanner-container");

    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            scanner.start(
                devices[0].id,
                { fps: 10, qrbox: 250 },
                (code) => handleScan(code)
            );
        }
    }).catch(err => console.log(err));
}

/* -------------------------
   SCAN RESULT LOGIC
------------------------- */
function handleScan(barcode) {
    const found = products.find(p => p.barcode === barcode);

    if (found) {
        showScanModal(found);
    } else {
        const create = confirm("Product not found. Add new?");
        if (create) {
            openAddProductForm();
        }
    }
}

function showScanModal(p) {
    document.getElementById("scan-product-name").innerText = p.name;
    document.getElementById("scan-product-category").innerText = p.category;
    document.getElementById("scan-product-stock").innerText = p.stock;
    document.getElementById("scan-product-expiry").innerText = p.expiry;
    document.getElementById("scan-product-sku").innerText = p.barcode;
    document.getElementById("scan-product-piece").innerText = p.price;

    document.getElementById("scan-result-modal").classList.remove("hidden");
    document.getElementById("scan-result-modal").classList.add("flex");
}

function closeScanModal() {
    document.getElementById("scan-result-modal").classList.add("hidden");
}
