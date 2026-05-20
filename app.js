<!-- ========================= -->
<!-- SCAN SOUND -->
<!-- ========================= -->

<audio id="scan-sound" preload="auto">
    <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg">
</audio>

<!-- ========================= -->
<!-- PRODUCT ADD / EDIT FORM -->
<!-- ========================= -->

<div id="products-form-view"
    class="fixed inset-0 z-[9999] bg-[#0b1120] overflow-y-auto hidden">

    <div class="max-w-5xl mx-auto p-4 md:p-10">

        <!-- HEADER -->

        <div class="flex items-center justify-between mb-8">

            <div>
                <h1 class="text-3xl md:text-5xl font-black text-white">
                    Product Manager
                </h1>

                <p class="text-slate-500 uppercase text-xs font-black tracking-widest mt-2">
                    Add / Edit Product
                </p>
            </div>

            <button onclick="closeProductForm()"
                class="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center active:scale-90">

                <i data-lucide="x" class="w-6 h-6"></i>

            </button>

        </div>

        <!-- FORM -->

        <form id="product-form"
            onsubmit="saveProduct(event)"
            class="grid lg:grid-cols-2 gap-6">

            <!-- LEFT -->

            <div class="space-y-5">

                <!-- IMAGE -->

                <div
                    class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                    <div
                        class="relative h-72 rounded-[2rem] overflow-hidden border-2 border-dashed border-slate-700 flex items-center justify-center">

                        <img id="form-img-output"
                            class="absolute inset-0 w-full h-full object-cover hidden">

                        <div id="image-placeholder"
                            class="text-center">

                            <i data-lucide="image-plus"
                                class="w-14 h-14 mx-auto text-slate-600 mb-4"></i>

                            <p
                                class="text-slate-500 uppercase text-xs font-black tracking-widest">

                                Upload Product Photo

                            </p>

                        </div>

                        <input type="file"
                            accept="image/*"
                            onchange="handleFormImage(this)"
                            class="absolute inset-0 opacity-0 cursor-pointer">

                    </div>

                </div>

                <!-- PRODUCT NAME -->

                <div
                    class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                    <label
                        class="text-xs uppercase text-slate-500 font-black tracking-widest block mb-3">

                        Product Name

                    </label>

                    <input type="text"
                        id="form-name"
                        required
                        placeholder="Enter product name"
                        class="w-full bg-transparent text-white text-xl font-black outline-none">

                </div>

                <!-- SKU -->

                <div
                    class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                    <label
                        class="text-xs uppercase text-slate-500 font-black tracking-widest block mb-3">

                        Barcode / SKU

                    </label>

                    <input type="text"
                        id="form-sku"
                        required
                        placeholder="Barcode"
                        class="w-full bg-transparent text-white text-xl font-black outline-none">

                </div>

                <!-- CATEGORY -->

                <div
                    class="bg-slate-900 border border-slate-800 rounded-[2rem] p-5">

                    <label
                        class="text-xs uppercase text-slate-500 font-black tracking-widest block mb-3">

                        Category

                    </label>

                    <select id="form-category"
                        class="w-full bg-transparent text-white text-lg font-black outline-none">

                        <option value="Beverages">Beverages</option>

                        <option value="Soft Drinks">Soft Drinks</option>

                        <option value="Energy Drinks">Energy Drinks</option>

                        <option value="Snacks">Snacks</option>

                        <option value="Chocolate">Chocolate</option>

                        <option value="Biscuits">Biscuits</option>

                        <option value="Dairy">Dairy</option>

                        <option value="Frozen">Frozen</option>

                        <option value="Ice Cream">Ice Cream</option>

                        <option value="Grains">Grains</option>

                        <option value="Rice">Rice</option>

                        <option value="Oil">Oil</option>

                        <option value="Cleaning">Cleaning</option>

                        <option value="Personal Care">Personal Care</option>

                        <option value="Medicine">Medicine</option>

                        <option value="Electronics">Electronics</option>

                        <option value="Mobile Accessories">Mobile Accessories</option>

                    </select>

                </div>

            </div>

            <!-- RIGHT -->

            <div class="space-y-5">

                <!-- STOCK -->

                <div
                    class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">

                    <h2
                        class="text-white text-xl font-black mb-6">

                        Stock Information

                    </h2>

                    <div class="grid grid-cols-3 gap-4">

                        <div>

                            <label
                                class="text-xs uppercase text-slate-500 font-black block mb-2">

                                Cartons

                            </label>

                            <input type="number"
                                id="form-cartons"
                                value="1"
                                oninput="calculateTotalPieces()"
                                class="w-full bg-slate-800 rounded-2xl p-4 text-center text-white text-xl font-black outline-none">

                        </div>

                        <div>

                            <label
                                class="text-xs uppercase text-slate-500 font-black block mb-2">

                                Pcs/Ctn

                            </label>

                            <input type="number"
                                id="form-pcs-per"
                                value="12"
                                oninput="calculateTotalPieces()"
                                class="w-full bg-slate-800 rounded-2xl p-4 text-center text-white text-xl font-black outline-none">

                        </div>

                        <div>

                            <label
                                class="text-xs uppercase text-primary font-black block mb-2">

                                Total

                            </label>

                            <input type="number"
                                id="form-total-pcs"
                                readonly
                                class="w-full bg-primary/10 rounded-2xl p-4 text-center text-primary text-xl font-black outline-none">

                        </div>

                    </div>

                </div>

                <!-- PRICE -->

                <div
                    class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">

                    <h2
                        class="text-white text-xl font-black mb-6">

                        Price Information

                    </h2>

                    <div class="grid grid-cols-2 gap-4">

                        <div>

                            <label
                                class="text-xs uppercase text-slate-500 font-black block mb-2">

                                Carton Price

                            </label>

                            <input type="number"
                                step="0.01"
                                id="form-carton-price"
                                oninput="calculatePrices('carton')"
                                class="w-full bg-slate-800 rounded-2xl p-5 text-white text-xl font-black outline-none">

                        </div>

                        <div>

                            <label
                                class="text-xs uppercase text-slate-500 font-black block mb-2">

                                Piece Price

                            </label>

                            <input type="number"
                                step="0.01"
                                id="form-piece-price"
                                oninput="calculatePrices('piece')"
                                class="w-full bg-slate-800 rounded-2xl p-5 text-primary text-xl font-black outline-none">

                        </div>

                    </div>

                </div>

                <!-- EXPIRY -->

                <div
                    class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">

                    <label
                        class="text-xs uppercase text-slate-500 font-black block mb-4">

                        Expiry Date

                    </label>

                    <input type="date"
                        id="form-expiry"
                        required
                        class="w-full bg-slate-800 rounded-2xl p-5 text-white text-xl font-black outline-none">

                </div>

                <!-- SAVE -->

                <input type="hidden"
                    id="form-id">

                <button type="submit"
                    id="save-btn"
                    class="w-full bg-primary text-black py-6 rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-green-900/40 active:scale-95 transition-all">

                    Save Product

                </button>

            </div>

        </form>

    </div>

