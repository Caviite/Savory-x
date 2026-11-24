/* ==========================================================
   Savory-X: products.js
   ========================================================== */
(function () {
    'use strict';

    /* ---------- 1. 30 Sample Products ---------- */
    // Note: Using Unsplash for demo images. Replace with local files later.
    var PRODUCTS = [
        // Kitchen
        { id: 1, name: 'Ceramic Mug', category: 'kitchen', price: 4500, description: 'Hand-glazed stoneware mug.', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80' },
        { id: 2, name: 'Electric Kettle', category: 'kitchen', price: 14500, description: 'Quiet 1.7L kettle with plastic handle.', image: 'https://i.pinimg.com/736x/dc/a3/bb/dca3bb96e3e5e042aabe99b76a41f47f.jpg' },
        { id: 3, name: 'Wooden Spoons', category: 'kitchen', price: 3500, description: 'Premium Acacia Wood Cooking Utensils Set', image: 'https://i.pinimg.com/1200x/71/78/79/717879fea59fdb2ffc4c4d291d7cba7e.jpg' },
        { id: 4, name: 'Glass Storage Jar', category: 'kitchen', price: 5500, description: 'Airtight borosilicate glass jar.', image: 'https://i.pinimg.com/736x/7e/fa/f6/7efaf6659ec6b637a842c8666ac3945e.jpg' },
        { id: 5, name: 'Marble Coasters', category: 'kitchen', price: 3800, description: 'Set of 4 marble coasters.', image: 'https://images.unsplash.com/photo-1611486212557-88be5ff6f941?auto=format&fit=crop&w=400&q=80' },
        { id: 6, name: 'Bamboo Cutting Board', category: 'kitchen', price: 7500, description: 'Solid bamboo cutting board.', image: 'https://i.pinimg.com/736x/08/bb/dd/08bbddaced29cec4228f6f5e3411ae8d.jpg' },
        { id: 7, name: 'Stainless Water Bottle', category: 'kitchen', price: 4200, description: '750ml water bottle.', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80' },
        { id: 8, name: 'Chef Knife', category: 'kitchen', price: 12000, description: 'Stainless steel 8-inch chef knife.', image: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=400&q=80' },
        { id: 9, name: 'Pour Over Coffee Maker', category: 'kitchen', price: 8500, description: 'Glass pour-over coffee dripper.', image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80' },
        { id: 10, name: 'Cast Iron Skillet', category: 'kitchen', price: 11000, description: 'Pre-seasoned 10-inch cast iron pan.', image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?auto=format&fit=crop&w=400&q=80' },

        // House
        { id: 11, name: 'Linen Table Runner', category: 'house', price: 9000, description: 'Soft stone-washed linen runner.', image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=400&q=80' },
        { id: 12, name: 'Cotton Throw Blanket', category: 'house', price: 15000, description: 'Breathable cotton throw for the sofa.', image: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?auto=format&fit=crop&w=400&q=80' },
        { id: 13, name: 'Ceramic Planter', category: 'house', price: 6500, description: 'Minimalist ceramic pot for indoor plants.', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=400&q=80' },
        { id: 14, name: 'Scented Candle', category: 'house', price: 4800, description: 'Soy wax candle with lavender scent.', image: 'https://i.pinimg.com/236x/ee/89/db/ee89db66699a9735ae22df44ad01cea3.jpg' },
        { id: 15, name: 'Woven Storage Basket', category: 'house', price: 7200, description: 'Handwoven seagrass basket.', image: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=400&q=80' },
        { id: 16, name: 'Wooden Picture Frame', category: 'house', price: 5200, description: 'A4 solid oak picture frame.', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80' },
        { id: 17, name: 'Door Mat', category: 'house', price: 6000, description: 'Durable coir door mat.', image: '`https://i.pinimg.com/736x/74/51/2e/74512e33fc1d862880ad96ea9a57c2a8.jpg' },
        { id: 18, name: 'Laundry Hamper', category: 'house', price: 9500, description: 'Fabric laundry hamper with handles.', image: 'https://i.pinimg.com/736x/ba/6e/59/ba6e5963008e031cdfbfa4ab3c40637b.jpg' },
        { id: 19, name: 'Wall Clock', category: 'house', price: 8500, description: 'Minimalist wooden wall clock.', image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=400&q=80' },
        { id: 20, name: 'Throw Pillow Cover', category: 'house', price: 4500, description: 'Cotton canvas pillow cover.', image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=400&q=80' },

        // Workspace
        { id: 21, name: 'Desk Organizer', category: 'workspace', price: 8000, description: 'Wooden caddy for pens and notes.', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' },
        { id: 22, name: 'Desk Lamp', category: 'workspace', price: 12000, description: 'Adjustable metal lamp with 3 levels.', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=400&q=80' },
        { id: 23, name: 'Leather Notebook', category: 'workspace', price: 5800, description: 'A5 leather-bound notebook.', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' },
        { id: 24, name: 'Ergonomic Mouse', category: 'workspace', price: 9500, description: 'Wireless ergonomic mouse.', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80' },
        { id: 25, name: 'Mechanical Keyboard', category: 'workspace', price: 18000, description: 'Compact mechanical keyboard.', image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=400&q=80' },
        { id: 26, name: 'Monitor Stand', category: 'workspace', price: 10500, description: 'Wooden monitor riser.', image: 'https://images.unsplash.com/photo-1593640495253-23196b27a87f?auto=format&fit=crop&w=400&q=80' },
        { id: 27, name: 'Pen Holder', category: 'workspace', price: 2800, description: 'Concrete pen holder.', image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=400&q=80' },
        { id: 28, name: 'Laptop Sleeve', category: 'workspace', price: 7500, description: 'Felt 13-inch laptop sleeve.', image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=400&q=80' },
        { id: 29, name: 'Cable Organizer', category: 'workspace', price: 3200, description: 'Leather cable clips.', image: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=400&q=80' },
        { id: 30, name: 'Whiteboard', category: 'workspace', price: 14000, description: 'Small magnetic whiteboard.', image: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=400&q=80' }
    ];

    /* ---------- 2. State & Setup ---------- */
    var CART_KEY = 'savoryx-cart';
    var state = {
        search: '',
        category: 'all',
        sort: 'default'
    };

    var grid = document.getElementById('product-grid');
    var emptyState = document.getElementById('empty-state');
    var resultsCount = document.getElementById('results-count');
    var countBadge = document.getElementById('product-count-badge');
    var searchInput = document.getElementById('search');
    var sortSelect = document.getElementById('sort');
    var filterBtns = document.querySelectorAll('.filter-btn');
    var clearBtn = document.getElementById('clear-filters');

    /* ---------- 3. Cart Helpers ---------- */
    function readCart() {
        try {
            var raw = localStorage.getItem(CART_KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function saveCart(items) {
        try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { }
        paintCartCount();
    }

    function paintCartCount() {
        // Number of different products in the cart (not the total quantity)
        var n = readCart().filter(function (line) { return Number(line.qty) > 0; }).length;
        var el = document.getElementById('cart-count');
        if (!el) { return; }
        el.textContent = n;
        if (n === 0) { el.setAttribute('hidden', ''); }
        else { el.removeAttribute('hidden'); }
    }

    function addToCart(id) {
        var items = readCart();
        var existing = items.find(function (i) { return i.id === id; });
        if (existing) { existing.qty += 1; }
        else { items.push({ id: id, qty: 1 }); }
        saveCart(items);

        var product = PRODUCTS.find(function (p) { return p.id === id; });
        if (product) { toast(product.name + ' added to cart'); }
    }

    /* ---------- 4. Toast ---------- */
    var toastTimer;
    function toast(message) {
        var el = document.querySelector('.toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2200);
    }

    /* ---------- 4b. Shared with other pages (cart.js uses this) ---------- */
    function findProduct(id) {
        return PRODUCTS.find(function (p) { return String(p.id) === String(id); });
    }

    function formatPrice(n) {
        return '₦' + Number(n).toLocaleString('en-NG');
    }

    function announce(message) {
        var box = document.getElementById('status-message');
        if (!box) { return; }
        box.textContent = '';
        setTimeout(function () { box.textContent = message; }, 50);
    }

    window.SavoryX = {
        products: PRODUCTS,
        findProduct: findProduct,
        formatPrice: formatPrice,
        loadCart: readCart,
        saveCart: saveCart,
        updateCartCount: paintCartCount,
        addToCart: addToCart,
        announce: announce
    };

    // Pages without the product grid (cart, checkout, track...) only need the shared parts.
    if (!grid) {
        setupCommon();
        return;
    }

    /* ---------- 5. Core Functions ---------- */
    function render() {
        // Filter
        var filtered = PRODUCTS.filter(function (p) {
            var matchesSearch = (p.name + ' ' + p.category + ' ' + p.description).toLowerCase().includes(state.search.toLowerCase());
            var matchesCategory = state.category === 'all' || p.category === state.category;
            return matchesSearch && matchesCategory;
        });

        // Sort
        if (state.sort === 'price-asc') {
            filtered.sort(function (a, b) { return a.price - b.price; });
        } else if (state.sort === 'price-desc') {
            filtered.sort(function (a, b) { return b.price - a.price; });
        } else if (state.sort === 'name-asc') {
            filtered.sort(function (a, b) { return a.name.localeCompare(b.name); });
        }

        // Render Cards
        grid.innerHTML = filtered.map(function (p) {
            return '<li class="product-card">' +
                '<article>' +
                '<div class="card-media">' +
                '<img src="' + p.image + '" alt="' + p.name + '" width="400" height="400" loading="lazy">' +
                '</div>' +
                '<div class="card-body">' +
                '<span class="card-category">' + p.category + '</span>' +
                '<h3>' + p.name + '</h3>' +
                '<div class="card-bottom">' +
                '<p class="price">\u20A6' + p.price.toLocaleString('en-NG') + '</p>' +
                '<button class="cart-fab" type="button" data-add="' + p.id + '" aria-label="Add ' + p.name + ' to cart">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/></svg>' +
                '</button>' +
                '</div>' +
                '</div>' +
                '<a class="card-link" href="product.html?id=' + p.id + '" aria-label="View ' + p.name + '"></a>' +
                '</article>' +
                '</li>';
        }).join('');

        // Update counts
        resultsCount.textContent = 'Showing ' + filtered.length + ' product' + (filtered.length === 1 ? '' : 's');
        countBadge.textContent = '(' + PRODUCTS.length + ')';

        // Empty state
        if (filtered.length === 0) {
            emptyState.hidden = false;
            clearBtn.hidden = false;
        } else {
            emptyState.hidden = true;
        }

        // Show/hide clear button
        var isDirty = state.search !== '' || state.category !== 'all' || state.sort !== 'default';
        clearBtn.hidden = !isDirty;
    }

    function updateState() {
        // Sync controls to state
        searchInput.value = state.search;
        sortSelect.value = state.sort;
        filterBtns.forEach(function (btn) {
            var active = btn.getAttribute('data-filter') === state.category;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active);
        });

        // Sync URL
        var url = new URL(window.location);
        if (state.search) url.searchParams.set('q', state.search); else url.searchParams.delete('q');
        if (state.category !== 'all') url.searchParams.set('category', state.category); else url.searchParams.delete('category');
        if (state.sort !== 'default') url.searchParams.set('sort', state.sort); else url.searchParams.delete('sort');
        window.history.replaceState({}, '', url);

        render();
    }

    function initFromURL() {
        var params = new URLSearchParams(window.location.search);
        state.search = params.get('q') || '';
        state.category = params.get('category') || 'all';
        state.sort = params.get('sort') || 'default';

        // Validate category
        var validCats = ['all', 'kitchen', 'house', 'workspace'];
        if (!validCats.includes(state.category)) state.category = 'all';

        // Validate sort
        var validSorts = ['default', 'price-asc', 'price-desc', 'name-asc'];
        if (!validSorts.includes(state.sort)) state.sort = 'default';

        updateState();
    }

    /* ---------- 6. Event Listeners ---------- */
    var debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            state.search = searchInput.value.trim();
            updateState();
        }, 200);
    });

    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.category = btn.getAttribute('data-filter');
            updateState();
        });
    });

    sortSelect.addEventListener('change', function () {
        state.sort = sortSelect.value;
        updateState();
    });

    clearBtn.addEventListener('click', function () {
        state.search = '';
        state.category = 'all';
        state.sort = 'default';
        updateState();
        searchInput.focus();
    });

    // Delegated cart listener
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-add]');
        if (!btn) return;
        e.preventDefault();
        addToCart(Number(btn.getAttribute('data-add')));
    });

    window.addEventListener('popstate', function () {
        initFromURL();
    });

    /* ---------- 7. Start ---------- */
    paintCartCount();
    initFromURL();

    // Dynamic Typewriter Width
    var typewriterEl = document.getElementById('page-title');
    if (typewriterEl) {
        var chars = typewriterEl.textContent.trim().length;
        typewriterEl.style.setProperty('--tw-chars', chars + 'ch');
        typewriterEl.style.animation = 'typing 1.2s steps(' + chars + ', end) forwards, caret 0.75s step-end 2';
    }

    setupCommon();

    /* ---------- 8. Parts every page needs: cart badge, year, shortcuts popup ---------- */
    function setupCommon() {
        paintCartCount();

        // Set year
        var yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // Shortcuts Dialog Logic
        var dialog = document.getElementById('shortcuts-dialog');
        var btnOpen = document.getElementById('shortcuts-btn');
        var btnClose = document.getElementById('close-shortcuts');

        if (btnOpen && dialog) {
            btnOpen.addEventListener('click', function () { dialog.showModal(); });
        }
        if (btnClose && dialog) {
            btnClose.addEventListener('click', function () { dialog.close(); });
        }
        if (dialog) {
            dialog.addEventListener('click', function (e) {
                if (e.target === dialog) dialog.close();
            });
        }
    }
})();