/**
 * STOCKIFY PRO ULTRA
 * FULL UPGRADED ENGINE
 * Developer: Sabbir Hosen Akash
 */

// =======================
// FIREBASE CONFIG
// =======================

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

// =======================
// CLOUDINARY
// =======================

const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload";

const CLOUDINARY_PRESET = "Meetwoyou";

// =======================
// GLOBALS
// =======================

let localProducts = [];

let localDB;

let currentFilter = "all";

let scannerInstance = null;

let stockChart = null;

let expiryChart = null;

// =======================
// INDEXED DB
// =======================

async function initDB() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open("StockifyUltraDB", 1);

        request.onupgradeneeded = (e) => {

            const db = e.target.result;

            if (!db.objectStoreNames.contains("products")) {

                db.createObjectStore("products", {
                    keyPath: "id"
                });

            }

        };

        request.onsuccess = (e) => {

            localDB = e.target.result;

            resolve();

        };

        request.onerror = (e) => reject(e);

    });

}

// =======================
// LOAD PRODUCTS
// =======================

async function syncData() {

    try {

        // LOCAL LOAD
        const tx = localDB.transaction("products", "readonly");

        const store = tx.objectStore("products");

        const request = store.getAll();

        request.onsuccess = async () => {

            localProducts = request.result || [];

            renderProducts();

            renderDashboard();

            // CLOUD LOAD
            try {

                const snapshot = await firestore
                    .collection("stockify_products")
                    .get();

                const cloudData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                localProducts = cloudData;

                const updateTx = localDB.transaction("products", "readwrite");

                const updateStore = updateTx.objectStore("products");

                cloudData.forEach(p => updateStore.put(p));

                renderProducts();

                renderDashboard();

            } catch (err) {

                console.log("Offline Mode");

            }

        };

    } catch (err) {

        console.log(err);

    }

}

// =======================
// SWITCH PAGE
// =======================

window.switchPage = (page) => {

    document.querySelectorAll(".page-view")
        .forEach(p => p.classList.add("hidden"));

    document
        .getElementById(`page-${page}`)
        .classList.remove("hidden");

    document.querySelectorAll(".nav-btn")
        .forEach(btn => {

            btn.classList.remove("text-primary");

            btn.classList.add("text-slate-500");

            if (btn.dataset.page === page) {

                btn.classList.add("text-primary");

                btn.classList.remove("text-slate-500");

            }

        });

    if (page === "scanner") {

        startScanner();

    } else {

        stopScanner();

    }

};

// =======================
// THEME
// =======================

window.toggleTheme = () => {

    document.documentElement.classList.toggle("dark");

    localStorage.setItem(
        "theme",
        document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
    );

};

// =======================
// FILTER
// =======================

window.setFilter = (filter) => {

    currentFilter = filter;

    document.querySelectorAll(".filter-chip")
        .forEach(btn => btn.classList.remove("active"));

    event.target.classList.add("active");

    renderProducts();

};

// =======================
// ADD PRODUCT FORM
// =======================

window.openAddProductForm = (barcode = "") => {

    const form = document.getElementById("products-form-view");

    if (!form) return;

    form.classList.remove("hidden");

    document.getElementById("form-sku").value = barcode;

};

window.closeProductForm = () => {

    document
        .getElementById("products-form-view")
        .classList.add("hidden");

};

// =======================
// IMAGE PREVIEW
// =======================

window.handleFormImage = (input) => {

    if (!input.files[0]) return;

    const reader = new FileReader();

    reader.onload = (e) => {

        const img = document.getElementById("form-img-output");

        img.src = e.target.result;

        img.classList.remove("hidden");

        document
            .getElementById("image-placeholder")
            .classList.add("hidden");

    };

    reader.readAsDataURL(input.files[0]);

};

// =======================
// CALCULATE
// =======================

window.calculateTotalPieces = () => {

    const cartons =
        parseInt(document.getElementById("form-cartons").value) || 0;

    const per =
        parseInt(document.getElementById("form-pcs-per").value) || 1;

    document.getElementById("form-total-pcs").value =
        cartons * per;

};

