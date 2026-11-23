/* ==========================================================
   Savory-X: shortcuts.js
   Keyboard shortcuts for every page.

   HOW IT WORKS (in plain words)
   1. One list called "bindings" says which key does what, and on
      which page.
   2. One listener watches every key press and looks the key up in
      that list.
   3. The same list builds the help window and the little key
      labels, so they can never disagree with what the keys do.

   SAFETY RULES
   - Shortcuts never fire while you are typing in a box.
   - Shortcuts never fire with Ctrl, Alt or Cmd held down, so the
     browser's own shortcuts (Ctrl+C, Ctrl+F ...) keep working.
   - People can switch shortcuts off (WCAG 2.1.4). The choice is
     remembered in the browser.
   ========================================================== */
(function () {
    'use strict';

    var page = document.body.getAttribute('data-page');
    var STORAGE_KEY = 'savoryx-shortcuts';
    var SHOP_PAGES = ['home', 'products', 'product'];

    var enabled = readSetting();
    var dialog = null;
    var lastFocused = null;
    var observer = null;
    var main = null;

    /* ---------- Small helpers ---------- */

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function $$(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    function makeEl(tag, className, text) {
        var el = document.createElement(tag);
        if (className) { el.className = className; }
        if (text) { el.textContent = text; }
        return el;
    }

    // Says something to screen-reader users through the hidden live region
    function announce(message) {
        var region = $('#status-message');
        if (!region) { return; }
        region.textContent = '';
        setTimeout(function () { region.textContent = message; }, 50);
    }

    function click(selector, root) {
        var el = $(selector, root);
        if (el && !el.disabled) { el.click(); return true; }
        return false;
    }

    function focusField(selector) {
        var el = $(selector);
        if (el) { el.focus(); }
    }

    function goPage(name, url, label) {
        if (page === name) {
            announce('You are already on the ' + label + ' page.');
            return;
        }
        window.location.href = url;
    }

    /* ---------- On / off switch (remembered in the browser) ---------- */

    function readSetting() {
        try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch (e) { return true; }
    }

    function saveSetting(value) {
        try { localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off'); } catch (e) { /* storage blocked: fine */ }
    }

    function setEnabled(value) {
        enabled = value;
        saveSetting(value);
        document.documentElement.classList.toggle('shortcuts-off', !value);
        if (value) {
            refreshHints();
        } else {
            $$('[aria-keyshortcuts]').forEach(function (el) { el.removeAttribute('aria-keyshortcuts'); });
        }
    }

    /* ---------- Choosing a product or cart item with the arrow keys ---------- */

    function getCards() {
        return $$('.product-card, .cart-item');
    }

    // The product card (or cart item) that currently has keyboard focus inside it
    function cardWithFocus() {
        var active = document.activeElement;
        return active && active.closest ? active.closest('.product-card, .cart-item') : null;
    }

    function moveSelection(step) {
        var cards = getCards();
        if (!cards.length) { return; }
        var index = cards.indexOf(cardWithFocus());
        var next;
        if (index === -1) {
            next = step > 0 ? 0 : cards.length - 1;
        } else {
            next = Math.max(0, Math.min(cards.length - 1, index + step));
        }
        var target = $('a, button', cards[next]);
        if (target) { target.focus(); }
        announce((next + 1) + ' of ' + cards.length);
    }

    /* ---------- What the keys do ---------- */

    function viewProduct() {
        var card = cardWithFocus();
        if (!card && page !== 'product') { card = $('.product-card'); }
        if (!card) {
            announce('First choose a product with the left or right arrow key.');
            return;
        }
        click('a[href^="product.html"]', card);
    }

    function addChosenProduct() {
        var card = cardWithFocus();
        if (card && click('[data-add]', card)) { return; }
        if (page === 'product') { click('#add-to-cart'); return; }
        if (!card) {
            card = $('.product-card');
            if (card) { click('[data-add]', card); }
        }
    }

    function clearFilters() {
        var search = $('#search');
        var category = $('#category');
        var sort = $('#sort');
        if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); }
        if (category) { category.value = 'all'; category.dispatchEvent(new Event('change', { bubbles: true })); }
        if (sort) { sort.value = 'default'; sort.dispatchEvent(new Event('change', { bubbles: true })); }
        announce('Search and filters cleared.');
    }

    function changeCartItem(selector) {
        var item = cardWithFocus();
        if (!item || !item.classList.contains('cart-item')) {
            announce('First choose an item with the left or right arrow key.');
            return;
        }
        click(selector, item);
    }

    function paymentSectionIsOpen() {
        var section = $('#payment-section');
        return section && !section.hidden;
    }

    function continueToPayment() {
        if (paymentSectionIsOpen()) {
            announce('You are already on the payment step.');
            return;
        }
        click('#details-form button[type="submit"]');
    }

    function copyDetail(id) {
        if (!paymentSectionIsOpen()) {
            announce('The bank details appear after you continue to payment.');
            return;
        }
        click('[data-copy="' + id + '"]');
    }

    function advance(step) {
        click('[data-advance="' + step + '"]');
    }

    /* ---------- The key list ----------
       keys:  the key(s) that trigger it (lowercase)
       pages: 'all' or a list of page names (the data-page value on <body>)
       text:  the plain-English sentence shown in the help window
       hint:  (optional) which buttons/links get a little key label
       run:   what happens                                             */
    var bindings = [
        // ----- Every page -----
        { keys: ['h'], pages: 'all', text: 'Go to the Home page.', hint: '.site-nav a[href="index.html"]', run: function () { goPage('home', 'index.html', 'Home'); } },
        { keys: ['p'], pages: 'all', text: 'Go to the Products page.', hint: '.site-nav a[href="products.html"]', run: function () { goPage('products', 'products.html', 'Products'); } },
        { keys: ['t'], pages: 'all', text: 'Go to the Track order page.', hint: '.site-nav a[href="track.html"]', run: function () { goPage('track', 'track.html', 'Track order'); } },
        { keys: ['c'], pages: 'all', text: 'Go to your cart.', hint: '.site-nav a[href="cart.html"]', run: function () { goPage('cart', 'cart.html', 'Cart'); } },
        { keys: ['?'], pages: 'all', text: 'Open this list of shortcuts.', run: function () { openDialog(); } },

        // ----- Home, Products, Product detail -----
        { keys: ['arrowleft'], pages: SHOP_PAGES, text: 'Choose the previous product.', run: function () { moveSelection(-1); } },
        { keys: ['arrowright'], pages: SHOP_PAGES, text: 'Choose the next product.', run: function () { moveSelection(1); } },
        { keys: ['v'], pages: SHOP_PAGES, text: 'Open the details of the chosen product.', hint: '.product-card a[href^="product.html"]', run: viewProduct },
        { keys: ['a'], pages: ['home', 'products'], text: 'Add the chosen product to your cart.', hint: '.product-card [data-add]', run: addChosenProduct },

        // ----- Home -----
        { keys: ['s'], pages: ['home'], text: 'Press the "Shop now" button.', hint: '.hero-text a.btn', run: function () { click('.hero-text a.btn'); } },

        // ----- Products -----
        { keys: ['/'], pages: ['products'], text: 'Jump to the search box, ready for typing.', hint: 'label[for="search"]', run: function () { focusField('#search'); } },
        { keys: ['f'], pages: ['products'], text: 'Jump to the category menu.', hint: 'label[for="category"]', run: function () { focusField('#category'); } },
        { keys: ['o'], pages: ['products'], text: 'Jump to the sort menu.', hint: 'label[for="sort"]', run: function () { focusField('#sort'); } },
        { keys: ['x'], pages: ['products'], text: 'Clear the search and the filters.', run: clearFilters },

        // ----- Product detail -----
        { keys: ['a'], pages: ['product'], text: 'Add this product to your cart.', hint: '#add-to-cart, .product-card [data-add]', run: addChosenProduct },
        { keys: ['+', '='], pages: ['product'], text: 'Add one to the quantity.', run: function () { click('#qty-plus'); } },
        { keys: ['-'], pages: ['product'], text: 'Take one off the quantity.', run: function () { click('#qty-minus'); } },
        { keys: ['b'], pages: ['product'], text: 'Go back to the Products page.', run: function () { window.location.href = 'products.html'; } },

        // ----- Cart -----
        { keys: ['arrowleft'], pages: ['cart'], text: 'Choose the previous item in your cart.', run: function () { moveSelection(-1); } },
        { keys: ['arrowright'], pages: ['cart'], text: 'Choose the next item in your cart.', run: function () { moveSelection(1); } },
        { keys: ['+', '='], pages: ['cart'], text: 'Add one to the quantity of the chosen item.', run: function () { changeCartItem('[data-qty="plus"]'); } },
        { keys: ['-'], pages: ['cart'], text: 'Take one off the quantity of the chosen item.', run: function () { changeCartItem('[data-qty="minus"]'); } },
        { keys: ['shift+r'], pages: ['cart'], text: 'Remove the chosen item from your cart.', run: function () { changeCartItem('[data-remove]'); } },
        { keys: ['n'], pages: ['cart'], text: 'Go to checkout.', hint: 'a.btn[href="checkout.html"]', run: function () { click('a.btn[href="checkout.html"]'); } },

        // ----- Checkout -----
        { keys: ['n'], pages: ['checkout'], text: 'Continue to the payment step.', hint: '#details-form button[type="submit"]', run: continueToPayment },
        { keys: ['b'], pages: ['checkout'], text: 'Copy the bank account number.', hint: '[data-copy="account-number"]', run: function () { copyDetail('account-number'); } },
        { keys: ['r'], pages: ['checkout'], text: 'Copy the payment reference.', hint: '[data-copy="order-reference"]', run: function () { copyDetail('order-reference'); } },

        // ----- Track order (demo buttons) -----
        { keys: ['1'], pages: ['track'], text: 'Demo: confirm the payment.', hint: '[data-advance="payment-confirmed"]', run: function () { advance('payment-confirmed'); } },
        { keys: ['2'], pages: ['track'], text: 'Demo: mark the order as packed.', hint: '[data-advance="packed"]', run: function () { advance('packed'); } },
        { keys: ['3'], pages: ['track'], text: 'Demo: mark the order as out for delivery.', hint: '[data-advance="out-for-delivery"]', run: function () { advance('out-for-delivery'); } },
        { keys: ['4'], pages: ['track'], text: 'Demo: mark the order as delivered.', hint: '[data-advance="delivered"]', run: function () { advance('delivered'); } }
    ];

    function appliesHere(binding) {
        return binding.pages === 'all' || binding.pages.indexOf(page) !== -1;
    }

    function findBinding(id) {
        for (var i = 0; i < bindings.length; i++) {
            if (appliesHere(bindings[i]) && bindings[i].keys.indexOf(id) !== -1) {
                return bindings[i];
            }
        }
        return null;
    }

    function displayKey(key) {
        var names = { arrowleft: '\u2190', arrowright: '\u2192', 'shift+r': 'Shift + R' };
        return names[key] || key.toUpperCase();
    }

    /* ---------- Little key labels on buttons and links ---------- */

    function applyHints() {
        bindings.forEach(function (binding) {
            if (!binding.hint || !appliesHere(binding)) { return; }
            var label = displayKey(binding.keys[0]);
            $$(binding.hint).forEach(function (el) {
                el.setAttribute('aria-keyshortcuts', label.replace(/ /g, ''));
                if (!$('.key-hint', el)) {
                    var tag = makeEl('kbd', 'key-hint', label);
                    tag.setAttribute('aria-hidden', 'true'); // the attribute above tells screen readers
                    el.appendChild(tag);
                }
            });
        });
    }

    // Cards are drawn by script.js after the page loads, so we re-check when the page changes
    function refreshHints() {
        if (observer) { observer.disconnect(); }
        applyHints();
        if (observer && main) { observer.observe(main, { childList: true, subtree: true }); }
    }

    /* ---------- The help window (a native <dialog>) ---------- */

    function addGroup(parent, heading, items) {
        if (!items.length) { return; }
        parent.appendChild(makeEl('h3', '', heading));
        var list = makeEl('dl', 'shortcut-list');
        items.forEach(function (binding) {
            var row = document.createElement('div');
            var term = document.createElement('dt');
            term.appendChild(makeEl('kbd', 'key-cap', displayKey(binding.keys[0])));
            var detail = makeEl('dd', '', binding.text);
            row.appendChild(term);
            row.appendChild(detail);
            list.appendChild(row);
        });
        parent.appendChild(list);
    }

    function buildDialog() {
        dialog = document.createElement('dialog');
        dialog.className = 'shortcuts-dialog';
        dialog.setAttribute('aria-labelledby', 'shortcuts-title');

        var title = makeEl('h2', '', 'Keyboard shortcuts');
        title.id = 'shortcuts-title';
        dialog.appendChild(title);

        dialog.appendChild(makeEl('p', '',
            'Shortcuts let you press a key instead of clicking with a mouse. ' +
            'They do not work while you are typing in a box. Press ? any time to see this list again.'));

        if (findBinding('arrowright')) {
            var thing = page === 'cart' ? 'an item in your cart' : 'a product';
            dialog.appendChild(makeEl('p', '',
                'To choose ' + thing + ', press the left or right arrow key. ' +
                'The one you choose gets a blue outline. Then press one of the keys below to use it.'));
        }

        var here = bindings.filter(appliesHere);
        addGroup(dialog, 'On every page', here.filter(function (b) { return b.pages === 'all'; }));
        addGroup(dialog, 'On this page', here.filter(function (b) { return b.pages !== 'all'; }));

        var label = makeEl('label', 'shortcuts-switch');
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = enabled;
        box.addEventListener('change', function () { setEnabled(box.checked); });
        label.appendChild(box);
        label.appendChild(document.createTextNode('Keep keyboard shortcuts switched on'));
        dialog.appendChild(label);

        var actions = makeEl('div', 'shortcuts-actions');
        var close = makeEl('button', 'btn', 'Close');
        close.type = 'button';
        close.addEventListener('click', function () { dialog.close(); });
        actions.appendChild(close);
        dialog.appendChild(actions);

        // Put the cursor back where it was when the window closes
        dialog.addEventListener('close', function () {
            if (lastFocused && lastFocused.focus) { lastFocused.focus(); }
        });

        document.body.appendChild(dialog);
    }

    function openDialog() {
        if (!dialog || dialog.open) { return; }
        lastFocused = document.activeElement;
        var box = $('input[type="checkbox"]', dialog);
        if (box) { box.checked = enabled; }
        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
        } else {
            dialog.setAttribute('open', '');
        }
    }

    // A "Keyboard shortcuts" button in the footer, so the window is easy to find
    function addFooterButton() {
        var list = $('.site-footer nav ul');
        if (!list) { return; }
        var item = makeEl('li', 'shortcuts-link');
        var button = makeEl('button', 'btn-link', 'Keyboard shortcuts');
        button.type = 'button';
        button.setAttribute('aria-haspopup', 'dialog');
        button.addEventListener('click', openDialog);
        item.appendChild(button);
        list.appendChild(item);
    }

    /* ---------- Listening for key presses ---------- */

    function isTyping(target) {
        if (!target) { return false; }
        var tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    }

    // Turns a key press into the same text used in the key list, e.g. "v", "shift+r", "arrowleft"
    function keyId(event) {
        var key = event.key.toLowerCase();
        if (event.shiftKey && /^[a-z]$/.test(key)) { return 'shift+' + key; }
        return key;
    }

    function handleKey(event) {
        if (!enabled || !event.key) { return; }
        if (event.defaultPrevented || event.isComposing) { return; }
        if (event.ctrlKey || event.metaKey || event.altKey) { return; }
        if (dialog && dialog.open) { return; }
        if (isTyping(event.target)) { return; }

        var binding = findBinding(keyId(event));
        if (!binding) { return; }

        event.preventDefault();
        binding.run(event);
    }

    /* ---------- Start up ---------- */

    document.documentElement.classList.toggle('shortcuts-off', !enabled);
    main = $('main');
    if (window.MutationObserver && main) {
        observer = new MutationObserver(function () { if (enabled) { refreshHints(); } });
    }
    buildDialog();
    addFooterButton();
    if (enabled) { refreshHints(); }
    document.addEventListener('keydown', handleKey);
})();