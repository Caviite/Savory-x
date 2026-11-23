/* ==========================================================
   Savory-X: cart.js
   Cart page logic. Loaded after product.js, which shares its
   helpers on window.SavoryX (findProduct, formatPrice, loadCart,
   saveCart, updateCartCount, announce). Anything missing falls
   back to a small local version, except findProduct (required).
   ========================================================== */
(() => {
    'use strict';

    if (document.body.dataset.page !== 'cart') return;

    const SX = window.SavoryX || {};
    if (typeof SX.findProduct !== 'function') {
        console.error('cart.js: window.SavoryX.findProduct is missing. Load product.js before cart.js.');
        const note = document.createElement('p');
        note.className = 'cart-noscript';
        note.textContent = 'The cart could not load. Please refresh the page.';
        const main = document.querySelector('main');
        if (main) main.appendChild(note);
        return;
    }

    /* ---------- Settings ---------- */
    const CART_KEY = 'savoryx-cart';
    const PLACEHOLDER = 'images/placeholder.jpg';
    const PRODUCT_PAGE = 'product.html'; // same link the product cards use: product.html?id=<id>
    const MAX_QTY = 99;                         // used when a product has no numeric stock
    const REMOVE_MS = 220;                      // must match the .is-removing transition in cart.css

    /* ---------- Page elements ---------- */
    const $ = (sel, root = document) => root.querySelector(sel);
    const list = $('#cart-items');
    const content = $('#cart-content');
    const emptyBox = $('#cart-empty');
    const emptyTitle = $('#cart-empty-title');
    const headingCount = $('#cart-heading-count');
    const subtotalEl = $('#subtotal');
    const deliveryEl = $('#delivery');
    const totalEl = $('#total');
    const openBtn = $('#open-summary');
    const openTotal = $('#open-summary-total');
    const summary = $('#order-summary');
    const closeBtn = $('#close-summary');
    const overlay = $('#drawer-overlay');
    const grab = $('.drawer-grab', summary);

    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Shared helpers (use product.js versions when present) ---------- */
    const money = (n) => typeof SX.formatPrice === 'function'
        ? SX.formatPrice(n)
        : '\u20A6' + Number(n).toLocaleString('en-NG');

    const productUrl = (id) => typeof SX.productUrl === 'function'
        ? SX.productUrl(id)
        : PRODUCT_PAGE + '?id=' + encodeURIComponent(id);

    function announce(message) {
        if (typeof SX.announce === 'function') { SX.announce(message); return; }
        const box = $('#status-message');
        if (!box) return;
        box.textContent = '';
        setTimeout(() => { box.textContent = message; }, 50);
    }

    function readCart() {
        try {
            const raw = typeof SX.loadCart === 'function'
                ? SX.loadCart()
                : JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch (err) {
            return [];                       // bad JSON counts as an empty cart
        }
    }

    function writeCart(cart) {
        if (typeof SX.saveCart === 'function') {
            SX.saveCart(cart);
        } else {
            try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) { /* storage blocked */ }
        }
        if (typeof SX.updateCartCount === 'function') {
            SX.updateCartCount();
        } else {
            const badge = $('#cart-count');
            if (badge) badge.textContent = String(cart.length);
        }
    }

    const esc = (value) => String(value).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const stockOf = (p) => typeof p.stock === 'number' && Number.isFinite(p.stock)
        ? Math.max(0, Math.min(Math.floor(p.stock), MAX_QTY))
        : MAX_QTY;

    /* ---------- Cart data ---------- */
    let cart = [];   // [{ id, qty }], always clean

    /* Clean the saved cart: unknown or sold-out products dropped,
       duplicate ids merged, quantity a whole number from 1 up to stock. */
    function normalise(raw) {
        const merged = new Map();
        raw.forEach((entry) => {
            if (!entry || entry.id === undefined || entry.id === null) return;
            const p = SX.findProduct(entry.id);
            if (!p) return;
            const stock = stockOf(p);
            if (stock < 1) return;
            const qty = Math.floor(Number(entry.qty));
            const safe = Number.isFinite(qty) && qty >= 1 ? qty : 1;
            const key = String(p.id);
            const total = (merged.get(key) ? merged.get(key).qty : 0) + safe;
            merged.set(key, { id: p.id, qty: Math.min(total, stock) });
        });
        return [...merged.values()];
    }

    function loadCleanCart() {
        const raw = readCart();
        const clean = normalise(raw);
        if (JSON.stringify(clean) !== JSON.stringify(raw)) writeCart(clean);
        cart = clean;
    }

    const findEntry = (id) => cart.find((e) => String(e.id) === String(id));

    function calcTotals() {
        let subtotal = 0;
        cart.forEach((e) => {
            const p = SX.findProduct(e.id);
            subtotal += (Number(p.price) || 0) * e.qty;
        });
        return { subtotal };
    }

    /* ---------- Drawing ---------- */
    const trashIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

    function cartItemHtml(p, qty, isNew) {
        const stock = stockOf(p);
        const name = esc(p.name);
        const id = esc(p.id);
        const price = Number(p.price) || 0;
        const minusOff = qty <= 1 ? ' aria-disabled="true"' : '';
        const plusOff = qty >= stock ? ' aria-disabled="true"' : '';

        return `
<li class="cart-item${isNew ? ' is-new' : ''}" data-id="${id}">
  <div class="cart-item-media">
    <img src="${esc(p.image || PLACEHOLDER)}" alt="${esc(p.alt || p.name)}" width="240" height="240" loading="lazy">
  </div>
  <div class="cart-item-info">
    ${p.category ? `<p class="cart-item-category">${esc(capitalise(String(p.category)))}</p>` : ''}
    <h2 class="cart-item-name"><a href="${esc(productUrl(p.id))}">${name}</a></h2>
    ${p.description ? `<p class="cart-item-desc">${esc(p.description)}</p>` : ''}
    <p class="price">${money(price)}</p>
    <p class="line-total">Item subtotal: <strong>${money(price * qty)}</strong></p>
    <div class="cart-item-actions">
      <div class="quantity" role="group" aria-label="Quantity for ${name}">
        <button class="qty-btn" type="button" data-qty="minus" aria-label="Decrease quantity of ${name}"${minusOff}>&minus;</button>
        <span class="qty-value">${qty}</span>
        <button class="qty-btn" type="button" data-qty="plus" aria-label="Increase quantity of ${name}"${plusOff}>+</button>
      </div>
      <button class="remove-btn" type="button" data-remove="${id}" aria-label="Remove ${name} from cart">${trashIcon}</button>
    </div>
  </div>
</li>`;
    }

    function renderSummary() {
        const { subtotal } = calcTotals();
        // Number of different products, not the total quantity
        headingCount.textContent = cart.length + (cart.length === 1 ? ' item' : ' items');
        subtotalEl.textContent = money(subtotal);
        deliveryEl.textContent = 'Calculated at checkout';
        totalEl.textContent = money(subtotal);
        openTotal.textContent = money(subtotal);
    }

    /* focus = { id, control: 'plus' | 'minus' | 'remove' | 'link' } or { empty: true } */
    function renderCart(focus, isFirst) {
        const empty = cart.length === 0;
        content.hidden = empty;
        emptyBox.hidden = !empty;

        if (empty) {
            closeDrawer(true);
            headingCount.textContent = '0 items';
            list.innerHTML = '';
        } else {
            list.innerHTML = cart.map((e) => cartItemHtml(SX.findProduct(e.id), e.qty, isFirst)).join('');
            renderSummary();
        }

        if (!focus) return;
        if (focus.empty) { emptyTitle.focus(); return; }
        const li = [...list.children].find((el) => el.dataset.id === String(focus.id));
        if (!li) return;
        const target = focus.control === 'link' ? li.querySelector('.cart-item-name a')
            : focus.control === 'remove' ? li.querySelector('[data-remove]')
                : li.querySelector(`[data-qty="${focus.control}"]`);
        if (target) target.focus();
    }

    /* ---------- Actions ---------- */
    function changeQty(id, delta) {
        const entry = findEntry(id);
        const p = SX.findProduct(id);
        if (!entry || !p) return;

        const next = entry.qty + delta;
        const stock = stockOf(p);

        if (next < 1) {
            announce('Minimum quantity is 1. Use Remove to take ' + p.name + ' out of the cart.');
            return;
        }
        if (next > stock) {
            announce('Only ' + stock + ' available');
            return;
        }

        entry.qty = next;
        writeCart(cart);
        renderCart({ id: entry.id, control: delta > 0 ? 'plus' : 'minus' });
        announce(p.name + ', quantity ' + next + ', item subtotal ' + money((Number(p.price) || 0) * next));
    }

    function removeItem(id, li) {
        if (li && li.classList.contains('is-removing')) return;
        const p = SX.findProduct(id);
        const name = p ? p.name : 'Item';

        const finish = () => {
            const index = cart.findIndex((e) => String(e.id) === String(id));
            if (index === -1) return;
            cart.splice(index, 1);
            writeCart(cart);
            const next = cart[index] || cart[index - 1];
            renderCart(next ? { id: next.id, control: 'link' } : { empty: true });
            announce(name + ' removed from cart');
        };

        if (!li || reducedMotion()) { finish(); return; }
        li.classList.add('is-removing');
        setTimeout(finish, REMOVE_MS);
    }

    list.addEventListener('click', (e) => {
        const qtyBtn = e.target.closest('[data-qty]');
        if (qtyBtn) {
            const li = qtyBtn.closest('.cart-item');
            changeQty(li.dataset.id, qtyBtn.dataset.qty === 'plus' ? 1 : -1);
            return;
        }
        const removeBtn = e.target.closest('[data-remove]');
        if (removeBtn) removeItem(removeBtn.dataset.remove, removeBtn.closest('.cart-item'));
    });

    /* Broken product image: fall back to the placeholder once */
    list.addEventListener('error', (e) => {
        const img = e.target;
        if (img.tagName === 'IMG' && !img.dataset.fallback) {
            img.dataset.fallback = '1';
            img.src = PLACEHOLDER;
        }
    }, true);

    /* ---------- Order summary drawer (phones only) ---------- */
    const mobileMQ = window.matchMedia('(max-width: 767px)');
    const backgroundParts = () => document.querySelectorAll('.site-header, .cart-heading, .cart-main, .site-footer');
    let drawerOpen = false;
    let lastTrigger = null;

    function openDrawer() {
        if (!mobileMQ.matches || drawerOpen || cart.length === 0) return;
        drawerOpen = true;
        lastTrigger = document.activeElement;
        summary.setAttribute('role', 'dialog');
        summary.setAttribute('aria-modal', 'true');
        summary.classList.add('is-open');
        overlay.classList.add('is-visible');
        document.body.classList.add('drawer-open');
        openBtn.setAttribute('aria-expanded', 'true');
        backgroundParts().forEach((el) => { el.inert = true; });
        requestAnimationFrame(() => closeBtn.focus({ preventScroll: true }));
    }

    function closeDrawer(skipFocus) {
        if (!drawerOpen) return;
        drawerOpen = false;
        summary.classList.remove('is-dragging', 'is-open');
        summary.style.transform = '';
        summary.removeAttribute('role');
        summary.removeAttribute('aria-modal');
        overlay.classList.remove('is-visible');
        document.body.classList.remove('drawer-open');
        openBtn.setAttribute('aria-expanded', 'false');
        backgroundParts().forEach((el) => { el.inert = false; });
        if (!skipFocus && lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    }

    openBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', () => closeDrawer());
    overlay.addEventListener('click', () => closeDrawer());

    mobileMQ.addEventListener('change', (e) => { if (!e.matches) closeDrawer(true); });

    document.addEventListener('keydown', (e) => {
        if (!drawerOpen) return;
        if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
        if (e.key !== 'Tab') return;
        const items = [...summary.querySelectorAll('a[href], button:not([disabled])')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* Drag the handle or heading downward to close */
    let dragging = false;
    let startY = 0;
    let startTime = 0;
    let dragY = 0;

    grab.addEventListener('pointerdown', (e) => {
        if (!drawerOpen || e.target.closest('button')) return;
        dragging = true;
        startY = e.clientY;
        startTime = e.timeStamp;
        dragY = 0;
        grab.setPointerCapture(e.pointerId);
        summary.classList.add('is-dragging');
    });

    grab.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        dragY = Math.max(0, e.clientY - startY);
        summary.style.transform = 'translateY(' + dragY + 'px)';
    });

    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        summary.classList.remove('is-dragging');
        const speed = dragY / Math.max(1, e.timeStamp - startTime);
        if (dragY > 90 || (dragY > 30 && speed > 0.5)) closeDrawer();
        else summary.style.transform = '';
    };
    grab.addEventListener('pointerup', endDrag);
    grab.addEventListener('pointercancel', endDrag);

    /* ---------- Keep in sync ---------- */
    // The cart changed in another tab
    window.addEventListener('storage', (e) => {
        if (e.key === CART_KEY || e.key === null) { loadCleanCart(); renderCart(); }
    });

    // Page restored from the back/forward cache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) { loadCleanCart(); renderCart(); }
    });

    /* ---------- Start ---------- */
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    loadCleanCart();
    renderCart(null, true);
})();