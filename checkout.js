/* ==========================================================
   Savory-X: checkout.js
   Loaded after product.js, which shares its helpers on
   window.SavoryX (findProduct, formatPrice, loadCart, saveCart,
   updateCartCount, announce). Where a helper is missing, a small
   local version is used instead.

   What this file does, in order:
   1. Settings you may want to change
   2. Reads the cart and fills the order summary
   3. Checks the delivery form
   4. Google location (browser geolocation, no key, no login)
   5. Moves between step 1 (details) and step 2 (payment)
   6. Copy buttons
   7. "I've made the transfer" saves the order and opens Track order
   Everything sits inside one function so its names never clash
   with names in the other scripts.
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {

    if (document.body.dataset.page !== 'checkout') { return; }

    var SX = window.SavoryX || {};

    /* ---------- 1. SETTINGS ---------- */
    var CART_KEY = 'savoryx-cart';                 // list of { id, qty }
    var ORDERS_KEY = 'savoryx-orders';             // list of all orders
    var CURRENT_KEY = 'savoryx-current-order';     // the reference of the newest order
    var COUNTER_KEY = 'savoryx-order-counter';     // last order number used
    var DELIVERY_FEE = 1500;                       // flat fee in naira, for now

    // The payment popup (demo mode, no server).
    // AUTO_CONFIRM_AFTER: how long the "shop" takes to confirm, in milliseconds.
    //   Set it to 0 to wait for a real person instead: the owner confirms the
    //   order from another tab (the Track page owner button) and this popup
    //   hears about it.
    var AUTO_CONFIRM_AFTER = 6000;
    var SEND_STAGE_MS = 1600;                      // how long "sending the notice" shows
    var PLACEHOLDER = 'images/placeholder.jpg';

    // Placeholders. Replace with the real bank details.
    var BANK = {
        name: 'Your Bank Name',
        number: '0000000000',
        accountName: 'Savory-X Stores'
    };

    /* ---------- 2. FIND THE PAGE PIECES ---------- */
    function byId(id) { return document.getElementById(id); }

    var statusMessage = byId('status-message');
    var stepIndicator = byId('step-indicator');
    var checkoutContent = byId('checkout-content');
    var checkoutEmpty = byId('checkout-empty');
    var dataWarning = byId('data-warning');

    var summaryItems = byId('summary-items');
    var summaryCount = byId('summary-count');
    var coSubtotal = byId('co-subtotal');
    var coDelivery = byId('co-delivery');
    var coTotal = byId('co-total');
    var continueTotal = byId('continue-total');

    var errorSummary = byId('error-summary');
    var errorList = byId('error-list');
    var detailsForm = byId('details-form');
    var detailsSection = byId('details-section');
    var paymentSection = byId('payment-section');
    var detailsHeading = byId('details-heading');
    var paymentHeading = byId('payment-heading');

    var useLocationBtn = byId('use-location');
    var locationStatus = byId('location-status');
    var locationResult = byId('location-result');
    var locationView = byId('location-view');
    var removeLocationBtn = byId('remove-location');
    var locationLink = byId('location-link');

    var transferAmount = byId('transfer-amount');
    var confirmBtn = byId('confirm-transfer');
    var editDetailsBtn = byId('edit-details');

    // Data that lives while the page is open
    var items = [];            // cart items with name, price, qty, image
    var subtotal = 0;
    var total = 0;
    var savedLocation = null;  // { lat, lng, link } or null
    var reference = '';        // SX-#### (made when the customer reaches payment)
    var draft = null;          // the details the customer typed

    /* ---------- Small helpers (use the product.js versions when present) ---------- */

    // Say something to screen-reader users (the hidden #status-message area)
    function announce(message) {
        if (typeof SX.announce === 'function') { SX.announce(message); return; }
        statusMessage.textContent = '';
        setTimeout(function () { statusMessage.textContent = message; }, 40);
    }

    function money(amount) {
        if (typeof SX.formatPrice === 'function') { return SX.formatPrice(amount); }
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

    // Read and write localStorage safely (it can be blocked by the browser)
    function readJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }
    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function readCart() {
        var cart = typeof SX.loadCart === 'function' ? SX.loadCart() : readJSON(CART_KEY, []);
        return Array.isArray(cart) ? cart : [];
    }

    function clearCart() {
        if (typeof SX.saveCart === 'function') { SX.saveCart([]); }
        else { writeJSON(CART_KEY, []); }
        updateCartCount();
    }

    function updateCartCount() {
        if (typeof SX.updateCartCount === 'function') { SX.updateCartCount(); return; }
        var badge = byId('cart-count');
        if (!badge) { return; }
        var count = 0;
        readCart().forEach(function (entry) { count += Number(entry.qty) || 0; });
        badge.textContent = count;
    }

    // Order numbers: 1001, 1002, 1003... The last one used is saved.
    function nextReference() {
        var last = parseInt(localStorage.getItem(COUNTER_KEY), 10);
        if (isNaN(last)) { last = 1000; }
        last = last + 1;
        try { localStorage.setItem(COUNTER_KEY, String(last)); } catch (error) { /* ignore */ }
        return 'SX-' + last;
    }

    /* ---------- 2. CART AND ORDER SUMMARY ---------- */

    // Find a product by id using the shared helper from product.js
    function getProduct(id) {
        if (typeof SX.findProduct === 'function') { return SX.findProduct(id); }
        return null;
    }

    // Turn the saved cart into full items (name, price, image, qty).
    // Products that cannot be found are left out and flagged.
    function buildItems() {
        var found = [];
        var skipped = false;

        readCart().forEach(function (entry) {
            var product = getProduct(entry.id);
            var price = product ? Number(product.price) : 0;

            if (!product || !price) {
                skipped = true;
                return;
            }
            found.push({
                id: product.id,
                name: product.name,
                price: price,
                qty: Math.max(1, Math.floor(Number(entry.qty)) || 1),
                image: product.image || PLACEHOLDER
            });
        });

        return { items: found, skipped: skipped };
    }

    function renderSummary() {
        summaryItems.innerHTML = '';
        subtotal = 0;
        var quantity = 0;

        items.forEach(function (item, index) {
            subtotal += item.price * item.qty;
            quantity += item.qty;

            var li = document.createElement('li');
            li.className = 'co-item';
            li.style.setProperty('--i', index);   // used for the staggered animation

            var img = document.createElement('img');
            img.src = item.image;
            img.alt = '';                          // the name sits right next to it
            img.width = 60;
            img.height = 60;

            var info = document.createElement('div');
            var name = document.createElement('p');
            name.className = 'co-item-name';
            name.textContent = item.name;
            var qty = document.createElement('p');
            qty.className = 'co-item-qty';
            qty.textContent = 'Qty ' + item.qty + ' × ' + money(item.price);
            info.appendChild(name);
            info.appendChild(qty);

            var price = document.createElement('p');
            price.className = 'co-item-price';
            price.textContent = money(item.price * item.qty);

            li.appendChild(img);
            li.appendChild(info);
            li.appendChild(price);
            summaryItems.appendChild(li);
        });

        total = subtotal + DELIVERY_FEE;

        summaryCount.textContent = quantity + (quantity === 1 ? ' item' : ' items');
        coSubtotal.textContent = money(subtotal);
        coDelivery.textContent = money(DELIVERY_FEE);
        coTotal.textContent = money(total);
        continueTotal.textContent = '· ' + money(total);
    }

    /* ---------- 3. FORM CHECKING ---------- */

    // Accepts 08012345678, 0801 234 5678, +2348012345678 and 2348012345678.
    // Returns the 11-digit local number, or '' if it is not valid.
    function cleanPhone(value) {
        var digits = value.replace(/[\s\-().]/g, '');
        if (/^\+234\d{10}$/.test(digits)) { return '0' + digits.slice(4); }
        if (/^234\d{10}$/.test(digits)) { return '0' + digits.slice(3); }
        if (/^0\d{10}$/.test(digits)) { return digits; }
        return '';
    }

    function prettyPhone(phone) {
        return phone.slice(0, 4) + ' ' + phone.slice(4, 7) + ' ' + phone.slice(7);
    }

    // Each rule returns '' when fine, or a message when something is wrong
    var rules = [
        {
            id: 'full-name', label: 'Full name', check: function (v) {
                return v.trim().length >= 2 ? '' : 'Enter your full name.';
            }
        },
        {
            id: 'phone', label: 'Phone number', check: function (v) {
                if (v.trim() === '') { return 'Enter your phone number.'; }
                return cleanPhone(v) ? '' : 'Enter a valid Nigerian phone number, for example 0801 234 5678.';
            }
        },
        {
            id: 'email', label: 'Email', check: function (v) {
                if (v.trim() === '') { return ''; }   // optional
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.';
            }
        },
        {
            id: 'street', label: 'Street address', check: function (v) {
                return v.trim().length >= 5 ? '' : 'Enter your street address.';
            }
        },
        {
            id: 'city', label: 'City or town', check: function (v) {
                return v.trim().length >= 2 ? '' : 'Enter your city or town.';
            }
        },
        {
            id: 'state', label: 'State', check: function (v) {
                return v !== '' ? '' : 'Choose your state.';
            }
        }
    ];

    function setFieldError(id, message) {
        var field = byId(id);
        var errorEl = byId(id + '-error');
        errorEl.textContent = message ? 'Error: ' + message : '';
        if (message) {
            field.setAttribute('aria-invalid', 'true');
        } else {
            field.removeAttribute('aria-invalid');
        }
    }

    // Check every field. Returns a list of problems.
    function checkForm() {
        var problems = [];
        rules.forEach(function (rule) {
            var message = rule.check(byId(rule.id).value);
            setFieldError(rule.id, message);
            if (message) { problems.push({ id: rule.id, label: rule.label, message: message }); }
        });
        return problems;
    }

    function showErrorSummary(problems) {
        errorList.innerHTML = '';
        problems.forEach(function (problem) {
            var li = document.createElement('li');
            var link = document.createElement('a');
            link.href = '#' + problem.id;
            link.textContent = problem.label + ': ' + problem.message;
            // Move keyboard focus to the field that needs fixing
            link.addEventListener('click', function (event) {
                event.preventDefault();
                byId(problem.id).focus();
            });
            li.appendChild(link);
            errorList.appendChild(li);
        });
        errorSummary.hidden = false;
        errorSummary.focus();
        errorSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
        announce(problems.length + (problems.length === 1 ? ' problem' : ' problems') + ' found. Please fix them and try again.');
    }

    // Clear a field's error as soon as the customer starts fixing it
    rules.forEach(function (rule) {
        byId(rule.id).addEventListener('input', function () { setFieldError(rule.id, ''); });
        byId(rule.id).addEventListener('change', function () { setFieldError(rule.id, ''); });
    });

    /* ---------- 4. GOOGLE LOCATION ---------- */

    var locationLabel = useLocationBtn.querySelector('.co-label');

    function setLocationStatus(message, isError) {
        locationStatus.textContent = message;
        locationStatus.classList.toggle('is-error', !!isError);
    }

    function setLocationLoading(isLoading) {
        useLocationBtn.classList.toggle('is-loading', isLoading);
        useLocationBtn.setAttribute('aria-disabled', isLoading ? 'true' : 'false');
    }

    function onLocationSuccess(position) {
        var lat = position.coords.latitude.toFixed(6);
        var lng = position.coords.longitude.toFixed(6);
        var link = 'https://www.google.com/maps?q=' + lat + ',' + lng;

        savedLocation = { lat: lat, lng: lng, link: link };
        locationLink.value = link;
        locationView.href = link;
        locationResult.hidden = false;
        locationLabel.textContent = 'Update Google location';

        useLocationBtn.classList.remove('is-done');
        // (a tiny pause lets the pop animation play again on every update)
        setTimeout(function () { useLocationBtn.classList.add('is-done'); }, 20);

        setLocationLoading(false);

        // accuracy is in metres. A big number means a rough guess.
        if (position.coords.accuracy > 1000) {
            setLocationStatus('Location added, but it is not very exact. Please make sure your typed address is complete.', false);
        } else {
            setLocationStatus('Your Google location was added to this order.', false);
        }
        announce('Google location added.');
    }

    function onLocationError(error) {
        setLocationLoading(false);
        var message;
        if (error.code === 1) {
            message = 'Location was not allowed. Please type your address instead.';
        } else if (error.code === 3) {
            message = 'It took too long to get your location. Please try again or type your address.';
        } else {
            message = 'We could not get your location. Please type your address instead.';
        }
        setLocationStatus(message, true);
        announce(message);
    }

    useLocationBtn.addEventListener('click', function () {
        if (useLocationBtn.getAttribute('aria-disabled') === 'true') { return; }

        if (!('geolocation' in navigator)) {
            setLocationStatus('This browser cannot share your location. Please type your address.', true);
            return;
        }

        setLocationLoading(true);
        setLocationStatus('Getting your location… If your browser asks, choose Allow.', false);

        navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, {
            enableHighAccuracy: true,
            timeout: 10000,       // give up after 10 seconds
            maximumAge: 60000     // a position up to 1 minute old is fine
        });
    });

    removeLocationBtn.addEventListener('click', function () {
        savedLocation = null;
        locationLink.value = '';
        locationResult.hidden = true;
        locationLabel.textContent = 'Use Google location';
        useLocationBtn.classList.remove('is-done');
        setLocationStatus('Location removed.', false);
        announce('Location removed.');
        useLocationBtn.focus();
    });

    /* ---------- 5. STEPS ---------- */

    function setStep(number) {
        var steps = stepIndicator.querySelectorAll('.co-step');
        steps.forEach(function (step, index) {
            var position = index + 1;
            var state = step.querySelector('.co-step-state');

            step.classList.toggle('is-done', position < number);
            step.classList.toggle('is-current', position === number);

            if (position === number) {
                step.setAttribute('aria-current', 'step');
                state.textContent = '(current step)';
            } else {
                step.removeAttribute('aria-current');
                state.textContent = position < number ? '(completed)' : '(upcoming step)';
            }
        });
    }

    function showPayment() {
        byId('bank-name').textContent = BANK.name;
        byId('account-number').textContent = BANK.number;
        byId('account-name').textContent = BANK.accountName;
        byId('order-reference').textContent = reference;
        transferAmount.textContent = money(total);

        detailsSection.hidden = true;
        paymentSection.hidden = false;
        setStep(2);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        paymentHeading.focus();
        announce('Step 2 of 2. Pay by bank transfer. Amount ' + money(total) + '. Reference ' + reference + '.');
    }

    function showDetails() {
        paymentSection.hidden = true;
        detailsSection.hidden = false;
        setStep(1);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        detailsHeading.focus();
        announce('Step 1 of 2. Your details.');
    }

    detailsForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var problems = checkForm();
        if (problems.length > 0) {
            showErrorSummary(problems);
            return;
        }
        errorSummary.hidden = true;

        // Keep what the customer typed
        draft = {
            name: byId('full-name').value.trim(),
            phone: cleanPhone(byId('phone').value),
            email: byId('email').value.trim(),
            street: byId('street').value.trim(),
            city: byId('city').value.trim(),
            state: byId('state').value,
            note: byId('note').value.trim()
        };

        // One reference per order. Going back and forward again keeps the same one.
        if (reference === '') { reference = nextReference(); }

        showPayment();
    });

    editDetailsBtn.addEventListener('click', showDetails);

    /* ---------- 6. COPY BUTTONS ---------- */

    // Old-browser way to copy, used only if the modern way is not available
    function copyWithFallback(text) {
        var box = document.createElement('textarea');
        box.value = text;
        box.setAttribute('readonly', '');
        box.style.position = 'fixed';
        box.style.opacity = '0';
        document.body.appendChild(box);
        box.select();
        var worked = false;
        try { worked = document.execCommand('copy'); } catch (error) { worked = false; }
        document.body.removeChild(box);
        return worked;
    }

    function showCopied(button, what) {
        var label = button.querySelector('.co-copy-label');
        button.classList.add('is-copied');
        label.textContent = 'Copied';
        announce(what + ' copied.');
        setTimeout(function () {
            button.classList.remove('is-copied');
            label.textContent = 'Copy';
        }, 2000);
    }

    document.querySelectorAll('[data-copy]').forEach(function (button) {
        button.addEventListener('click', function () {
            var targetId = button.getAttribute('data-copy');
            var text = byId(targetId).textContent.trim();
            var what = targetId === 'account-number' ? 'Account number' : 'Payment reference';

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function () {
                    showCopied(button, what);
                }).catch(function () {
                    if (copyWithFallback(text)) { showCopied(button, what); }
                    else { announce('Could not copy. Please copy it by hand.'); }
                });
            } else if (copyWithFallback(text)) {
                showCopied(button, what);
            } else {
                announce('Could not copy. Please copy it by hand.');
            }
        });
    });

    /* ---------- 7. "I'VE MADE THE TRANSFER" ---------- */

    function buildOwnerMessage(order) {
        var itemsText = order.items.map(function (item) {
            return item.qty + 'x ' + item.name;
        }).join(', ');

        var lines = [];
        lines.push('NEW ORDER #' + order.ref + ' (verify payment)');
        lines.push('Buyer: ' + order.customer.name + ' (' + prettyPhone(order.customer.phone) + ')');
        lines.push('Items: ' + itemsText);
        lines.push('Deliver to: ' + order.address.street + ', ' + order.address.city + ', ' + order.address.state);
        if (order.location) { lines.push('Location: ' + order.location.link); }
        if (order.address.note) { lines.push('Note: ' + order.address.note); }
        lines.push('Amount to confirm: ' + money(order.total));
        return lines.join('\n');
    }

    /* ----- The payment popup: sent -> checking -> received ----- */

    var paymentDialog = byId('payment-dialog');
    var payTitle = byId('pay-title');
    var payText = byId('pay-text');
    var payRef = byId('pay-ref');
    var payAmount = byId('pay-amount');
    var payDemo = byId('pay-demo');
    var payTrack = byId('payment-track');
    var payStages = paymentDialog.querySelectorAll('.co-pay-steps li');

    var pendingRef = '';   // the order we are waiting on
    var stage = '';        // 'sent', 'checking' or 'received'
    var timers = [];       // running timeouts, so they can be cancelled

    function clearTimers() {
        timers.forEach(function (id) { clearTimeout(id); });
        timers = [];
    }

    function findOrder(ref) {
        var orders = readJSON(ORDERS_KEY, []);
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].ref === ref) { return orders[i]; }
        }
        return null;
    }

    // The shop's side of the job (simulated): mark the payment as received
    function markPaymentConfirmed(ref) {
        var orders = readJSON(ORDERS_KEY, []);
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].ref === ref && orders[i].status === 'awaiting-payment') {
                orders[i].status = 'payment-confirmed';
                orders[i].history.push({ status: 'payment-confirmed', at: new Date().toISOString() });
                writeJSON(ORDERS_KEY, orders);
                return;
            }
        }
    }

    function setStage(name) {
        stage = name;
        paymentDialog.setAttribute('data-stage', name);

        var position = ['sent', 'checking', 'received'].indexOf(name);
        payStages.forEach(function (li, index) {
            var isDone = name === 'received' || index < position;
            var isCurrent = !isDone && index === position;
            li.classList.toggle('is-done', isDone);
            li.classList.toggle('is-current', isCurrent);
            li.querySelector('.co-pay-state').textContent =
                isDone ? '(done)' : (isCurrent ? '(in progress)' : '(waiting)');
        });

        if (name === 'sent') {
            payTitle.textContent = 'Sending your payment notice';
            payText.textContent = 'Telling the shop that you have made the transfer…';
        } else if (name === 'checking') {
            payTitle.textContent = 'Confirming your payment';
            payText.textContent = 'The shop is checking that your transfer arrived. You can wait here or go and track your order.';
        } else {
            var firstName = draft && draft.name ? draft.name.split(' ')[0] : 'there';
            payTitle.textContent = 'Payment received';
            payText.textContent = 'Thank you, ' + firstName + '! We have your payment of ' + money(total) + ' and will start packing your order.';
            payTrack.classList.add('is-ready');
        }
    }

    // fromShop is true when the approval came from another tab (the real owner)
    function approvePayment(fromShop) {
        if (stage === 'received') { return; }
        clearTimers();
        if (!fromShop) { markPaymentConfirmed(pendingRef); }
        setStage('received');
    }

    function startPaymentCheck(order) {
        pendingRef = order.ref;
        payRef.textContent = order.ref;
        payAmount.textContent = money(order.total);
        payDemo.hidden = AUTO_CONFIRM_AFTER <= 0;
        payTrack.classList.remove('is-ready');

        setStage('sent');
        paymentDialog.showModal();
        payTitle.focus();

        // After a moment the notice is "sent" and the check begins
        timers.push(setTimeout(function () {
            setStage('checking');
            if (AUTO_CONFIRM_AFTER > 0) {
                timers.push(setTimeout(function () { approvePayment(false); }, AUTO_CONFIRM_AFTER));
            }
        }, SEND_STAGE_MS));
    }

    // The owner confirmed the order in another tab: the "message back"
    window.addEventListener('storage', function (event) {
        if (event.key !== ORDERS_KEY || !pendingRef) { return; }
        var order = findOrder(pendingRef);
        if (order && order.status !== 'awaiting-payment') { approvePayment(true); }
    });

    // Closing the popup (Esc or the link) always leads to Track order
    paymentDialog.addEventListener('close', function () {
        clearTimers();
        window.location.href = 'track.html';
    });

    /* ----- "I've made the transfer" ----- */

    confirmBtn.addEventListener('click', function () {
        if (!draft || confirmBtn.getAttribute('aria-disabled') === 'true') { return; }

        confirmBtn.setAttribute('aria-disabled', 'true');
        confirmBtn.classList.add('is-loading');

        var now = new Date().toISOString();

        var order = {
            ref: reference,
            status: 'awaiting-payment',
            createdAt: now,
            ownerNotifiedAt: now,   // the owner text message goes out at this moment
            history: [
                { status: 'order-placed', at: now },
                { status: 'awaiting-payment', at: now }
            ],
            customer: { name: draft.name, phone: draft.phone, email: draft.email },
            address: { street: draft.street, city: draft.city, state: draft.state, note: draft.note },
            location: savedLocation,   // { lat, lng, link } or null
            items: items.map(function (item) {
                return { id: item.id, name: item.name, qty: item.qty, price: item.price, image: item.image };
            }),
            subtotal: subtotal,
            delivery: DELIVERY_FEE,
            total: total
        };
        order.ownerMessage = buildOwnerMessage(order);

        // Save the order
        var orders = readJSON(ORDERS_KEY, []);
        orders.push(order);
        var saved = writeJSON(ORDERS_KEY, orders);

        if (!saved) {
            confirmBtn.setAttribute('aria-disabled', 'false');
            confirmBtn.classList.remove('is-loading');
            announce('We could not save your order. Please check that your browser allows site storage and try again.');
            return;
        }
        try { localStorage.setItem(CURRENT_KEY, order.ref); } catch (error) { /* ignore */ }

        // The order is placed, so empty the cart
        clearCart();

        confirmBtn.classList.remove('is-loading');
        startPaymentCheck(order);
    });

    /* ---------- START ---------- */
    var year = byId('year');
    if (year) { year.textContent = String(new Date().getFullYear()); }

    updateCartCount();

    var result = buildItems();
    items = result.items;

    if (items.length === 0) {
        // Nothing (usable) in the cart
        checkoutContent.hidden = true;
        stepIndicator.hidden = true;
        checkoutEmpty.hidden = false;
    } else {
        renderSummary();
        if (result.skipped) { dataWarning.hidden = false; }
    }
});