window.calculatePrices = (type) => {

    const carton =
        parseFloat(document.getElementById("form-carton-price").value) || 0;

    const piece =
        parseFloat(document.getElementById("form-piece-price").value) || 0;

    const per =
        parseInt(document.getElementById("form-pcs-per").value) || 1;

    if (type === "carton") {

        document.getElementById("form-piece-price").value =
            (carton / per).toFixed(2);

    } else {

        document.getElementById("form-carton-price").value =
            (piece * per).toFixed(2);

    }

};

// =======================
// SAVE PRODUCT
// =======================

window.saveProduct = async (e) => {

    e.preventDefault();

    const saveBtn = document.getElementById("save-btn");

    saveBtn.innerText = "Syncing...";

    saveBtn.disabled = true;

    try {

        let imageUrl =
            document.getElementById("form-img-output").src;

        const fileInput = document.querySelector(
            'input[type="file"]'
        );

        // CLOUDINARY
        if (fileInput.files[0]) {

            const data = new FormData();

            data.append("file", fileInput.files[0]);

            data.append("upload_preset", CLOUDINARY_PRESET);

            const upload = await fetch(CLOUDINARY_URL, {
                method: "POST",
                body: data
            });

            const result = await upload.json();

            imageUrl = result.secure_url;

        }

        const id =
            document.getElementById("form-id").value ||
            Date.now().toString();

        const payload = {

            id,

            name: document.getElementById("form-name").value,

            sku: document.getElementById("form-sku").value,

            category: document.getElementById("form-category").value,

            cartons: document.getElementById("form-cartons").value,

            pcsPerCarton:
                document.getElementById("form-pcs-per").value,

            totalPieces:
                document.getElementById("form-total-pcs").value,

            cartonPrice:
                document.getElementById("form-carton-price").value,

            piecePrice:
                document.getElementById("form-piece-price").value,

            expiryDate:
                document.getElementById("form-expiry").value,

            image: imageUrl,

            updatedAt: Date.now()

        };

        // LOCAL
        const tx = localDB.transaction("products", "readwrite");

        tx.objectStore("products").put(payload);

        // FIREBASE
        await firestore
            .collection("stockify_products")
            .doc(id)
            .set(payload);

        closeProductForm();

        syncData();

    } catch (err) {

        alert(err.message);

    }

    saveBtn.innerText = "Save Product";

    saveBtn.disabled = false;

};

// =======================
// RENDER PRODUCTS
// =======================

