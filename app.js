// === ১. ফায়ারবেস কনফিগারেশন (আপনার নিজস্ব তথ্য দিন) ===
const firebaseConfig = {
    apiKey: "AIzaSy...", 
    authDomain: "stockify-cffcc.firebaseapp.com",
    projectId: "stockify-cffcc",
    storageBucket: "stockify-cffcc.appspot.com",
    messagingSenderId: "733602526131",
    appId: "1:733602526131:web:ed529d1ff01b2ddee091c6"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ক্লাউডিনারি কনফিগ
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; // আপনার Unsigned Preset Name এখানে দিন

let allProducts = [];
let selectedFile = null;

// === ২. অটো ক্যালকুলেশন লজিক (কার্টুন * পিস = মোট পিস) ===
const cartonsInp = document.getElementById('form-cartons');
const pcsPerInp = document.getElementById('form-pcs-per');
const totalPcsInp = document.getElementById('form-total-pcs');

if(cartonsInp && pcsPerInp) {
    [cartonsInp, pcsPerInp].forEach(el => {
        el.addEventListener('input', () => {
            const cartons = parseInt(cartonsInp.value) || 0;
            const perCarton = parseInt(pcsPerInp.value) || 0;
            totalPcsInp.value = cartons * perCarton;
        });
    });
}

// === ৩. ক্লাউডিনারি আপলোড ফাংশন ===
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

// === ৪. ডেটা সেভ করা (Firestore + Cloudinary) ===
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "সেভ হচ্ছে...";

    try {
        let finalImageUrl = document.getElementById('form-img-output').src;

        // নতুন ছবি থাকলে আপলোড করো
        if (selectedFile) {
            const uploadedUrl = await uploadImage(selectedFile);
            if (uploadedUrl) finalImageUrl = uploadedUrl;
        }

        const id = document.getElementById('form-id').value;
        const productData = {
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: document.getElementById('form-category').value,
            cartons: parseInt(document.getElementById('form-cartons').value) || 0,
            pcsPerCarton: parseInt(document.getElementById('form-pcs-per').value) || 0,
            totalPieces: parseInt(document.getElementById('form-total-pcs').value) || 0,
            cartonPrice: parseFloat(document.getElementById('form-carton-price').value) || 0,
            piecePrice: parseFloat(document.getElementById('form-piece-price').value) || 0,
            expiryDate: document.getElementById('form-expiry').value,
            imageUrl: finalImageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (id) {
            await db.collection('products').doc(id).update(productData);
        } else {
            await db.collection('products').add(productData);
        }

        alert("সফলভাবে সেভ হয়েছে!");
        window.closeProductForm();
        selectedFile = null;
    } catch (err) {
        console.error(err);
        alert("ভুল হয়েছে: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "ডেটা সেভ করুন";
    }
});

// === ৫. রিয়েল-টাইম ডেটা রেন্ডারিং ===
db.collection('products').orderBy('updatedAt', 'desc').onSnapshot(snap => {
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateDashboard();
    renderGrid(allProducts);
});

function renderGrid(products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => `
        <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <img src="${p.imageUrl || ''}" class="w-full aspect-video object-cover bg-slate-100">
            <div class="p-5">
                <h3 class="font-bold text-lg">${p.name}</h3>
                <p class="text-xs text-slate-400 font-mono mb-3">SKU: ${p.sku}</p>
                <div class="flex justify-between items-center py-2 border-t border-slate-100 dark:border-slate-700">
                    <span class="text-sm font-bold">${p.totalPieces} Pcs</span>
                    <span class="text-xs font-bold text-red-500">${p.expiryDate}</span>
                </div>
                <div class="flex gap-2 mt-4">
                    <button onclick="editProduct('${p.id}')" class="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold">এডিট</button>
                    <button onclick="deleteProduct('${p.id}')" class="px-3 py-2 bg-red-50 text-red-500 rounded-xl"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// ড্যাশবোর্ড আপডেট
function updateDashboard() {
    const total = allProducts.length;
    const pieces = allProducts.reduce((s, p) => s + (p.totalPieces || 0), 0);
    const expired = allProducts.filter(p => new Date(p.expiryDate) < new Date()).length;

    document.getElementById('dash-total').innerText = total;
    document.getElementById('dash-pieces').innerText = pieces;
    document.getElementById('dash-expired').innerText = expired;
}

// এডিট এবং ডিলিট ফাংশন
window.editProduct = (id) => {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    window.openAddProductForm();
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-sku').value = p.sku;
    document.getElementById('form-category').value = p.category;
    document.getElementById('form-cartons').value = p.cartons;
    document.getElementById('form-pcs-per').value = p.pcsPerCarton;
    document.getElementById('form-total-pcs').value = p.totalPieces;
    document.getElementById('form-carton-price').value = p.cartonPrice;
    document.getElementById('form-piece-price').value = p.piecePrice;
    document.getElementById('form-expiry').value = p.expiryDate;
    document.getElementById('form-img-output').src = p.imageUrl;
    document.getElementById('image-preview-box').classList.remove('hidden');
    document.getElementById('image-input-label').classList.add('hidden');
};

window.deleteProduct = async (id) => {
    if(confirm("ডিলিট করতে চান?")) await db.collection('products').doc(id).delete();
};

// সার্চ লজিক
document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term) || p.sku.includes(term));
    renderGrid(filtered);
});

// ছবি সিলেক্ট হ্যান্ডলার
document.getElementById('form-image-input').addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('form-img-output').src = ev.target.result;
            document.getElementById('image-preview-box').classList.remove('hidden');
            document.getElementById('image-input-label').classList.add('hidden');
        };
        reader.readAsDataURL(selectedFile);
    }
});
