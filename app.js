/**
 * STOCKIFY PRO - ULTIMATE WEB APP ENGINE
 * Optimized for Mobile + Desktop
 */

// ============================
// FIREBASE CONFIG
// ============================

const firebaseConfig = {
    apiKey: "AIzaSyBn3x2qSo8k6a9wrxNfLmVliWMmsUk8wfY",
    authDomain: "meetwoyou-436a2.firebaseapp.com",
    projectId: "meetwoyou-436a2",
    storageBucket: "meetwoyou-436a2.firebasestorage.app",
    messagingSenderId: "612788132077",
    appId: "1:612788132077:web:0a8b92edf26778efd4d4e4"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();

// ============================
// CLOUDINARY
// ============================

const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload";

const CLOUDINARY_PRESET = "Meetwoyou";

// ============================
// GLOBALS
// ============================

let localDB;
let localProducts = [];
let currentFilter = "all";
let scannerInstance = null;
let stockChart = null;

// ============================
// INDEXED DB
// ============================

const initLocalDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Stockify_Pro_DB", 1);

        request.onupgradeneeded = e => {
            const db = e.target.result;

            if (!db.objectStoreNames.contains("products")) {
                db.createObjectStore("products", {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = e => {
            localDB = e.target.result;
            resolve();
        };

        request.onerror = e => reject(e);
    });
};

// ============================
// SYNC DATA
// ============================

window.syncData = async () => {
    try {
        const tx = localDB.transaction("products", "readonly");
        const store = tx.objectStore("products");

        const req = store.getAll();

        req.onsuccess = async () => {
            localProducts = req.result || [];

            renderProducts();
            renderDashboard();
            renderChart();

            try {
                const snapshot = await firestore
                    .collection("stockify_products")
                    .get();

                const cloudData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const updateTx = localDB.transaction(
                    "products",
                    "readwrite"
                );

                const updateStore =
                    updateTx.objectStore("products");

                cloudData.forEach(p => updateStore.put(p));

                localProducts = cloudData;

                renderProducts();
                renderDashboard();
                renderChart();
            } catch (err) {
                console.warn("Offline Mode");
            }
        };
    } catch (e) {
        console.error(e);
    }
};

// ============================
// PAGE SWITCH
// ============================

window.switchPage = pageId => {
    document
        .querySelectorAll(".page-view")
        .forEach(p => p.classList.add("hidden"));

    document
        .getElementById(`page-${pageId}`)
        .classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("text-primary");
        btn.classList.add("text-slate-500");

        if (
            btn.getAttribute("data-page") === pageId
        ) {
            btn.classList.remove("text-slate-500");
            btn.classList.add("text-primary");
        }
    });

    if (pageId === "scanner") {
        startScanner();
    } else {
        stopScanner();
    }

    lucide.createIcons();
};

// ============================
// FILTER
// ============================

window.setFilter = filter => {
    currentFilter = filter;

    document.querySelectorAll(".filter-chip").forEach(btn => {
        btn.classList.remove("active");

        if (
            btn.innerText
                .toLowerCase()
                .includes(filter.toLowerCase()) ||
            (filter === "all" &&
                btn.innerText === "All")
        ) {
            btn.classList.add("active");
        }
    });

    renderProducts();
};

// ============================
// PRODUCT FORM
// ============================