</div>

<!-- ========================= -->
<!-- SCAN RESULT MODAL -->
<!-- ========================= -->

<div id="scan-result-modal"
    class="fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] hidden items-center justify-center p-4">

    <div
        class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">

        <!-- IMAGE -->

        <div class="relative h-72 overflow-hidden">

            <img id="scan-product-image"
                class="w-full h-full object-cover">

            <div
                class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

            <div
                class="absolute bottom-5 left-5 right-5">

                <p id="scan-product-category"
                    class="text-primary uppercase text-xs tracking-widest font-black mb-2">

                    Category

                </p>

                <h1 id="scan-product-name"
                    class="text-4xl font-black text-white leading-tight">

                    Product Name

                </h1>

            </div>

        </div>

        <!-- DETAILS -->

        <div class="p-6 space-y-5">

            <div
                class="grid grid-cols-2 gap-4">

                <div
                    class="bg-slate-800 rounded-2xl p-4">

                    <p
                        class="text-slate-500 text-xs uppercase font-black mb-2">

                        Stock

                    </p>

                    <h2 id="scan-product-stock"
                        class="text-white text-2xl font-black">

                        0 pcs

                    </h2>

                </div>

                <div
                    class="bg-slate-800 rounded-2xl p-4">

                    <p
                        class="text-slate-500 text-xs uppercase font-black mb-2">

                        Expiry

                    </p>

                    <h2 id="scan-product-expiry"
                        class="text-yellow-400 text-lg font-black">

                        00-00-0000

                    </h2>

                </div>

            </div>

            <!-- MORE -->

            <div
                class="bg-slate-800 rounded-[2rem] p-5 space-y-4">

                <div class="flex justify-between">

                    <span class="text-slate-400">
                        Barcode
                    </span>

                    <span id="scan-product-sku"
                        class="font-black text-white">

                    </span>

                </div>

                <div class="flex justify-between">

                    <span class="text-slate-400">
                        Carton Price
                    </span>

                    <span id="scan-product-carton"
                        class="font-black text-primary">

                    </span>

                </div>

                <div class="flex justify-between">

                    <span class="text-slate-400">
                        Piece Price
                    </span>

                    <span id="scan-product-piece"
                        class="font-black text-primary">

                    </span>

                </div>

            </div>

            <!-- BUTTONS -->

            <div class="grid grid-cols-2 gap-4">

                <button onclick="closeScanModal()"
                    class="bg-slate-800 text-white py-5 rounded-2xl font-black uppercase">

                    Close

                </button>

                <button onclick="editProduct(document.getElementById('form-id').value)"
                    class="bg-primary text-black py-5 rounded-2xl font-black uppercase">

                    Edit

                </button>

            </div>

        </div>

    </div>

</div>
