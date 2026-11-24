/* ==========================================================
   Savory-X: track.js
   Loaded after product.js, which shares its helpers on
   window.SavoryX (formatPrice, announce, updateCartCount).
   Where a helper is missing, a small local version is used.

   How this page works:
   1. It finds the customer's active order (saved by checkout.js).
   2. The "system" moves the order through the six steps by itself,
      one step after another, using the times in DELAYS below.
      The time of every step is saved, so if the customer closes the
      page and comes back, the order has moved on as it should.
   3. It draws the timeline, the details and the Google Map route.
   4. Once the order is delivered, the page says "Order delivered" and
      shows a summary. Two hours after delivery, every delivered order
      is deleted automatically.
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {

    if (document.body.dataset.page !== 'track') { return; }

    var SX = window.SavoryX || {};

    /* ---------- 1. SETTINGS ---------- */
    var ORDERS_KEY = 'savoryx-orders';             // all orders (saved by checkout.js)
    var CURRENT_KEY = 'savoryx-current-order';     // the newest order's reference
    var WHATSAPP_NUMBER = '2340000000000';         // placeholder

    // Where orders are shipped from. Replace with the real shop address.
    var SHOP = {
        label: 'Savory-X Store, Ikeja, Lagos',
        query: 'Ikeja, Lagos, Nigeria'
    };

    // How long each step takes, in milliseconds, counted from the step before it.
    var DELAYS = {
        'awaiting-payment': 1500,
        'payment-confirmed': 8000,
        'packed': 10000,
        'out-for-delivery': 12000,
        'delivered': 15000
    };

    // A delivered order stays on the page for 2 hours. After that, every
    // delivered order is deleted.
    var DELIVERED_KEEP_MS = 2 * 60 * 60 * 1000;

    // The map uses the Google location pin only if it is this accurate (in metres).
    // A rougher pin often points to the wrong street, so the typed address is used instead.
    var PIN_MAX_ACCURACY_M = 200;

    // The six steps, in order
    var STATUSES = ['order-placed', 'awaiting-payment', 'payment-confirmed', 'packed', 'out-for-delivery', 'delivered'];
    var LAST = STATUSES.length - 1;

    // How far the truck is along the road (percent) at each step
    var TRUCK_AT = [0, 0, 10, 28, 38, 100];
    var TRUCK_ON_THE_WAY_END = 92;   // while "out for delivery", the truck drives from 38 to 92

    /* ---------- 2. FIND THE PAGE PIECES ---------- */
    function byId(id) { return document.getElementById(id); }

    var statusMessage = byId('status-message');
    var emptyBox = byId('track-empty');
    var content = byId('track-content');
    var hero = byId('tk-hero');
    var steps = byId('timeline').querySelectorAll('.tk-step');
    var routeFill = byId('route-fill');
    var routeTruck = byId('route-truck');

    var currentRef = '';     // the order drawn on the page right now
    var shownIndex = -1;     // the step that was showing last time
    var timer = null;        // the timeout for the next step
    var driveTimer = null;   // the timeout that starts the truck's long drive
    var copyTimer = null;

    /* ---------- Small helpers ---------- */
    function announce(message) {
        if (typeof SX.announce === 'function') { SX.announce(message); return; }
        statusMessage.textContent = '';
        setTimeout(function () { statusMessage.textContent = message; }, 40);
    }

    function money(amount) {
        if (typeof SX.formatPrice === 'function') { return SX.formatPrice(amount); }
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

    function readOrders() {
        try {
            var list = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
            return Array.isArray(list) ? list : [];
        } catch (error) {
            return [];
        }
    }

    function writeOrders(list) {
        try { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); } catch (error) { /* ignore */ }
    }

    function stepIndex(status) { return STATUSES.indexOf(status); }

    // The time (in ms) a step was reached, or 0 if it was not reached yet
    function timeOf(order, status) {
        var history = order.history || [];
        for (var i = 0; i < history.length; i++) {
            if (history[i].status === status) { return Date.parse(history[i].at) || 0; }
        }
        return 0;
    }

    // The time of the newest step
    function lastTime(order) {
        var history = order.history || [];
        if (history.length === 0) { return Date.parse(order.createdAt) || Date.now(); }
        return Date.parse(history[history.length - 1].at) || Date.now();
    }

    function prettyPhone(phone) {
        return phone.length === 11 ? phone.slice(0, 4) + ' ' + phone.slice(4, 7) + ' ' + phone.slice(7) : phone;
    }

    function fullAddress(order) {
        var a = order.address;
        return a.street + ', ' + a.city + ', ' + a.state;
    }

    function formatWhen(ms) {
        return new Date(ms).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    }

    function formatClock(ms) {
        return new Date(ms).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
    }

    /* ---------- 3. THE "SYSTEM": MOVE THE ORDER FORWARD ---------- */

    // Moves one order to every step that is already due. Returns true if it moved.
    function advance(order) {
        if (!order.history) { order.history = []; }

        var changed = false;
        while (stepIndex(order.status) < LAST) {
            var next = STATUSES[stepIndex(order.status) + 1];
            var due = lastTime(order) + (DELAYS[next] || 0);
            if (Date.now() < due) { break; }

            order.status = next;
            order.history.push({ status: next, at: new Date(due).toISOString() });
            changed = true;
        }
        return changed;
    }

    // Finds one order and moves it forward. Returns the order (or null).
    function catchUp(ref) {
        var list = readOrders();
        var order = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].ref === ref) { order = list[i]; break; }
        }
        if (!order) { return null; }

        if (advance(order)) { writeOrders(list); }
        return order;
    }

    // When was the order delivered?
    function deliveredAt(order) {
        return timeOf(order, 'delivered') || lastTime(order);
    }

    // Deletes every delivered order that is more than 2 hours past delivery.
    // Orders nobody opened are moved on to their real step first, so they count too.
    function purgeDelivered() {
        var list = readOrders();
        var kept = [];
        var changed = false;

        list.forEach(function (order) {
            if (advance(order)) { changed = true; }
            if (order.status === 'delivered' && Date.now() >= deliveredAt(order) + DELIVERED_KEEP_MS) {
                changed = true;      // leave this one out: it is deleted
                return;
            }
            kept.push(order);
        });

        if (changed) { writeOrders(kept); }
    }

    // Is this order still meant to be shown?
    function isVisible(order) {
        if (order.status !== 'delivered') { return true; }
        return Date.now() < deliveredAt(order) + DELIVERED_KEEP_MS;
    }

    function forgetCurrent(ref) {
        try {
            if (localStorage.getItem(CURRENT_KEY) === ref) { localStorage.removeItem(CURRENT_KEY); }
        } catch (error) { /* ignore */ }
    }

    /* ---------- 4. SHOW THE ORDER ---------- */

    function showEmpty() {
        clearTimeout(timer);
        currentRef = '';
        shownIndex = -1;
        content.classList.remove('is-leaving');
        content.hidden = true;
        emptyBox.hidden = false;
    }

    function showOrder() {
        emptyBox.hidden = true;
        content.hidden = false;
    }

    // Should the map use the Google location pin from checkout?
    // Yes if the customer shared one and it is accurate enough (an older order
    // with no accuracy saved is trusted). If not, the typed address is used.
    function usePin(order) {
        var loc = order.location;
        if (!loc || !loc.lat || !loc.lng) { return false; }
        if (typeof loc.accuracy === 'number' && loc.accuracy > PIN_MAX_ACCURACY_M) { return false; }
        return true;
    }

    function mapDestination(order) {
        if (usePin(order)) { return order.location.lat + ',' + order.location.lng; }
        return fullAddress(order) + ', Nigeria';
    }

    function drawMap(order) {
        var to = mapDestination(order);
        var frame = byId('route-map');
        frame.src = 'https://maps.google.com/maps?saddr=' + encodeURIComponent(SHOP.query) +
            '&daddr=' + encodeURIComponent(to) + '&output=embed';

        byId('map-link').href = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(SHOP.query) +
            '&destination=' + encodeURIComponent(to);

        byId('route-from').textContent = SHOP.label;
        byId('route-to').textContent = fullAddress(order);

        // Tell the customer which one the map is using
        var source;
        if (usePin(order)) {
            source = 'The map is pinned to the Google location you shared at checkout.';
        } else if (order.location) {
            source = 'The Google location you shared was not exact enough, so the map uses your typed address.';
        } else {
            source = 'The map uses the address you typed at checkout.';
        }
        byId('map-source').textContent = source;
    }

    // Details that never change: filled once per order
    function drawDetails(order) {
        byId('order-number').textContent = order.ref;
        byId('placed-at').textContent = formatWhen(Date.parse(order.createdAt) || Date.now());
        document.title = 'Track ' + order.ref + ' | Savory-X';

        byId('t-name').textContent = order.customer.name;
        byId('t-phone').textContent = prettyPhone(order.customer.phone);

        byId('t-email-row').hidden = !order.customer.email;
        byId('t-email').textContent = order.customer.email || '';

        byId('t-address').textContent = fullAddress(order);

        byId('t-note-row').hidden = !order.address.note;
        byId('t-note').textContent = order.address.note || '';

        byId('t-location-row').hidden = !order.location;
        if (order.location) { byId('t-location').href = order.location.link; }

        // Items
        var list = byId('items-list');
        list.innerHTML = '';
        order.items.forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'tk-item';

            var img = document.createElement('img');
            img.src = item.image || 'images/placeholder.jpg';
            img.alt = '';
            img.width = 52;
            img.height = 52;

            var info = document.createElement('div');
            var name = document.createElement('p');
            name.className = 'tk-item-name';
            name.textContent = item.name;
            var qty = document.createElement('p');
            qty.className = 'tk-item-qty';
            qty.textContent = 'Qty ' + item.qty + ' × ' + money(item.price);
            info.appendChild(name);
            info.appendChild(qty);

            var price = document.createElement('p');
            price.className = 'tk-item-price';
            price.textContent = money(item.price * item.qty);

            li.appendChild(img);
            li.appendChild(info);
            li.appendChild(price);
            list.appendChild(li);
        });

        byId('t-subtotal').textContent = money(order.subtotal);
        byId('t-delivery').textContent = money(order.delivery);
        byId('t-total').textContent = money(order.total);

        byId('whatsapp-help').href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' +
            encodeURIComponent('Hello Savory-X, I need help with my order ' + order.ref + '.');

        drawMap(order);
    }

    // Put the truck (and the white road behind it) at a place, taking ms to get there
    function setTruck(percent, ms) {
        routeFill.style.transitionDuration = ms + 'ms';
        routeTruck.style.transitionDuration = ms + 'ms';
        routeFill.style.width = percent + '%';
        routeTruck.style.left = percent + '%';
    }

    // While "out for delivery", the truck drives slowly until the delivery time
    function drive(order) {
        var reachedAt = timeOf(order, 'out-for-delivery') || Date.now();
        var done = Math.min(Math.max((Date.now() - reachedAt) / DELAYS.delivered, 0), 1);
        var from = TRUCK_AT[4] + done * (TRUCK_ON_THE_WAY_END - TRUCK_AT[4]);

        setTruck(from, 0);               // jump to where it should be now
        void routeFill.offsetWidth;      // makes the browser notice the jump first
        setTruck(TRUCK_ON_THE_WAY_END, (1 - done) * DELAYS.delivered);
    }

    // isLive is true when the step moved forward while the customer was watching
    function moveTruck(order, index, isLive) {
        clearTimeout(driveTimer);

        if (index === 4) {
            if (isLive) {
                setTruck(TRUCK_AT[4], 700);
                driveTimer = setTimeout(function () { drive(order); }, 750);
            } else {
                drive(order);
            }
        } else {
            setTruck(TRUCK_AT[index], isLive ? 900 : 0);
        }
    }

    // Once delivered: show the "Order delivered" summary instead of the map
    function drawDelivered(order, isDelivered) {
        byId('delivered-card').hidden = !isDelivered;
        byId('map-card').hidden = isDelivered;
        if (!isDelivered) { return; }

        var at = deliveredAt(order);
        var count = 0;
        order.items.forEach(function (item) { count += item.qty; });

        byId('done-when').textContent = 'Delivered on ' + formatWhen(at);
        byId('done-to').textContent = fullAddress(order);
        byId('done-items').textContent = count + (count === 1 ? ' item' : ' items');
        byId('done-total').textContent = money(order.total);
        byId('done-clear').textContent = formatClock(at + DELIVERED_KEEP_MS);
    }

    // The parts that change with every step
    function drawProgress(order, isUpdate) {
        var index = stepIndex(order.status);
        var allDone = index === LAST;

        steps.forEach(function (li, i) {
            var isDone = i < index || allDone;
            var isCurrent = i === index && !allDone;

            li.classList.toggle('is-done', isDone);
            li.classList.toggle('is-current', isCurrent);

            if (isCurrent) { li.setAttribute('aria-current', 'step'); }
            else { li.removeAttribute('aria-current'); }

            li.querySelector('.tk-state').textContent = isDone ? 'Completed' : (isCurrent ? 'In progress' : 'Upcoming');

            var at = timeOf(order, STATUSES[i]);
            li.querySelector('.tk-time').textContent = at && (isDone || isCurrent) ? formatClock(at) : '';
        });

        var title = allDone ? 'Order delivered' : steps[index].querySelector('h3').textContent;
        byId('status-badge').textContent = title;
        byId('status-note').textContent = allDone
            ? 'Your order was delivered on ' + formatWhen(deliveredAt(order)) + '. Thank you for shopping with Savory-X!'
            : steps[index].querySelector('.tk-step-note').textContent;
        hero.classList.toggle('is-delivered', allDone);
        drawDelivered(order, allDone);

        var movedForward = isUpdate && shownIndex !== -1 && index > shownIndex;
        moveTruck(order, index, movedForward);

        // A step moved forward while the page was open: pop it and say so
        if (movedForward) {
            var li = steps[index];
            li.classList.add('is-new');
            setTimeout(function () { li.classList.remove('is-new'); }, 900);
            announce(allDone
                ? 'Order delivered. Your order has arrived.'
                : 'Order update: ' + title + '. ' + steps[index].querySelector('.tk-step-note').textContent);
        }
        shownIndex = index;
    }

    // Two hours have passed since delivery: delete the delivered orders and clear the page
    function leaveOrder(ref) {
        content.classList.add('is-leaving');
        setTimeout(function () {
            purgeDelivered();
            forgetCurrent(ref);
            showEmpty();
            announce('Your delivered order has been removed from this page.');
        }, 600);
    }

    // Set a timer for the next thing that will happen to this order
    function scheduleNext(order) {
        clearTimeout(timer);
        var index = stepIndex(order.status);

        if (index < LAST) {
            var due = lastTime(order) + (DELAYS[STATUSES[index + 1]] || 0);
            timer = setTimeout(function () { load(true); }, Math.max(due - Date.now(), 0) + 30);
        } else {
            var clearAt = deliveredAt(order) + DELIVERED_KEEP_MS;
            timer = setTimeout(function () { leaveOrder(order.ref); }, Math.max(clearAt - Date.now(), 0));
        }
    }

    // Which order should the page show?
    function activeRef() {
        var fromLink = new URLSearchParams(window.location.search).get('ref');
        if (fromLink) { return fromLink.trim().toUpperCase(); }
        try { return localStorage.getItem(CURRENT_KEY) || ''; } catch (error) { return ''; }
    }

    function load(isUpdate) {
        purgeDelivered();                     // delete delivered orders older than 2 hours

        var ref = activeRef();
        var order = ref ? catchUp(ref) : null;

        if (!order || !isVisible(order)) {
            if (ref) { forgetCurrent(ref); }
            showEmpty();
            return;
        }

        showOrder();
        if (order.ref !== currentRef) {
            currentRef = order.ref;
            shownIndex = -1;
            drawDetails(order);
        }
        drawProgress(order, isUpdate);
        scheduleNext(order);
    }

    /* ---------- 5. COPY ORDER NUMBER ---------- */
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

    function showCopied() {
        var button = byId('copy-order');
        var label = button.querySelector('.tk-copy-label');
        button.classList.add('is-copied');
        label.textContent = 'Copied';
        announce('Order number copied.');
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () {
            button.classList.remove('is-copied');
            label.textContent = 'Copy';
        }, 2000);
    }

    byId('copy-order').addEventListener('click', function () {
        var text = byId('order-number').textContent.trim();
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(showCopied).catch(function () {
                if (copyWithFallback(text)) { showCopied(); }
                else { announce('Could not copy. Please copy it by hand.'); }
            });
        } else if (copyWithFallback(text)) {
            showCopied();
        } else {
            announce('Could not copy. Please copy it by hand.');
        }
    });

    /* ---------- 6. KEEP IN SYNC ---------- */
    // The order changed in another tab
    window.addEventListener('storage', function (event) {
        if (event.key === ORDERS_KEY || event.key === CURRENT_KEY || event.key === null) { load(true); }
    });

    // Page restored from the back/forward cache, or the tab became visible again
    // (browsers slow timers in hidden tabs, so check again)
    window.addEventListener('pageshow', function (event) { if (event.persisted) { load(true); } });
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) { load(true); }
    });

    /* ---------- START ---------- */
    var year = byId('year');
    if (year) { year.textContent = String(new Date().getFullYear()); }

    if (typeof SX.updateCartCount === 'function') { SX.updateCartCount(); }

    load(false);
});