// === CONFIGURATION ===
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

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dpgawb5sl/image/upload';
const CLOUDINARY_PRESET = 'Meetwoyou';

let localProducts = [];
let selectedFile = null;
let scanner = null;

// === CORE FUNCTIONS ===

// ১. ডাটা সিঙ্ক (Firestore থেকে আনা)
async function syncData() {
    try {
        const snapshot = await db.collection('stockify_products').orderBy('updatedAt', 'desc').get();
        localProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDashboard();
        renderProducts();
    } catch (err) { console.error("Sync Error:", err); }
}

// ২. ড্যাশবোর্ড আপডেট
function renderDashboard() {
    document.getElementById('dash-total').innerText = localProducts.length;
    let totalPcs = 0;
    localProducts.forEach(p => totalPcs += (parseInt(p.totalPieces) || 0));
    document.getElementById('dash-pieces').innerText = totalPcs;
}

// ৩. রেট ও টোটাল ক্যালকুলেশন (অটোমেটিক কাজ করবে)
function updateCalculations() {
    const ctn = parseInt(document.getElementById('form-cartons').value) || 0;
    const perCtn = parseInt(document.getElementById('form-pcs-per').value) || 1;
    const totalPcs = ctn * perCtn;
    document.getElementById('form-total-pcs').value = totalPcs;
}

// ৪. প্রোডাক্ট সেভ লজিক
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = "SAVING...";
    saveBtn.disabled = true;

    try {
        let imageUrl = document.getElementById('form-img-output').src;
        
        // ইমেজ আপলোড (যদি নতুন ছবি থাকে)
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();
            imageUrl = data.secure_url.replace('/upload/', '/upload/w_400,c_scale,q_auto/');
        }

        const product = {
            name: document.getElementById('form-name').value,
            sku: document.getElementById('form-sku').value,
            category: document.getElementById('form-category').value,
            cartons: document.getElementById('form-cartons').value,
            pcsPerCtn: document.getElementById('form-pcs-per').value,
            totalPieces: document.getElementById('form-total-pcs').value,
            expiryDate: document.getElementById('form-expiry').value,
            image: imageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docId = document.getElementById('form-id').value;
        if (docId) {
            await db.collection('stockify_products').doc(docId).update(product);
        } else {
            await db.collection('stockify_products').add(product);
        }

        alert("Saved Successfully!");
        closeForm();
        syncData();
    } catch (err) { alert(err.message); }
    finally {
        saveBtn.innerText = "SYNC TO CLOUD";
        saveBtn.disabled = false;
    }
};

// ৫. ফাস্ট স্ক্যানার (Back Camera Only)
async function startScanner() {
    scanner = new ZXing.BrowserMultiFormatReader();
    const devices = await scanner.listVideoInputDevices();
    const backCam = devices.find(d => d.label.toLowerCase().includes('back')) || devices[devices.length - 1];

    scanner.decodeFromVideoDevice(backCam.deviceId, 'scan-video', (result) => {
        if (result) {
            if (navigator.vibrate) navigator.vibrate(100);
            const found = localProducts.find(p => p.sku === result.text);
            if (found) {
                alert("Found: " + found.name);
                // ডিটেইলস দেখানোর লজিক
            } else {
                openForm();
                document.getElementById('form-sku').value = result.text;
            }
            switchPage('products');
        }
    });
}

// ৬. ডিলিট ফাংশন
window.deleteProduct = async (id) => {
    if(confirm("Are you sure?")) {
        await db.collection('stockify_products').doc(id).delete();
        syncData();
    }
};

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    syncData();
    // ক্যালকুলেশন লিসেনার
    document.getElementById('form-cartons').oninput = updateCalculations;
    document.getElementById('form-pcs-per').oninput = updateCalculations;
});