window.openAddProductForm = (
    sku = "",
    existing = null
) => {
    let old = document.getElementById(
        "products-form-view"
    );

    if (old) old.remove();

    const html = `
    <div id="products-form-view"
    class="fixed inset-0 bg-[#020617] z-[9999] overflow-y-auto p-6 pb-32">

        <div class="max-w-2xl mx-auto">

            <div class="flex justify-between items-center mb-10">

                <div>
                    <h2 class="text-3xl font-black">
                        ${existing ? "Edit Product" : "Add Product"}
                    </h2>

                    <p class="text-xs uppercase tracking-widest text-slate-500 font-black mt-2">
                        Smart Inventory Form
                    </p>
                </div>

                <button onclick="closeProductForm()"
                class="bg-slate-900 p-4 rounded-2xl">

                    ✕

                </button>

            </div>

            <form id="product-form"
            class="space-y-5"
            onsubmit="saveProduct(event)">

                <input type="hidden" id="form-id">

                <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                    <label class="text-xs uppercase text-slate-500 font-black">
                        Product Name
                    </label>

                    <input
                    required
                    id="form-name"
                    type="text"
                    class="w-full bg-transparent mt-3 text-white text-lg font-black">

                </div>

                <div class="grid grid-cols-2 gap-4">

                    <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                        <label class="text-xs uppercase text-slate-500 font-black">
                            Barcode
                        </label>

                        <input
                        required
                        id="form-sku"
                        type="text"
                        class="w-full bg-transparent mt-3 text-white font-black">

                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                        <label class="text-xs uppercase text-slate-500 font-black">
                            Category
                        </label>

                        <select id="form-category"
                        class="w-full bg-transparent mt-3 text-white font-black">

                            <option>Grains</option>
                            <option>Dairy</option>
                            <option>Beverages</option>
                            <option>Snacks</option>

                        </select>

                    </div>

                </div>

                <div class="grid grid-cols-3 gap-4">

                    <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                        <label class="text-xs uppercase text-slate-500 font-black">
                            Cartons
                        </label>

                        <input
                        id="form-cartons"
                        value="1"
                        oninput="calculateTotalPieces()"
                        type="number"
                        class="w-full bg-transparent mt-3 text-white text-2xl font-black">

                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                        <label class="text-xs uppercase text-slate-500 font-black">
                            Pcs/Ctn
                        </label>

                        <input
                        id="form-pcs-per"
                        value="10"
                        oninput="calculateTotalPieces()"
                        type="number"
                        class="w-full bg-transparent mt-3 text-white text-2xl font-black">

                    </div>

                    <div class="bg-primary/10 border border-primary/20 rounded-[2rem] p-5">

                        <label class="text-xs uppercase text-primary font-black">
                            Total
                        </label>

                        <input
                        readonly
                        id="form-total-pcs"
                        type="number"
                        class="w-full bg-transparent mt-3 text-primary text-2xl font-black">

                    </div>

                </div>

                <div class="grid grid-cols-2 gap-4">

                    <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                        <label class="text-xs uppercase text-slate-500 font-black">
                            Carton Price
                        </label>

                        <input
                        id="form-carton-price"
                        oninput="calculatePrices('carton')"
                        type="number"
                        class="w-full bg-transparent mt-3 text-white text-xl font-black">

                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                        <label class="text-xs uppercase text-slate-500 font-black">
                            Piece Price
                        </label>

                        <input
                        id="form-piece-price"
                        oninput="calculatePrices('piece')"
                        type="number"
                        class="w-full bg-transparent mt-3 text-primary text-xl font-black">

                    </div>

                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                    <label class="text-xs uppercase text-slate-500 font-black">
                        Expiry Date
                    </label>

                    <input
                    required
                    id="form-expiry"
                    type="date"
                    class="w-full bg-transparent mt-3 text-white font-black">

                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                    <label class="text-xs uppercase text-slate-500 font-black">
                        Product Image
                    </label>

                    <input
                    id="form-image"
                    type="file"
                    accept="image/*"
                    class="w-full mt-4 text-sm">

                </div>

                <button
                id="save-btn"
                class="w-full bg-primary py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-green-900/40">

                    Save Product

                </button>

            </form>

        </div>

    </div>
    `;

    document.body.insertAdjacentHTML(
        "beforeend",
        html
    );

    if (existing) {
        document.getElementById("form-id").value =
            existing.id;

        document.getElementById("form-name").value =
            existing.name;

        document.getElementById("form-sku").value =
            existing.sku;

        document.getElementById(
            "form-category"
        ).value = existing.category;

        document.getElementById(
            "form-cartons"
        ).value = existing.cartons;

        document.getElementById(
            "form-pcs-per"
        ).value = existing.pcsPerCarton;

        document.getElementById(
            "form-total-pcs"
        ).value = existing.totalPieces;

        document.getElementById(
            "form-carton-price"
        ).value = existing.cartonPrice;

        document.getElementById(
            "form-piece-price"
        ).value = existing.piecePrice;

        document.getElementById(
            "form-expiry"
        ).value = existing.expiryDate;
    }

    document.getElementById("form-sku").value =
        sku;

    calculateTotalPieces();
};

window.closeProductForm = () => {
    let el = document.getElementById(
        "products-form-view"
    );

    if (el) el.remove();
};

// ============================
// CALCULATIONS
// ============================

window.calculateTotalPieces = () => {
    const cartons =
        parseInt(
            document.getElementById("form-cartons")
                .value
        ) || 0;

    const per =
        parseInt(
            document.getElementById("form-pcs-per")
                .value
        ) || 1;

    document.getElementById(
        "form-total-pcs"
    ).value = cartons * per;
};

window.calculatePrices = source => {
    const per =
        parseInt(
            document.getElementById("form-pcs-per")
                .value
        ) || 1;

    const carton =
        document.getElementById(
            "form-carton-price"
        );

    const piece =
        document.getElementById(
            "form-piece-price"
        );

    if (source === "carton") {
        piece.value = (
            parseFloat(carton.value || 0) / per
        ).toFixed(2);
    } else {
        carton.value = (
            parseFloat(piece.value || 0) * per
        ).toFixed(2);
    }
};

