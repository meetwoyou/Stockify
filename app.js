/**
 * STOCKIFY ULTRA FINAL
 * Developer: Sabbir Hosen Akash
 */

// =======================
// FIREBASE
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
// GLOBAL
// =======================

let localProducts = [];

let localDB;

let currentFilter = "all";

let scanner = null;

let chart1 = null;

let chart2 = null;

// =======================
// INDEXED DB
// =======================

async function initDB() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open("StockifyUltra", 1);

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

        request.onerror = reject;

    });

}

// =======================
// SYNC
// =======================

async function syncData() {

    try {

        const snapshot = await firestore
            .collection("stockify_products")
            .get();

        localProducts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderProducts();

        renderDashboard();

    } catch (err) {

        console.log(err);

    }

}

// =======================
// PAGE
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

            if (btn.dataset.page === page) {

                btn.classList.add("text-primary");

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
// FORM OPEN
// =======================

window.openAddProductForm = (barcode = "") => {

    document
        .getElementById("products-form-view")
        .classList.remove("hidden");

    document.getElementById("product-form").reset();

    document.getElementById("form-id").value = "";

    document.getElementById("form-sku").value = barcode;

};

window.closeProductForm = () => {

    document
        .getElementById("products-form-view")
        .classList.add("hidden");

};

// =======================
// IMAGE
// =======================

window.handleFormImage = (input) => {

    if (!input.files[0]) return;

    const reader = new FileReader();

    reader.onload = (e) => {

        const img =
            document.getElementById("form-img-output");

        img.src = e.target.result;

        img.classList.remove("hidden");

    };

    reader.readAsDataURL(input.files[0]);

};

// =======================
// CALCULATION
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

    try {

        let imageUrl = "";

        const file =
            document.querySelector('input[type="file"]').files[0];

        // upload image
        if (file) {

            const formData = new FormData();

            formData.append("file", file);

            formData.append("upload_preset", CLOUDINARY_PRESET);

            const response = await fetch(CLOUDINARY_URL, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            imageUrl = data.secure_url;

        }

        const id =
            document.getElementById("form-id").value ||
            Date.now().toString();

        const old =
            localProducts.find(p => p.id === id);

        const payload = {

            id,

            name:
                document.getElementById("form-name").value,

            sku:
                document.getElementById("form-sku").value,

            category:
                document.getElementById("form-category").value,

            cartons:
                document.getElementById("form-cartons").value,

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

            image:
                imageUrl || old?.image || ""

        };

        await firestore
            .collection("stockify_products")
            .doc(id)
            .set(payload);

        closeProductForm();

        syncData();

        alert("Product Saved");

    } catch (err) {

        alert(err.message);

    }

};

// =======================
// RENDER PRODUCTS
// =======================

window.renderProducts = () => {

    const grid =
        document.getElementById("product-grid");

    if (!grid) return;

    const search =
        document.getElementById("search-input")
        ?.value
        ?.toLowerCase() || "";

    const today = new Date();

    let products = localProducts.filter(p => {

        return (
            p.name.toLowerCase().includes(search) ||
            p.sku.includes(search)
        );

    });

    if (currentFilter === "expired") {

        products = products.filter(
            p => new Date(p.expiryDate) < today
        );

    }

    if (currentFilter === "expiring") {

        products = products.filter(p => {

            const diff =
                (new Date(p.expiryDate) - today) /
                (1000 * 60 * 60 * 24);

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

    grid.innerHTML = products.map(p => {

        return `

        <div class="bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800">

            <div class="h-60 overflow-hidden">

                <img src="${p.image}"
                    class="w-full h-full object-cover">

            </div>

            <div class="p-5">

                <div class="flex justify-between mb-4">

                    <div>

                        <h2 class="text-2xl font-black">
                            ${p.name}
                        </h2>

                        <p class="text-xs text-slate-500 mt-1 uppercase">
                            ${p.category}
                        </p>

                    </div>

                    <div class="text-primary font-black">
                        ${p.totalPieces} pcs
                    </div>

                </div>

                <div class="space-y-2 text-sm mb-5">

                    <div class="flex justify-between">
                        <span>Barcode</span>
                        <span>${p.sku}</span>
                    </div>

                    <div class="flex justify-between">
                        <span>Expiry</span>
                        <span class="text-yellow-400">
                            ${p.expiryDate}
                        </span>
                    </div>

                </div>

                <div class="grid grid-cols-2 gap-3">

                    <button onclick="editProduct('${p.id}')"
                        class="bg-primary text-black py-4 rounded-2xl font-black">

                        Edit

                    </button>

                    <button onclick="deleteProduct('${p.id}')"
                        class="bg-red-500/10 text-red-400 py-4 rounded-2xl font-black">

                        Delete

                    </button>

                </div>

            </div>

        </div>

        `;

    }).join("");

};

// =======================
// EDIT
// =======================

window.editProduct = (id) => {

    const p =
        localProducts.find(x => x.id === id);

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

    const img =
        document.getElementById("form-img-output");

    img.src = p.image;

    img.classList.remove("hidden");

};

// =======================
// DELETE
// =======================

window.deleteProduct = async (id) => {

    const ok =
        confirm("Delete product permanently?");

    if (!ok) return;

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

    const cat = {};

    localProducts.forEach(p => {

        const exp =
            new Date(p.expiryDate);

        const diff =
            (exp - today) /
            (1000 * 60 * 60 * 24);

        if (exp < today) expired++;

        if (diff <= 7 && diff >= 0) expiring++;

        cat[p.category] =
            (cat[p.category] || 0) + 1;

    });

    document.getElementById("dash-total").innerText =
        localProducts.length;

    document.getElementById("dash-expired").innerText =
        expired;

    document.getElementById("dash-expiring").innerText =
        expiring;

    document.getElementById("dash-category").innerText =
        Object.keys(cat).length;

};

// =======================
// SCANNER
// =======================

window.startScanner = async () => {

    if (scanner) return;

    scanner =
        new Html5Qrcode("scanner-container");

    try {

        await scanner.start(

            {
                facingMode: "environment"
            },

            {
                fps: 10,
                qrbox: 250
            },

            (decoded) => {

                document
                    .getElementById("scan-sound")
                    .play();

                const product =
                    localProducts.find(
                        p => p.sku === decoded
                    );

                // FOUND
                if (product) {

                    showScanResult(product);

                }

                // NOT FOUND
                else {

                    stopScanner();

                    const add =
                        confirm(
                            "Product Not Found\n\nAdd New Product?"
                        );

                    if (add) {

                        switchPage("products");

                        openAddProductForm(decoded);

                    }

                }

            }

        );

    } catch (err) {

        console.log(err);

    }

};

window.stopScanner = async () => {

    if (!scanner) return;

    await scanner.stop();

    scanner = null;

};

// =======================
// SCAN RESULT
// =======================

window.showScanResult = (p) => {

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

    await initDB();

    await syncData();

    lucide.createIcons();

});
