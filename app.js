/**********************
 STOCKIFY PRO ULTRA JS
 FULL FIXED VERSION
**********************/

/* =====================
   GLOBAL STATE
===================== */

let products = JSON.parse(localStorage.getItem("products") || "[]");
let currentFilter = "all";

/* =====================
   PAGE SWITCH SYSTEM
===================== */

function switchPage(page) {
  const pages = ["dashboard", "products", "scanner", "settings"];

  pages.forEach(p => {
    const el = document.getElementById("page-" + p);
    if (el) el.classList.add("hidden");
  });

  const active = document.getElementById("page-" + page);
  if (active) active.classList.remove("hidden");

  updateNav(page);
  updateDashboard();
  renderProducts();
}

/* NAV ACTIVE STATE */
function updateNav(page) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("text-primary");
    btn.classList.add("text-slate-400");

    if (btn.dataset.page === page) {
      btn.classList.add("text-primary");
      btn.classList.remove("text-slate-400");
    }
  });
}

/* =====================
   MODAL (ADD PRODUCT)
===================== */

function openAddProductForm() {
  const modal = document.createElement("div");

  modal.innerHTML = `
    <div id="modal" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999]">
      <div class="bg-slate-900 p-6 rounded-2xl w-full max-w-md">

        <h2 class="text-xl font-bold mb-4">Add Product</h2>

        <input id="p-name" placeholder="Product Name"
          class="w-full p-3 mb-2 bg-slate-800 rounded"/>

        <input id="p-category" placeholder="Category"
          class="w-full p-3 mb-2 bg-slate-800 rounded"/>

        <input id="p-stock" type="number" placeholder="Stock"
          class="w-full p-3 mb-2 bg-slate-800 rounded"/>

        <input id="p-price" type="number" placeholder="Price"
          class="w-full p-3 mb-2 bg-slate-800 rounded"/>

        <!-- IMAGE FIX -->
        <input id="p-image" type="file"
          class="w-full p-2 mb-3 bg-slate-800 rounded"/>

        <button onclick="saveProduct()" 
          class="bg-green-500 w-full p-3 rounded font-bold">
          SAVE PRODUCT
        </button>

        <button onclick="closeModal()"
          class="w-full mt-2 p-3 bg-red-500 rounded">
          CLOSE
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) m.remove();
}

/* =====================
   IMAGE TO BASE64 FIX
===================== */

function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/* =====================
   SAVE PRODUCT
===================== */

async function saveProduct() {
  const name = document.getElementById("p-name").value;
  const category = document.getElementById("p-category").value;
  const stock = document.getElementById("p-stock").value;
  const price = document.getElementById("p-price").value;
  const imageFile = document.getElementById("p-image").files[0];

  let image = "";

  if (imageFile) {
    image = await toBase64(imageFile);
  }

  const product = {
    id: Date.now(),
    name,
    category,
    stock: Number(stock),
    price: Number(price),
    image,
    created: new Date()
  };

  products.push(product);
  localStorage.setItem("products", JSON.stringify(products));

  closeModal();
  renderProducts();
  updateDashboard();
}

/* =====================
   PRODUCT RENDER FIX
===================== */

function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const search = document.getElementById("search-input")?.value?.toLowerCase() || "";

  let filtered = products.filter(p => {
    const matchSearch =
      p.name?.toLowerCase().includes(search) ||
      p.category?.toLowerCase().includes(search);

    const matchFilter =
      currentFilter === "all" ||
      p.category === currentFilter ||
      (currentFilter === "expired" && isExpired(p)) ||
      (currentFilter === "expiring" && isExpiring(p));

    return matchSearch && matchFilter;
  });

  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="text-slate-400">No products found</p>`;
    return;
  }

  filtered.forEach(p => {
    grid.innerHTML += `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">

        <img src="${p.image || ''}" 
          class="h-40 w-full object-cover rounded-xl mb-3 bg-slate-800"/>

        <h2 class="font-bold text-lg">${p.name}</h2>

        <p class="text-sm text-slate-400">${p.category}</p>

        <div class="flex justify-between mt-2">
          <span>Stock: ${p.stock}</span>
          <span class="text-green-400">$${p.price}</span>
        </div>

      </div>
    `;
  });

  updateDashboard();
}

/* =====================
   FILTER SYSTEM
===================== */

function setFilter(type) {
  currentFilter = type;

  document.querySelectorAll(".filter-chip").forEach(btn => {
    btn.classList.remove("active");
  });

  event.target.classList.add("active");

  renderProducts();
}

/* =====================
   EXPIRY LOGIC (SIMPLE)
===================== */

function isExpired(p) {
  return false; // placeholder (extend later)
}

function isExpiring(p) {
  return false; // placeholder (extend later)
}

/* =====================
   DASHBOARD UPDATE
===================== */

function updateDashboard() {
  const total = products.length;

  document.getElementById("dash-total").innerText = total;

  document.getElementById("dash-category").innerText =
    new Set(products.map(p => p.category)).size;

  document.getElementById("dash-expired").innerText = 0;
  document.getElementById("dash-expiring").innerText = 0;

  drawCharts();
}

/* =====================
   CHARTS FIX
===================== */

function drawCharts() {
  const ctx1 = document.getElementById("stockChart");
  const ctx2 = document.getElementById("expiryChart");

  if (!ctx1 || !ctx2) return;

  new Chart(ctx1, {
    type: "bar",
    data: {
      labels: [...new Set(products.map(p => p.category))],
      datasets: [{
        label: "Products",
        data: Object.values(
          products.reduce((a, b) => {
            a[b.category] = (a[b.category] || 0) + 1;
            return a;
          }, {})
        )
      }]
    }
  });

  new Chart(ctx2, {
    type: "pie",
    data: {
      labels: ["Total"],
      datasets: [{
        data: [products.length]
      }]
    }
  });
}

/* =====================
   THEME TOGGLE FIX
===================== */

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
}

/* =====================
   SCANNER (SAFE INIT)
===================== */

function initScanner() {
  const container = document.getElementById("scanner-container");
  if (!container) return;

  try {
    const scanner = new Html5Qrcode("scanner-container");

    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length) {
        scanner.start(
          cameras[0].id,
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            alert("Scanned: " + decodedText);
          }
        );
      }
    });
  } catch (e) {
    console.log("Scanner error:", e);
  }
}

/* =====================
   INIT APP
===================== */

window.onload = function () {
  switchPage("dashboard");
  renderProducts();
  updateDashboard();
  initScanner();
};
