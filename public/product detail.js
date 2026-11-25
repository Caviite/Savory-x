/* ==========================================================
   Savory-X: product detail.js
   The product detail popup on the Products page.

   Load it AFTER product.js. It reuses window.SavoryX from that file
   (products, findProduct, formatPrice, loadCart, saveCart), so there is
   no second product list to keep up to date.

   What it does
   - Clicking a product card opens the popup (the card's link still works
     as a normal link if JavaScript is off).
   - The address becomes products page ?id=5 while the popup is open, so the
     Back button closes it and the link can be shared or refreshed.
   - Quantity, Add to cart, and a "You may also like" row.
   ========================================================== */
(function () {
    'use strict';

    var SX = window.SavoryX;
    var dialog = document.getElementById('pd-dialog');
    if (!SX || !dialog) { return; }

    /* ---------- 1. Settings and elements ---------- */
    var MIN_QTY = 1;
    var MAX_QTY = 10;
    var RELATED_COUNT = 4;
    var FALLBACK_IMAGE = 'images/placeholder.jpg';

    function $(id) { return document.getElementById(id); }

    var el = {
        scroll: $('pd-scroll'),
        body: $('pd-body'),
        image: $('pd-image'),
        category: $('pd-category'),
        name: $('pd-name'),
        price: $('pd-price'),
        description: $('pd-description'),
        minus: $('pd-minus'),
        plus: $('pd-plus'),
        qty: $('pd-qty'),
        add: $('pd-add'),
        addLabel: $('pd-add-label'),
        feedback: $('pd-feedback'),
        cartLink: $('pd-cart-link'),
        related: $('pd-related'),
        relatedSection: $('pd-related-section'),
        close: $('pd-close')
    };

    var currentId = null;   // product shown now
    var originId = null;    // product whose card opened the popup (focus goes back to it)
    var pushed = false;     // true when opening added a history entry
    var closing = false;
    var addedTimer;

    /* ---------- 2. Address bar (?id=5) ---------- */
    function readId() {
        return new URLSearchParams(window.location.search).get('id');
    }

    // mode: 'push' adds a history entry, 'replace' edits the current one.
    // Returns false if the browser refuses (for example a page opened as a file).
    function writeUrl(mode, id) {
        try {
            var url = new URL(window.location.href);
            if (id === null) { url.searchParams.delete('id'); }
            else { url.searchParams.set('id', id); }
            if (mode === 'push') { window.history.pushState({ pd: true }, '', url); }
            else { window.history.replaceState(window.history.state, '', url); }
            return true;
        } catch (e) { return false; }
    }

    /* ---------- 3. Fill the popup ---------- */
    function bigImage(src) {
        return String(src).replace('w=400', 'w=900');
    }

    function setQty(n) {
        n = Math.round(Number(n));
        if (!isFinite(n) || n < MIN_QTY) { n = MIN_QTY; }
        if (n > MAX_QTY) { n = MAX_QTY; }
        el.qty.value = n;
        el.minus.setAttribute('aria-disabled', String(n <= MIN_QTY));
        el.plus.setAttribute('aria-disabled', String(n >= MAX_QTY));
    }

    function resetFeedback() {
        clearTimeout(addedTimer);
        el.feedback.textContent = '';
        el.cartLink.hidden = true;
        el.add.classList.remove('is-added');
        el.addLabel.textContent = 'Add to cart';
    }

    function renderRelated(product) {
        var list = SX.products;
        var start = 0;
        list.forEach(function (p, i) { if (p.id === product.id) { start = i; } });

        // Next products of the same category, wrapping round the list
        var picks = [];
        for (var i = 1; i < list.length && picks.length < RELATED_COUNT; i++) {
            var item = list[(start + i) % list.length];
            if (item.category === product.category) { picks.push(item); }
        }

        el.related.textContent = '';
        picks.forEach(function (item) {
            var li = document.createElement('li');
            var btn = document.createElement('button');
            var img = document.createElement('img');
            var name = document.createElement('span');
            var price = document.createElement('span');

            btn.type = 'button';
            btn.className = 'pd-rel';
            btn.setAttribute('data-related', item.id);

            img.src = item.image;
            img.alt = '';
            img.width = 200;
            img.height = 200;
            img.loading = 'lazy';

            name.className = 'pd-rel-name';
            name.textContent = item.name;
            price.className = 'pd-rel-price';
            price.textContent = SX.formatPrice(item.price);

            btn.appendChild(img);
            btn.appendChild(name);
            btn.appendChild(price);
            li.appendChild(btn);
            el.related.appendChild(li);
        });
        el.relatedSection.hidden = picks.length === 0;
    }

    function fill(product) {
        currentId = product.id;

        el.image.onerror = function () {
            el.image.onerror = null;
            el.image.src = FALLBACK_IMAGE;
        };
        el.image.src = bigImage(product.image);
        el.image.alt = product.name;

        el.category.textContent = product.category;
        el.name.textContent = product.name;
        el.price.textContent = SX.formatPrice(product.price);
        el.description.textContent = product.description;

        setQty(1);
        resetFeedback();
        renderRelated(product);
        el.scroll.scrollTop = 0;
    }

    /* ---------- 4. Open and close ---------- */
    // fromCard: true when a card click opened it (adds a history entry)
    function openProduct(id, fromCard) {
        var product = SX.findProduct(id);
        if (!product) { return; }

        var wasOpen = dialog.open;
        fill(product);

        if (wasOpen) {
            // Switching to a related product: same popup, new content
            writeUrl('replace', product.id);
            el.body.classList.remove('is-fresh');
            void el.body.offsetWidth;   // restart the fade
            el.body.classList.add('is-fresh');
        } else {
            originId = product.id;
            closing = false;
            dialog.classList.remove('is-closing');
            document.documentElement.classList.add('pd-lock');
            dialog.showModal();
            if (fromCard) { pushed = writeUrl('push', product.id); }
        }

        // Screen readers read the product name first
        el.name.focus({ preventScroll: true });
    }

    function requestClose() {
        if (!dialog.open || closing) { return; }
        closing = true;
        dialog.classList.add('is-closing');

        // Wait as long as the closing animation lasts (0 if motion is reduced)
        var ms = (parseFloat(window.getComputedStyle(dialog).animationDuration) || 0) * 1000;
        setTimeout(function () {
            if (dialog.open) { dialog.close(); }
        }, ms);
    }

    function focusBack() {
        var card = originId !== null &&
            document.querySelector('.card-link[href$="?id=' + originId + '"]');
        var target = card || $('search') || document.body;
        originId = null;
        target.focus();
    }

    // Runs after every close: the close button, Esc, a backdrop click or the Back button
    dialog.addEventListener('close', function () {
        closing = false;
        dialog.classList.remove('is-closing');
        document.documentElement.classList.remove('pd-lock');
        resetFeedback();
        currentId = null;

        if (readId() === null) {          // closed with the Back button: the address is already clean
            pushed = false;
            focusBack();
        } else if (pushed) {              // undo the entry we added when opening
            pushed = false;
            window.addEventListener('popstate', function once() {
                window.removeEventListener('popstate', once);
                setTimeout(focusBack, 0); // after product.js redraws the grid
            });
            window.history.back();
        } else {                          // opened from a shared link: just clean the address
            writeUrl('replace', null);
            focusBack();
        }
    });

    // Esc: play the closing animation instead of closing at once
    dialog.addEventListener('cancel', function (e) {
        e.preventDefault();
        requestClose();
    });

    // Click on the dark backdrop (the dialog itself has no padding)
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog) { requestClose(); }
    });

    el.close.addEventListener('click', requestClose);

    // Keep keys typed inside the popup away from the page's keyboard shortcuts
    // (otherwise A or V here could act on a card behind the popup)
    dialog.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') { e.stopPropagation(); }
    });

    /* ---------- 5. Quantity and Add to cart ---------- */
    el.minus.addEventListener('click', function () { setQty(Number(el.qty.value) - 1); });
    el.plus.addEventListener('click', function () { setQty(Number(el.qty.value) + 1); });
    el.qty.addEventListener('change', function () { setQty(el.qty.value); });

    el.add.addEventListener('click', function () {
        var product = SX.findProduct(currentId);
        if (!product) { return; }

        setQty(el.qty.value);
        var amount = Number(el.qty.value);

        var items = SX.loadCart();
        var line = items.find(function (i) { return Number(i.id) === product.id; });
        if (line) { line.qty = Number(line.qty) + amount; }
        else { items.push({ id: product.id, qty: amount }); }
        SX.saveCart(items);   // also updates the cart badge

        // The page's own toast sits behind the popup, so confirm inside it
        el.feedback.textContent = 'Added ' + amount + ' \u00D7 ' + product.name + ' to your cart.';
        el.cartLink.hidden = false;
        el.add.classList.add('is-added');
        el.addLabel.textContent = 'Added';
        clearTimeout(addedTimer);
        addedTimer = setTimeout(function () {
            el.add.classList.remove('is-added');
            el.addLabel.textContent = 'Add to cart';
        }, 1800);
    });

    /* ---------- 6. Related products and card clicks ---------- */
    el.related.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-related]');
        if (btn) { openProduct(Number(btn.getAttribute('data-related')), false); }
    });

    document.addEventListener('click', function (e) {
        var link = e.target.closest('.card-link');
        if (!link) { return; }
        // Let "open in new tab" style clicks work normally
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }

        var id = new URL(link.getAttribute('href'), window.location.href).searchParams.get('id');
        var product = id && SX.findProduct(id);
        if (!product) { return; }

        e.preventDefault();
        openProduct(product.id, true);
    });

    /* ---------- 7. Back and Forward buttons, and shared links ---------- */
    window.addEventListener('popstate', function () {
        var product = SX.findProduct(readId());
        if (product) {
            if (!dialog.open) { openProduct(product.id, false); }
            else if (currentId !== product.id) { fill(product); }
        } else if (dialog.open) {
            pushed = false;   // that history entry has just been used up
            requestClose();
        }
    });

    var startId = readId();
    if (startId !== null) {
        var startProduct = SX.findProduct(startId);
        if (startProduct) { openProduct(startProduct.id, false); }
        else { writeUrl('replace', null); }   // unknown id: tidy the address
    }

    setQty(MIN_QTY);
})();