window.renderProducts = () => {

    const grid = document.getElementById("product-grid");

    if (!grid) return;

    const search =
        document.getElementById("search-input")
        ?.value
        ?.toLowerCase() || "";

    const today = new Date();

    let products = localProducts.filter(p => {

        return (
            p.name.toLowerCase().includes(search) ||
            p.sku.includes(search) ||
            p.category.toLowerCase().includes(search)
        );

    });

    if (currentFilter === "expired") {

        products = products.filter(
            p => new Date(p.expiryDate) < today
        );

    }

    if (currentFilter === "expiring") {

        products = products.filter(p => {

            const exp = new Date(p.expiryDate);

            const diff =
                (exp - today) / (1000 * 60 * 60 * 24);

            return diff <= 7 && diff >= 0;

        });

    }

    if (
        currentFilter !== "all" &&
        currentFilter !== "expired" &&
        currentFilter !== "expiring"
    ) {

        products = products.filter(
            p => p.category === currentFilter
        );

    }

    if (products.length === 0) {

        grid.innerHTML = `
        <div class="col-span-full text-center py-24">
            <i data-lucide="package-search" class="w-16 h-16 mx-auto text-slate-700 mb-4"></i>
            <h2 class="text-2xl font-black text-slate-400">
                No Product Found
            </h2>
        </div>
        `;

        lucide.createIcons();

        return;

    }

    grid.innerHTML = products.map(p => {

        const expired =
            new Date(p.expiryDate) < today;

        return `
        
        <div class="bg-slate-900 border ${expired ? 'border-red-500/30' : 'border-slate-800'} rounded-[2rem] overflow-hidden shadow-2xl card-hover">

            <div class="relative h-60 overflow-hidden">

                <img src="${p.image}"
                    class="w-full h-full object-cover">

                ${expired ? `
                    <div class="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] uppercase font-black">
                        Expired
                    </div>
                ` : ''}

            </div>

            <div class="p-5">

                <div class="flex justify-between gap-3 mb-4">

                    <div>

                        <h2 class="text-2xl font-black line-clamp-1">
                            ${p.name}
                        </h2>

                        <p class="text-xs uppercase tracking-widest text-slate-500 font-black mt-2">
                            ${p.category}
                        </p>

                    </div>

                    <div class="bg-primary/10 text-primary px-3 py-2 rounded-2xl text-xs font-black h-fit">
                        ${p.totalPieces} pcs
                    </div>

                </div>

                <div class="space-y-2 mb-5 text-sm">

                    <div class="flex justify-between">
                        <span class="text-slate-400">Barcode</span>
                        <span class="font-black">${p.sku}</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="text-slate-400">Carton Price</span>
                        <span class="font-black text-primary">
                            SAR ${p.cartonPrice}
                        </span>
                    </div>

                    <div class="flex justify-between">
                        <span class="text-slate-400">Piece Price</span>
                        <span class="font-black text-primary">
                            SAR ${p.piecePrice}
                        </span>
                    </div>

                    <div class="flex justify-between">
                        <span class="text-slate-400">Expiry</span>
                        <span class="font-black text-yellow-400">
                            ${p.expiryDate}
                        </span>
                    </div>

                </div>

                <div class="grid grid-cols-2 gap-3">

                    <button onclick="editProduct('${p.id}')"
                        class="bg-primary text-black py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">

                        Edit

                    </button>

                    <button onclick="deleteProduct('${p.id}')"
                        class="bg-red-500/10 text-red-400 py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">

                        Delete

                    </button>

                </div>

            </div>

        </div>

        `;

    }).join("");

    lucide.createIcons();

};

// =======================
// EDIT PRODUCT
// =======================

window.editProduct = (id) => {

    const p = localProducts.find(x => x.id === id);

    if (!p) return;

    openAddProductForm();

    document.getElementById("form-id").value = p.id;

    document.getElementById("form-name").value = p.name;

    document.getElementById("form-sku").value = p.sku;

    document.getElementById("form-category").value =
        p.category;

    document.getElementById("form-cartons").value =
        p.cartons;

    document.getElementById("form-pcs-per").value =
        p.pcsPerCarton;

    document.getElementById("form-total-pcs").value =
        p.totalPieces;

    document.getElementById("form-carton-price").value =
        p.cartonPrice;

    document.getElementById("form-piece-price").value =
        p.piecePrice;

    document.getElementById("form-expiry").value =
        p.expiryDate;

    document.getElementById("form-img-output").src =
        p.image;

    document.getElementById("form-img-output")
        .classList.remove("hidden");

};

// =======================
// DELETE
// =======================

window.deleteProduct = async (id) => {

    const confirmDelete =
        confirm("Delete this product permanently?");

    if (!confirmDelete) return;

    // LOCAL
    const tx = localDB.transaction("products", "readwrite");

    tx.objectStore("products").delete(id);

    // FIREBASE
    await firestore
        .collection("stockify_products")
        .doc(id)
        .delete();

    syncData();

};

// =======================
// DASHBOARD
// =======================

