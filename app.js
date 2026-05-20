<!DOCTYPE html>
<html lang="bn" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, visual-viewport-fit=cover">
    <title>Stockify - Grocery Inventory Management</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- html5-qrcode Scanner CDN -->
    <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
    
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: '#16a34a',
                        background: '#f8fafc',
                        darkBg: '#0f172a'
                    }
                }
            }
        }
    </script>
    <style>
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body { -webkit-tap-highlight-color: transparent; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 min-h-screen pb-20 md:pb-0 md:pl-64 font-sans transition-colors duration-200">

    <!-- SIDEBAR (Desktop) -->
    <aside class="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex-col justify-between z-40">
        <div class="space-y-6">
            <div class="flex items-center px-2 py-3">
                <span class="text-2xl font-bold tracking-tight text-green-600 dark:text-green-500">Stockify</span>
            </div>
            <nav class="space-y-1">
                <button onclick="switchPage('dashboard')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-green-600 text-white shadow-md shadow-green-600/10" data-page="dashboard">
                    <i data-lucide="layout-dashboard" class="w-5 h-5"></i> Dashboard
                </button>
                <button onclick="switchPage('products')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50" data-page="products">
                    <i data-lucide="box" class="w-5 h-5"></i> Products
                </button>
                <button onclick="switchPage('scanner')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50" data-page="scanner">
                    <i data-lucide="scan-line" class="w-5 h-5"></i> Scanner
                </button>
                <button onclick="switchPage('settings')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50" data-page="settings">
                    <i data-lucide="settings" class="w-5 h-5"></i> Settings
                </button>
            </nav>
        </div>
        <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
            <span class="text-xs text-slate-400 font-medium">Dark Mode</span>
            <button onclick="toggleTheme()" class="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                <i data-lucide="moon" class="w-5 h-5 dark:hidden"></i>
                <i data-lucide="sun" class="w-5 h-5 hidden dark:block text-amber-400"></i>
            </button>
        </div>
    </aside>

    <!-- MOBILE BOTTOM NAVIGATION -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 flex items-center justify-around z-50">
        <button onclick="switchPage('dashboard')" class="mobile-nav-btn flex flex-col items-center gap-1 text-green-600 flex-1" data-page="dashboard">
            <i data-lucide="layout-dashboard" class="w-5 h-5"></i><span class="text-[10px] font-medium">Dashboard</span>
        </button>
        <button onclick="switchPage('products')" class="mobile-nav-btn flex flex-col items-center gap-1 text-slate-400 flex-1" data-page="products">
            <i data-lucide="box" class="w-5 h-5"></i><span class="text-[10px] font-medium">Products</span>
        </button>
        <button onclick="switchPage('scanner')" class="mobile-nav-btn flex flex-col items-center gap-1 text-slate-400 flex-1" data-page="scanner">
            <i data-lucide="scan-line" class="w-5 h-5"></i><span class="text-[10px] font-medium">Scanner</span>
        </button>
        <button onclick="switchPage('settings')" class="mobile-nav-btn flex flex-col items-center gap-1 text-slate-400 flex-1" data-page="settings">
            <i data-lucide="settings" class="w-5 h-5"></i><span class="text-[10px] font-medium">Settings</span>
        </button>
    </nav>

    <!-- MAIN APP CONTAINER -->
    <main class="p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        <!-- DASHBOARD PAGE -->
        <section id="page-dashboard" class="page-view space-y-6">
            <div>
                <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">পণ্য এবং ইনভেন্টরির রিয়েল-টাইম আপডেট।</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-slate-400">Total Products</p>
                        <h3 id="dash-total" class="text-2xl font-bold mt-1">0</h3>
                    </div>
                    <div class="p-3 rounded-xl bg-green-500/10 text-green-500"><i data-lucide="box" class="w-6 h-6"></i></div>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-slate-400">Expired Items</p>
                        <h3 id="dash-expired" class="text-2xl font-bold mt-1 text-red-500">0</h3>
                    </div>
                    <div class="p-3 rounded-xl bg-red-500/10 text-red-500"><i data-lucide="alert-triangle" class="w-6 h-6"></i></div>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
                    <div>
                        <p class="text-sm font-medium text-slate-400">Total Stock (Pcs)</p>
                        <h3 id="dash-pieces" class="text-2xl font-bold mt-1 text-amber-500">0</h3>
                    </div>
                    <div class="p-3 rounded-xl bg-amber-500/10 text-amber-500"><i data-lucide="layers" class="w-6 h-6"></i></div>
                </div>
            </div>
         </section>

        <!-- PRODUCTS PAGE -->
        <section id="page-products" class="page-view space-y-6 hidden">
            <div id="products-list-view" class="space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Stock Management</h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400">পণ্য ট্র্যাকিং ও ফিল্টারিং সিস্টেম।</p>
                    </div>
                    <button onclick="openAddProductForm()" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-green-600/10 transition-transform active:scale-95">
                        <i data-lucide="plus" class="w-4 h-4"></i> Add Product
                    </button>
                </div>

                <!-- Search and Filters -->
                <div class="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="relative flex-1">
                        <i data-lucide="search" class="absolute left-3 top-3 h-4 w-4 text-slate-400"></i>
                        <input id="search-input" oninput="renderProducts()" type="text" placeholder="Search by title or barcode..." class="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-green-500">
                    </div>
                    <div id="category-filters" class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        <!-- Categories dynamically loaded -->
                    </div>
                </div>

                <!-- Product Grid -->
                <div id="product-grid" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <!-- Cards injection -->
                </div>
            </div>

            <!-- Add/Edit Product Form View -->
            <div id="products-form-view" class="max-w-xl mx-auto hidden">
                <div class="flex items-center gap-3 mb-6">
                    <button onclick="closeProductForm()" class="w-9 h-9 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center bg-white dark:bg-slate-800"><i data-lucide="arrow-left" class="w-4 h-4"></i></button>
                    <div>
                        <h1 id="form-title" class="text-xl font-bold tracking-tight">New Product Inventory</h1>
                        <p class="text-xs text-slate-500">সঠিক তথ্য দিয়ে ডাটাবেজ আপডেট নিশ্চিত করুন।</p>
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
                    <form id="product-form" onsubmit="saveProduct(event)" class="space-y-4">
                        <input type="hidden" id="form-id">
                        
                        <!-- Image Upload Mock Base64 -->
                        <div class="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30 relative">
                            <div id="image-preview-box" class="hidden relative w-full aspect-[16/9] rounded-xl overflow-hidden">
                                <img id="form-img-output" src="" class="w-full h-full object-cover">
                                <button type="button" onclick="removeFormImage()" class="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full"><i data-lucide="x" class="w-4 h-4"></i></button>
                            </div>
                            <label id="image-input-label" class="flex flex-col items-center justify-center w-full aspect-[16/9] cursor-pointer">
                                <i data-lucide="camera" class="w-8 h-8 text-slate-400 mb-2"></i>
                                <span class="text-xs text-slate-400 font-medium">Upload Product Image</span>
                                <input type="file" accept="image/*" onchange="handleFormImage(this)" class="hidden">
                            </label>
                        </div>

                        <div class="space-y-1">
                            <label class="text-sm font-medium">Product Name</label>
                            <input type="text" id="form-name" required class="w-full h-10 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-3 text-sm focus:outline-none focus:border-green-500">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="text-sm font-medium">SKU / Barcode</label>
                                <input type="text" id="form-sku" required class="w-full h-10 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-3 text-sm focus:outline-none focus:border-green-500">
                            </div>
                            <div class="space-y-1">
                                <label class="text-sm font-medium">Category</label>
                                <select id="form-category" class="w-full h-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 text-sm focus:outline-none focus:border-green-500">
                                    <option value="Grains">Grains</option>
                                    <option value="Dairy">Dairy</option>
                                    <option value="Beverages">Beverages</option>
                                    <option value="Snacks">Snacks</option>
                                    <option value="Packaged">Packaged</option>
                                    <option value="Fresh Produce">Fresh Produce</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-slate-400">Cartons</label>
                                <input type="number" id="form-cartons" value="0" oninput="calculateTotalPieces(); calculatePrices('carton');" class="w-full h-9 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-2 text-sm text-center">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-slate-400">Pcs/Carton</label>
                                <input type="number" id="form-pcs-per" value="10" oninput="calculateTotalPieces(); calculatePrices('piece');" class="w-full h-9 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-2 text-sm text-center">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-slate-400">Total Pcs</label>
                                <input type="number" id="form-total-pcs" value="0" disabled class="w-full h-9 border-none bg-slate-200 dark:bg-slate-700 rounded-xl px-2 text-sm text-center font-bold">
                            </div>
                        </div>

                        <!-- Price Section (Per Carton / Per Piece) -->
                        <div class="grid grid-cols-2 gap-4 bg-green-500/5 p-3 rounded-2xl border border-green-500/10">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-green-600 dark:text-green-400">Per Carton Price</label>
                                <input type="number" step="0.01" id="form-carton-price" value="0" oninput="calculatePrices('carton')" class="w-full h-10 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-3 text-sm focus:outline-none focus:border-green-500">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-green-600 dark:text-green-400">Per Piece Price</label>
                                <input type="number" step="0.01" id="form-piece-price" value="0" oninput="calculatePrices('piece')" class="w-full h-10 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-3 text-sm focus:outline-none focus:border-green-500">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-sm font-medium">Expiration Date</label>
                            <input type="date" id="form-expiry" required class="w-full h-10 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl px-3 text-sm focus:outline-none focus:border-green-500">
                        </div>
                        <div class="flex gap-3 pt-2">
                            <button type="button" onclick="closeProductForm()" class="flex-1 h-10 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium">Cancel</button>
                            <button type="submit" class="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-md shadow-green-600/10">Save Product</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <!-- SCANNER PAGE -->
        <section id="page-scanner" class="page-view space-y-6 hidden">
            <div id="scanner-main-view" class="space-y-6 max-w-md mx-auto">
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">Instant Scanner</h1>
                    <p class="text-sm text-muted-foreground">রিয়েল-টাইম অটো বারকোড স্ক্যানিং সিস্টেম (মোবাইল অপ্টিমাইজড)।</p>
                </div>
                <div class="relative w-full aspect-square max-w-sm mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                    <div id="scanner-container" class="w-full h-full object-cover"></div>
                    <div class="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                        <div class="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-medium text-white tracking-wider uppercase mx-auto">
                            Align Barcode Inside Frame
                        </div>
                        <div class="w-full flex justify-center items-center flex-1">
                            <div class="w-4/5 aspect-[2/1] border-2 border-green-500 rounded-2xl relative">
                                <div class="absolute -inset-1 border-2 border-white/20 rounded-[18px] animate-pulse"></div>
                            </div>
                        </div>
                        <div class="w-full flex justify-center pointer-events-auto">
                            <button onclick="toggleTorch()" class="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white flex items-center justify-center">
                                <i data-lucide="zap" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Match Result Screen -->
            <div id="scanner-match-view" class="max-w-md mx-auto space-y-4 hidden">
                <h1 class="text-xl font-bold text-green-500 tracking-tight">Product Found!</h1>
                <div id="matched-card-container"></div>
                <button onclick="restartScanner()" class="w-full h-11 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                    <i data-lucide="refresh-cw" class="w-4 h-4"></i> Scan Another Item
                </button>
            </div>
        </section>

        <!-- SETTINGS PAGE -->
        <section id="page-settings" class="page-view space-y-6 hidden">
            <div>
                <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
                <p class="text-sm text-slate-500">অ্যাপ্লিকেশন প্রেফারেন্স কনফিগারেশন।</p>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-2xl shadow-sm flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium">Interface Theme</p>
                    <p class="text-xs text-slate-400">Light এবং Dark থিমের মধ্যে পরিবর্তন করুন।</p>
                </div>
                <button onclick="toggleTheme()" class="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                    Toggle Mode
                </button>
            </div>
        </section>

    </main>

    <!-- PRODUCT DETAILS MODAL CONTAINER -->
    <div id="details-modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
        <!-- Injected via JavaScript -->
    </div>

    <!-- Core App Logic -->
    <script src="app.js"></script>
</body>
</html>
