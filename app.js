/**
 * STOCKIFY PRO - COMPLETE HYBRID ENGINE
 * Developer: Sabbir Hosen Akash
 */

/* =========================
   FIREBASE CONFIG
========================= */

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

/* =========================
   GLOBAL STATE
========================= */

let localProducts = [];
let currentFilter = "all";
let scannerInstance = null;
let stockChart = null;

/* =========================
   DEMO IMAGE
========================= */

const placeholderImage =
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=1200&auto=format&fit=crop";

/* =========================
   PAGE SWITCH
========================= */

window.switchPage = (page) => {

    document.querySelectorAll(".page-view").forEach(el => {
        el.classList.add("hidden");
    });

    document.getElementById(`page-${page}`).classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("text-primary");
        btn.classList.add("text-slate-500");
    });

    document.querySelectorAll(`[data-page="${page}"]`).forEach(btn => {
        btn.classList.remove("text-slate-500");
        btn.classList.add("text-primary");
    });

    if (page === "scanner") {
        startScanner();
    } else {
        stopScanner();
    }

    lucide.createIcons();
};

/* =========================
   THEME
========================= */

window.toggleTheme = () => {

    const html = document.documentElement;

    if (html.classList.contains("dark")) {

        html.classList.remove("dark");
        localStorage.setItem("theme", "light");

    } else {

        html.classList.add("dark");
        localStorage.setItem("theme", "dark");

    }

};

/* =========================
   LOAD THEME
========================= */

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
    document.documentElement.classList.remove("dark");
}

/* =========================
   FIREBASE SYNC
========================= */

async function syncProducts() {

    try {

        const snapshot = await firestore.collection("stockify_products").get();

        localProducts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderProducts();
        renderDashboard();

    } catch (err) {

        console.error(err);

    }

}

/* =========================
   FILTER
========================= */

window.setFilter = (filter) => {

    currentFilter = filter;

    document.querySelectorAll(".filter-chip").forEach(btn => {
        btn.classList.remove("active");
    });

    event.target.classList.add("active");

    renderProducts();

};

/* =========================
   RENDER PRODUCTS
========================= */

window.renderProducts = () => {

    const grid = document.getElementById("product-grid");

    const empty = document.getElementById("empty-products");

    const search =
        document.getElementById("search-input").value.toLowerCase();

    const today = new Date();

    let filtered = [...localProducts];

    filtered = filtered.filter(p => {

        const name = p.name?.toLowerCase() || "";
        const sku = p.sku || "";

        return (
            name.includes(search) ||
            sku.includes(search)
        );

    });

    /* FILTERS */

    if (currentFilter === "expired") {

        filtered = filtered.filter(p => {
            return new Date(p.expiryDate) < today;
        });

    }

    else if (currentFilter === "expiring") {

        filtered = filtered.filter(p => {

            const expiry = new Date(p.expiryDate);

            const diff =
                Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

            return diff >= 0 && diff <= 7;

        });

    }

    else if (currentFilter !== "all") {

        filtered = filtered.filter(p => {
            return p.category === currentFilter;
        });

    }

    /* EMPTY */

    if (filtered.length === 0) {

        grid.innerHTML = "";
        empty.classList.remove("hidden");
        return;

    }

    empty.classList.add("hidden");

    grid.innerHTML = filtered.map(p => {

        const expiry = new Date(p.expiryDate);

        const isExpired = expiry < today;

        const daysLeft =
            Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        return `

        <div class="bg-slate-900 border ${isExpired ? "border-red-500/30" : "border-slate-800"}
            rounded-[2rem] overflow-hidden shadow-xl card-hover">

            <div class="relative h-56 overflow-hidden">

                <img src="${p.image || placeholderImage}"
                    class="w-full h-full object-cover">

                ${isExpired
                ? `<div class="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black px-3 py-2 rounded-full uppercase">
                        Expired
                   </div>`
                : daysLeft <= 7
                    ? `<div class="absolute top-4 right-4 bg-yellow-400 text-black text-[10px] font-black px-3 py-2 rounded-full uppercase">
                        ${daysLeft} Days Left
                       </div>`
                    : ""
            }

            </div>

            <div class="p-5">

                <div class="flex justify-between items-start gap-3 mb-3">

                    <div>

                        <h2 class="text-xl font-black line-clamp-1">
                            ${p.name}
                        </h2>

                        <p class="text-xs text-slate-500 font-bold mt-1">
                            SKU: ${p.sku}
                        </p>

                    </div>

                    <span class="bg-primary/10 text-primary px-3 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap">
                        ${p.category}
                    </span>

                </div>

                <div class="grid grid-cols-3 gap-3 mb-5">

                    <div class="bg-slate-800 rounded-2xl p-3 text-center">

                        <p class="text-[10px] text-slate-500 font-black uppercase mb-1">
                            Stock
                        </p>

                        <h3 class="font-black text-lg">
                            ${p.totalPieces || 0}
                        </h3>

                    </div>

                    <div class="bg-slate-800 rounded-2xl p-3 text-center">

                        <p class="text-[10px] text-slate-500 font-black uppercase mb-1">
                            CTN
                        </p>

                        <h3 class="font-black text-lg">
                            ${p.cartonPrice || 0}
                        </h3>

                    </div>

                    <div class="bg-slate-800 rounded-2xl p-3 text-center">

                        <p class="text-[10px] text-slate-500 font-black uppercase mb-1">
                            PCS
                        </p>

                        <h3 class="font-black text-lg text-primary">
                            ${p.piecePrice || 0}
                        </h3>

                    </div>

                </div>

                <div class="flex gap-3">

                    <button onclick="editProduct('${p.id}')"
                        class="flex-1 bg-primary text-black py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">

                        Edit

                    </button>

                    <button onclick="deleteProduct('${p.id}')"
                        class="bg-red-500/10 border border-red-500/20 text-red-400 px-5 rounded-2xl active:scale-95 transition-all">

                        <i data-lucide="trash-2" class="w-5 h-5"></i>

                    </button>

                </div>

            </div>

        </div>

        `;

    }).join("");

    lucide.createIcons();

};