// ============================
// SAVE PRODUCT
// ============================

window.saveProduct = async e => {
    e.preventDefault();

    const btn =
        document.getElementById("save-btn");

    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        let image = "";

        const file =
            document.getElementById(
                "form-image"
            ).files[0];

        if (file) {
            const fd = new FormData();

            fd.append("file", file);

            fd.append(
                "upload_preset",
                CLOUDINARY_PRESET
            );

            const res = await fetch(
                CLOUDINARY_URL,
                {
                    method: "POST",
                    body: fd
                }
            );

            const data = await res.json();

            image = data.secure_url;
        }

        const id =
            document.getElementById("form-id")
                .value || Date.now().toString();

        const payload = {
            id,
            name:
                document.getElementById(
                    "form-name"
                ).value,
            sku:
                document.getElementById(
                    "form-sku"
                ).value,
            category:
                document.getElementById(
                    "form-category"
                ).value,
            cartons:
                document.getElementById(
                    "form-cartons"
                ).value,
            pcsPerCarton:
                document.getElementById(
                    "form-pcs-per"
                ).value,
            totalPieces:
                document.getElementById(
                    "form-total-pcs"
                ).value,
            cartonPrice:
                document.getElementById(
                    "form-carton-price"
                ).value,
            piecePrice:
                document.getElementById(
                    "form-piece-price"
                ).value,
            expiryDate:
                document.getElementById(
                    "form-expiry"
                ).value,
            image,
            updatedAt: Date.now()
        };

        const tx = localDB.transaction(
            "products",
            "readwrite"
        );

        tx.objectStore("products").put(payload);

        await firestore
            .collection("stockify_products")
            .doc(id)
            .set(payload);

        closeProductForm();

        syncData();
    } catch (err) {
        alert(err.message);
    }

    btn.innerText = "Save Product";
    btn.disabled = false;
};

// ============================
// PRODUCT GRID
// ============================

window.renderProducts = () => {
    const grid =
        document.getElementById("product-grid");

    const empty =
        document.getElementById(
            "empty-products"
        );

    const search =
        document
            .getElementById("search-input")
            .value.toLowerCase();

    const today = new Date();

    let filtered = localProducts.filter(
        p =>
            p.name
                .toLowerCase()
                .includes(search) ||
            p.sku.includes(search)
    );

    if (currentFilter === "expired") {
        filtered = filtered.filter(
            p => new Date(p.expiryDate) < today
        );
    }

    if (currentFilter === "expiring") {
        filtered = filtered.filter(p => {
            const exp = new Date(p.expiryDate);

            const diff =
                (exp - today) /
                (1000 * 60 * 60 * 24);

            return diff <= 7 && diff >= 0;
        });
    }

    if (
        !["all", "expired", "expiring"].includes(
            currentFilter
        )
    ) {
        filtered = filtered.filter(
            p => p.category === currentFilter
        );
    }

    if (!filtered.length) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    grid.innerHTML = filtered
        .map(p => {
            const exp =
                new Date(p.expiryDate) < today;

            return `
        <div
        class="bg-slate-900 border ${
            exp
                ? "border-red-500/30"
                : "border-slate-800"
        } rounded-[2rem] overflow-hidden shadow-xl card-hover">

            <div class="h-56 bg-black overflow-hidden">

                <img
                src="${
                    p.image ||
                    "https://placehold.co/600x400/000000/FFFFFF?text=Stockify"
                }"
                class="w-full h-full object-cover">

            </div>

            <div class="p-5">

                <div class="flex justify-between items-start mb-4">

                    <div>

                        <h3 class="text-xl font-black">
                            ${p.name}
                        </h3>

                        <p class="text-xs text-slate-500 font-bold mt-1">
                            ${p.sku}
                        </p>

                    </div>

                    <span
                    class="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full uppercase font-black">

                        ${p.category}

                    </span>

                </div>

                <div class="grid grid-cols-3 gap-3 mb-5">

                    <div class="bg-slate-800 rounded-2xl p-3 text-center">

                        <p class="text-[10px] uppercase text-slate-500 font-black">
                            Stock
                        </p>

                        <h4 class="text-lg font-black mt-2">
                            ${p.totalPieces}
                        </h4>

                    </div>

                    <div class="bg-slate-800 rounded-2xl p-3 text-center">

                        <p class="text-[10px] uppercase text-slate-500 font-black">
                            CTN
                        </p>

                        <h4 class="text-lg font-black mt-2">
                            ${p.cartonPrice}
                        </h4>

                    </div>

                    <div class="bg-slate-800 rounded-2xl p-3 text-center">

                        <p class="text-[10px] uppercase text-slate-500 font-black">
                            PCS
                        </p>

                        <h4 class="text-lg font-black mt-2 text-primary">
                            ${p.piecePrice}
                        </h4>

                    </div>

                </div>

                <div class="flex gap-3">

                    <button
                    onclick="editProduct('${p.id}')"
                    class="flex-1 bg-primary/10 border border-primary/20 text-primary py-4 rounded-2xl font-black uppercase text-xs">

                        Edit

                    </button>

                    <button
                    onclick="deleteProduct('${p.id}')"
                    class="flex-1 bg-red-500/10 border border-red-500/20 text-red-500 py-4 rounded-2xl font-black uppercase text-xs">

                        Delete

                    </button>

                </div>

            </div>

        </div>
        `;
        })
        .join("");

    lucide.createIcons();
};