window.renderDashboard = () => {

    const today = new Date();

    let expired = 0;

    let expiring = 0;

    const categoryMap = {};

    localProducts.forEach(p => {

        const exp = new Date(p.expiryDate);

        const diff =
            (exp - today) / (1000 * 60 * 60 * 24);

        if (exp < today) expired++;

        if (diff <= 7 && diff >= 0) expiring++;

        categoryMap[p.category] =
            (categoryMap[p.category] || 0) + 1;

    });

    document.getElementById("dash-total").innerText =
        localProducts.length;

    document.getElementById("dash-expired").innerText =
        expired;

    document.getElementById("dash-expiring").innerText =
        expiring;

    document.getElementById("dash-category").innerText =
        Object.keys(categoryMap).length;

    // CATEGORY CHART
    const ctx =
        document.getElementById("stockChart");

    if (ctx) {

        if (stockChart) stockChart.destroy();

        stockChart = new Chart(ctx, {

            type: "doughnut",

            data: {

                labels: Object.keys(categoryMap),

                datasets: [{
                    data: Object.values(categoryMap),
                    borderWidth: 0
                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        labels: {
                            color: "#fff"
                        }
                    }

                }

            }

        });

    }

    // EXPIRY CHART
    const expCtx =
        document.getElementById("expiryChart");

    if (expCtx) {

        if (expiryChart) expiryChart.destroy();

        expiryChart = new Chart(expCtx, {

            type: "bar",

            data: {

                labels: [
                    "Expired",
                    "7 Days Left",
                    "Safe"
                ],

                datasets: [{
                    data: [
                        expired,
                        expiring,
                        localProducts.length -
                        expired -
                        expiring
                    ]
                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    y: {

                        ticks: {
                            color: "#fff"
                        }

                    },

                    x: {

                        ticks: {
                            color: "#fff"
                        }

                    }

                }

            }

        });

    }

};

// =======================
// SCANNER
// =======================

window.startScanner = async () => {

    if (scannerInstance) return;

    scannerInstance =
        new Html5Qrcode("scanner-container");

    try {

        await scannerInstance.start(

            {
                facingMode: "environment"
            },

            {
                fps: 10,
                qrbox: 250
            },

            (decodedText) => {

                document
                    .getElementById("scan-sound")
                    .play();

                const product =
                    localProducts.find(
                        p => p.sku === decodedText
                    );

                if (product) {

                    showScanProduct(product);

                } else {

                    stopScanner();

                    const add =
                        confirm(
                            "Product Not Found\n\nAdd New Product?"
                        );

                    if (add) {

                        switchPage("products");

                        openAddProductForm(decodedText);

                    }

                }

            }

        );

    } catch (err) {

        console.log(err);

    }

};

// =======================
// STOP SCANNER
// =======================

window.stopScanner = async () => {

    if (!scannerInstance) return;

    try {

        await scannerInstance.stop();

        scannerInstance = null;

    } catch (err) {

        console.log(err);

    }

};

// =======================
// SHOW SCAN PRODUCT
// =======================

window.showScanProduct = (p) => {

    stopScanner();

    document
        .getElementById("scan-result-modal")
        .classList.remove("hidden");

    document
        .getElementById("scan-result-modal")
        .classList.add("flex");

    document.getElementById("scan-product-image").src =
        p.image;

    document.getElementById("scan-product-name").innerText =
        p.name;

    document.getElementById("scan-product-category").innerText =
        p.category;

    document.getElementById("scan-product-stock").innerText =
        p.totalPieces + " pcs";

    document.getElementById("scan-product-expiry").innerText =
        p.expiryDate;

    document.getElementById("scan-product-sku").innerText =
        p.sku;

    document.getElementById("scan-product-carton").innerText =
        "SAR " + p.cartonPrice;

    document.getElementById("scan-product-piece").innerText =
        "SAR " + p.piecePrice;

};

// =======================
// CLOSE SCAN MODAL
// =======================

window.closeScanModal = () => {

    document
        .getElementById("scan-result-modal")
        .classList.add("hidden");

    startScanner();

};

// =======================
// INIT
// =======================

document.addEventListener("DOMContentLoaded", async () => {

    if (localStorage.getItem("theme") === "light") {

        document.documentElement.classList.remove("dark");

    }

    await initDB();

    await syncData();

    lucide.createIcons();

});