/* =========================
   DASHBOARD
========================= */

window.renderDashboard = () => {

    const today = new Date();

    let expired = 0;
    let expiring = 0;

    const categories = new Set();

    localProducts.forEach(p => {

        categories.add(p.category);

        const expiry = new Date(p.expiryDate);

        const diff =
            Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (expiry < today) {

            expired++;

        } else if (diff <= 7) {

            expiring++;

        }

    });

    document.getElementById("dash-total").innerText =
        localProducts.length;

    document.getElementById("dash-expired").innerText =
        expired;

    document.getElementById("dash-expiring").innerText =
        expiring;

    document.getElementById("dash-category").innerText =
        categories.size;

    renderChart();

};

/* =========================
   CHART
========================= */

function renderChart() {

    const ctx = document.getElementById("stockChart");

    if (!ctx) return;

    const chartEmpty =
        document.getElementById("chart-empty");

    if (localProducts.length === 0) {

        chartEmpty.classList.remove("hidden");

        return;

    }

    chartEmpty.classList.add("hidden");

    const categoryCount = {};

    localProducts.forEach(p => {

        categoryCount[p.category] =
            (categoryCount[p.category] || 0) + 1;

    });

    const labels = Object.keys(categoryCount);

    const data = Object.values(categoryCount);

    if (stockChart) {

        stockChart.destroy();

    }

    stockChart = new Chart(ctx, {

        type: "doughnut",

        data: {

            labels,

            datasets: [{

                data,

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

/* =========================
   EDIT PRODUCT
========================= */

window.editProduct = async (id) => {

    const product =
        localProducts.find(p => p.id === id);

    if (!product) return;

    const newName =
        prompt("Edit Product Name", product.name);

    if (newName === null) return;

    const newStock =
        prompt("Edit Total Stock", product.totalPieces);

    if (newStock === null) return;

    try {

        await firestore
            .collection("stockify_products")
            .doc(id)
            .update({

                name: newName,
                totalPieces: newStock

            });

        syncProducts();

    } catch (err) {

        alert(err.message);

    }

};

/* =========================
   DELETE PRODUCT
========================= */

window.deleteProduct = async (id) => {

    const confirmDelete =
        confirm("Delete this product permanently?");

    if (!confirmDelete) return;

    try {

        await firestore
            .collection("stockify_products")
            .doc(id)
            .delete();

        syncProducts();

    } catch (err) {

        alert(err.message);

    }

};

/* =========================
   ADD PRODUCT
========================= */

window.openAddProductForm = async (barcode = "") => {

    const name =
        prompt("Enter Product Name");

    if (!name) return;

    const category =
        prompt("Category (Dairy / Grains / Beverages)");

    const stock =
        prompt("Total Stock");

    const cartonPrice =
        prompt("Carton Price");

    const piecePrice =
        prompt("Piece Price");

    const expiryDate =
        prompt("Expiry Date (YYYY-MM-DD)");

    const payload = {

        name,
        category,
        sku: barcode || Date.now().toString(),
        totalPieces: stock,
        cartonPrice,
        piecePrice,
        expiryDate,
        image: placeholderImage,
        createdAt: Date.now()

    };

    try {

        await firestore
            .collection("stockify_products")
            .add(payload);

        syncProducts();

    } catch (err) {

        alert(err.message);

    }

};

/* =========================
   SCANNER SOUND
========================= */

function playScanSound() {

    const sound =
        document.getElementById("scan-sound");

    sound.currentTime = 0;

    sound.play();

}

/* =========================
   START SCANNER
========================= */

window.startScanner = async () => {

    if (scannerInstance) return;

    scannerInstance =
        new Html5Qrcode("scanner-container");

    const config = {

        fps: 15,
        qrbox: 250

    };

    try {

        await scannerInstance.start(

            { facingMode: "environment" },

            config,

            async (decodedText) => {

                playScanSound();

                document
                    .getElementById("scan-success")
                    .classList.remove("hidden");

                setTimeout(() => {

                    document
                        .getElementById("scan-success")
                        .classList.add("hidden");

                }, 1200);

                const match =
                    localProducts.find(
                        p => p.sku === decodedText
                    );

                if (match) {

                    alert(
                        `Product Found\n\n${match.name}\nStock: ${match.totalPieces}`
                    );

                } else {

                    const addNew =
                        confirm(
                            `Product Not Found\n\nBarcode: ${decodedText}\n\nAdd New Product?`
                        );

                    if (addNew) {

                        openAddProductForm(decodedText);

                    }

                }

            }

        );

    } catch (err) {

        console.error(err);

    }

};

/* =========================
   STOP SCANNER
========================= */

window.stopScanner = async () => {

    try {

        if (scannerInstance) {

            await scannerInstance.stop();

            await scannerInstance.clear();

            scannerInstance = null;

        }

    } catch (err) {

        console.log(err);

    }

};

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", async () => {

    await syncProducts();

    switchPage("dashboard");

    lucide.createIcons();

});