// ============================
// EDIT PRODUCT
// ============================

window.editProduct = id => {
    const product = localProducts.find(
        p => p.id === id
    );

    if (!product) return;

    openAddProductForm("", product);
};

// ============================
// DELETE PRODUCT
// ============================

window.deleteProduct = async id => {
    const confirmDelete = confirm(
        "Delete this product?"
    );

    if (!confirmDelete) return;

    const tx = localDB.transaction(
        "products",
        "readwrite"
    );

    tx.objectStore("products").delete(id);

    await firestore
        .collection("stockify_products")
        .doc(id)
        .delete();

    syncData();
};

// ============================
// DASHBOARD
// ============================

window.renderDashboard = () => {
    const total = localProducts.length;

    const today = new Date();

    let expired = 0;
    let expiring = 0;

    localProducts.forEach(p => {
        const exp = new Date(p.expiryDate);

        const diff =
            (exp - today) /
            (1000 * 60 * 60 * 24);

        if (diff < 0) expired++;

        if (diff <= 7 && diff >= 0)
            expiring++;
    });

    const categories = [
        ...new Set(
            localProducts.map(p => p.category)
        )
    ];

    document.getElementById(
        "dash-total"
    ).innerText = total;

    document.getElementById(
        "dash-expired"
    ).innerText = expired;

    document.getElementById(
        "dash-expiring"
    ).innerText = expiring;

    document.getElementById(
        "dash-category"
    ).innerText = categories.length;
};

// ============================
// CHART
// ============================

window.renderChart = () => {
    const canvas =
        document.getElementById("stockChart");

    if (!canvas) return;

    const empty =
        document.getElementById(
            "chart-empty"
        );

    if (!localProducts.length) {
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const ctx = canvas.getContext("2d");

    if (stockChart) stockChart.destroy();

    const labels = localProducts.map(
        p => p.name
    );

    const data = localProducts.map(
        p => parseInt(p.totalPieces) || 0
    );

    stockChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Stock",
                    data,
                    borderRadius: 18
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    labels: {
                        color: "white"
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#94a3b8"
                    }
                },

                y: {
                    ticks: {
                        color: "#94a3b8"
                    }
                }
            }
        }
    });
};

// ============================
// SCANNER
// ============================

window.startScanner = async () => {
    if (scannerInstance) return;

    scannerInstance = new Html5Qrcode(
        "scanner-container"
    );

    const config = {
        fps: 10,
        qrbox: 250
    };

    scannerInstance.start(
        {
            facingMode: "environment"
        },
        config,
        decoded => {
            const sound =
                document.getElementById(
                    "scan-sound"
                );

            sound.play();

            const overlay =
                document.getElementById(
                    "scan-success"
                );

            overlay.classList.remove("hidden");
            overlay.classList.add("flex");

            setTimeout(() => {
                overlay.classList.add("hidden");
            }, 1500);

            const product = localProducts.find(
                p => p.sku === decoded
            );

            if (product) {
                stopScanner();

                switchPage("products");

                setTimeout(() => {
                    alert(
                        `${product.name}\nStock: ${product.totalPieces}`
                    );
                }, 400);
            } else {
                stopScanner();

                const addNew = confirm(
                    `Barcode: ${decoded}\n\nProduct not found.\nAdd new product?`
                );

                if (addNew) {
                    openAddProductForm(decoded);
                }
            }
        }
    );
};

window.stopScanner = async () => {
    try {
        if (scannerInstance) {
            await scannerInstance.stop();
            scannerInstance.clear();
            scannerInstance = null;
        }
    } catch (e) {}
};

// ============================
// INIT
// ============================

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        await initLocalDB();

        syncData();

        lucide.createIcons();
    }
);
