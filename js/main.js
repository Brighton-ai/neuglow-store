/**
 * js/main.js — NeuGlow Store Frontend
 * Handles: product rendering, cart UI, auth modals, FAQ, Stripe checkout
 */

// ── FAQ Data ──────────────────────────────────────────────────────────────────
const FAQ_DATA = [
  { q: 'How does 40Hz light therapy work?', a: 'NeuGlow emits light flickering at exactly 40Hz — the Gamma frequency. This stimulates neural oscillations in your brain, promoting the clearance of amyloid plaques and supporting cognitive function. You simply sit near the lamp during normal activities.' },
  { q: 'How long should I use NeuGlow each day?', a: 'Clinical studies used 1 hour of daily exposure. Most users find morning or evening sessions work best. Consistency matters more than duration — daily use over weeks produces the most meaningful results.' },
  { q: 'Is 40Hz light safe for my eyes?', a: 'Yes. NeuGlow uses imperceptible flickering embedded within warm white light. The 40Hz oscillation is below the threshold of conscious perception and has been used safely in multiple published clinical trials.' },
  { q: 'When will I notice results?', a: 'Many users report improved sleep quality and mental clarity within 2–4 weeks of daily use. Cognitive benefits associated with neuroprotection are cumulative and build over months of consistent use.' },
  { q: 'What is Delta M+ Technology?', a: 'Delta M+ is our proprietary light modulation system that precisely maintains 40Hz output with less than 0.5% frequency variance — verified by professional optical instruments. It ensures you receive clinically relevant stimulation, not an approximation.' },
  { q: 'Can I use NeuGlow while working or watching TV?', a: "Absolutely. Place NeuGlow nearby and continue your normal routine. You don't need to stare at the lamp — ambient exposure is sufficient. Many users keep it on their desk or bedside table." },
];

// ── DOM Ready ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  renderFAQ();
  await loadProducts();
  renderCartPanel();
  initAuthState();
  checkCheckoutReturn();
});

// ── Check if returning from Stripe ───────────────────────────────────────────
function checkCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    Cart.clear();
    renderCartPanel();
    showToast('Order confirmed! Thank you for your purchase.');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (params.get('cancelled') === 'true') {
    showToast('Checkout cancelled. Your cart is still saved.');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// ── Products ──────────────────────────────────────────────────────────────────
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--mid)">
      <div style="font-size:2rem;margin-bottom:12px;animation:pulse 1.5s infinite">✦</div>
      Loading products...
    </div>`;

  try {
    const products = await API.products.list();
    if (!products.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--mid)">
          <div style="font-size:3rem;margin-bottom:16px">🌿</div>
          <p style="font-size:1rem">No products available yet.</p>
        </div>`;
      return;
    }
    grid.innerHTML = products.map(productCard).join('');
  } catch (e) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--mid)">
        <p>Could not load products. Please refresh.</p>
      </div>`;
  }
}

function productCard(p) {
  const stars = '★'.repeat(Math.round(p.rating || 5)) + '☆'.repeat(5 - Math.round(p.rating || 5));
  const imgContent = p.images && p.images[0]
    ? `<img src="${p.images[0]}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-size:5rem">${p.icon || '💡'}</span>`;

  const saleBadge = p.compareAt && p.compareAt > p.price
    ? `<div class="product-badge" style="background:var(--orange-dark)">Sale</div>`
    : p.badge ? `<div class="product-badge">${p.badge}</div>` : '';

  const comparePrice = p.compareAt && p.compareAt > p.price
    ? `<span style="font-size:.9rem;color:var(--mid);text-decoration:line-through;margin-right:6px">$${p.compareAt.toFixed(2)}</span>`
    : '';

  const outOfStock = p.trackStock && p.stock <= 0 && !p.allowBackorder;
  const productJson = JSON.stringify(p).replace(/"/g, '&quot;');

  return `
    <div class="product-card">
      ${saleBadge}
      <div class="product-img">${imgContent}</div>
      <div class="product-body">
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-count">(${p.reviewCount || 0})</span>
        </div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-footer">
          <div class="product-price">
            ${comparePrice}
            <sup>$</sup>${Math.floor(p.price)}<span style="font-size:1rem">.${(p.price % 1).toFixed(2).slice(2)}</span>
          </div>
          ${outOfStock
            ? `<button class="btn-add" disabled style="opacity:.5;cursor:not-allowed">Out of Stock</button>`
            : `<button class="btn-add" onclick="addToCart(${productJson})">Add to Cart</button>`
          }
        </div>
      </div>
    </div>`;
}

// ── Cart ──────────────────────────────────────────────────────────────────────
function addToCart(product) {
  Cart.add(product, 1);
  renderCartPanel();
  openCart();
  showToast(product.name + ' added to cart');
}

function renderCartPanel() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  const items = Cart.get();
  updateCartBadge();

  if (!items.length) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Your cart is empty</p>
      </div>`;
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = '$0.00';
    return;
  }

  container.innerHTML = items.map(function(item) {
    return `
    <div class="cart-item">
      <div class="cart-item-img">${item.icon || '💡'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty('${item._id}', ${item.qty - 1})">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item._id}', ${item.qty + 1})">+</button>
          <button class="cart-item-remove" onclick="removeFromCart('${item._id}')">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = '$' + Cart.total().toFixed(2);
}

function changeQty(id, qty) {
  Cart.updateQty(id, qty);
  renderCartPanel();
}

function removeFromCart(id) {
  Cart.remove(id);
  renderCartPanel();
}

function resetCart() {
  Cart.clear();
  renderCartPanel();
}

function openCart() {
  document.getElementById('cartPanel') && document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartOverlay') && document.getElementById('cartOverlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cartPanel') && document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('cartOverlay') && document.getElementById('cartOverlay').classList.remove('open');
}

// ── Auth Modal ────────────────────────────────────────────────────────────────
function openModal(type) {
  if (type === 'auth') {
    document.getElementById('authModal') && document.getElementById('authModal').classList.add('open');
  } else if (type === 'payment') {
    const user = API.getUser();
    if (!user) {
      showToast('Please sign in to checkout');
      document.getElementById('authModal') && document.getElementById('authModal').classList.add('open');
      return;
    }
    document.getElementById('paymentModal') && document.getElementById('paymentModal').classList.add('open');
  }
}

function closeModal(type) {
  if (type === 'auth') {
    document.getElementById('authModal') && document.getElementById('authModal').classList.remove('open');
  }
  if (type === 'payment') {
    document.getElementById('paymentModal') && document.getElementById('paymentModal').classList.remove('open');
    resetPaymentSteps();
  }
}

document.addEventListener('click', function(e) {
  if (e.target.id === 'authModal') closeModal('auth');
  if (e.target.id === 'paymentModal') closeModal('payment');
});

function switchTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.modal-tab').forEach(function(t, i) {
    if ((tab === 'login' && i === 0) || (tab === 'register' && i === 1)) t.classList.add('active');
  });
}

async function handleLogin() {
  const email    = document.getElementById('loginEmail') ? document.getElementById('loginEmail').value.trim() : '';
  const password = document.getElementById('loginPassword') ? document.getElementById('loginPassword').value : '';
  if (!email || !password) return showToast('Please fill in all fields');
  try {
    const result = await API.auth.login(email, password);
    localStorage.setItem('ng_token', result.token);
    localStorage.setItem('ng_user', JSON.stringify(result.user));
    closeModal('auth');
    initAuthState();
    showToast('Welcome back, ' + result.user.name + '!');
  } catch (e) {
    showToast(e.message || 'Login failed');
  }
}

async function handleRegister() {
  const name     = document.getElementById('regName') ? document.getElementById('regName').value.trim() : '';
  const email    = document.getElementById('regEmail') ? document.getElementById('regEmail').value.trim() : '';
  const password = document.getElementById('regPassword') ? document.getElementById('regPassword').value : '';
  if (!name || !email || !password) return showToast('Please fill in all fields');
  try {
    const result = await API.auth.register(name, email, password);
    localStorage.setItem('ng_token', result.token);
    localStorage.setItem('ng_user', JSON.stringify(result.user));
    closeModal('auth');
    initAuthState();
    showToast('Welcome, ' + result.user.name + '!');
  } catch (e) {
    showToast(e.message || 'Registration failed');
  }
}

function initAuthState() {
  const user = API.getUser();
  const btn  = document.querySelector('.btn-auth');
  if (!btn) return;
  if (user) {
    btn.textContent = user.name.split(' ')[0];
    btn.onclick = function() { API.auth.logout(); initAuthState(); showToast('Signed out'); };
  } else {
    btn.textContent = 'Sign In';
    btn.onclick = function() { openModal('auth'); };
  }
}

// ── Checkout — Stripe Redirect ────────────────────────────────────────────────
function goToPayment() {
  const first   = document.getElementById('shFirst') ? document.getElementById('shFirst').value.trim() : '';
  const last    = document.getElementById('shLast') ? document.getElementById('shLast').value.trim() : '';
  const email   = document.getElementById('shEmail') ? document.getElementById('shEmail').value.trim() : '';
  const address = document.getElementById('shAddress') ? document.getElementById('shAddress').value.trim() : '';
  const city    = document.getElementById('shCity') ? document.getElementById('shCity').value.trim() : '';
  const zip     = document.getElementById('shZip') ? document.getElementById('shZip').value.trim() : '';

  if (!first || !last || !email || !address || !city || !zip)
    return showToast('Please fill in all shipping fields');

  window._shippingAddress = { name: first + ' ' + last, line1: address, city: city, zip: zip };
  proceedToStripe();
}

async function proceedToStripe() {
  const items = Cart.get();
  if (!items.length) return showToast('Your cart is empty');

  const btn = document.querySelector('#shippingStep .btn-full');
  if (btn) { btn.textContent = 'Redirecting to Stripe...'; btn.disabled = true; }

  try {
    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API.getToken(),
      },
      body: JSON.stringify({
        items: items.map(function(i) { return { product: i._id, qty: i.qty }; }),
        shippingAddress: window._shippingAddress || {},
      }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error);
      if (btn) { btn.textContent = 'Continue to Payment →'; btn.disabled = false; }
      return;
    }

    if (!data.url) {
      showToast('Could not create checkout session. Check Stripe keys in Admin.');
      if (btn) { btn.textContent = 'Continue to Payment →'; btn.disabled = false; }
      return;
    }

    // Redirect to Stripe hosted checkout page
    window.location.href = data.url;

  } catch (e) {
    showToast('Checkout failed. Please try again.');
    if (btn) { btn.textContent = 'Continue to Payment →'; btn.disabled = false; }
  }
}

function resetPaymentSteps() {
  var steps = ['shippingStep', 'paymentStep', 'confirmStep'];
  steps.forEach(function(id, i) {
    var el = document.getElementById(id);
    if (el) el.style.display = i === 0 ? 'block' : 'none';
  });
  var indicators = ['step1', 'step2', 'step3'];
  indicators.forEach(function(id, i) {
    var el = document.getElementById(id);
    if (el) { el.classList.remove('active', 'done'); if (i === 0) el.classList.add('active'); }
  });
  var btn = document.querySelector('#shippingStep .btn-full');
  if (btn) { btn.textContent = 'Continue to Payment →'; btn.disabled = false; }
}

function formatCard(input) {
  var v = input.value.replace(/\D/g, '').substring(0, 16);
  var parts = v.match(/.{1,4}/g);
  input.value = parts ? parts.join(' ') : v;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function renderFAQ() {
  const list = document.getElementById('faqList');
  if (!list) return;
  list.innerHTML = FAQ_DATA.map(function(item, i) {
    return `
    <div class="faq-item" id="faq-${i}">
      <div class="faq-question" onclick="toggleFAQ(${i})">
        <span>${item.q}</span>
        <span class="faq-icon">+</span>
      </div>
      <div class="faq-answer">
        <div class="faq-answer-inner">${item.a}</div>
      </div>
    </div>`;
  }).join('');
}

function toggleFAQ(i) {
  const item = document.getElementById('faq-' + i);
  if (!item) return;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(function(el) { el.classList.remove('open'); });
  if (!isOpen) item.classList.add('open');
}

// ── Mobile Menu ───────────────────────────────────────────────────────────────
function toggleMobileMenu() {
  const links = document.querySelector('.nav-links');
  if (!links) return;
  const isOpen = links.style.display === 'flex';
  if (isOpen) {
    links.style.cssText = '';
  } else {
    links.style.cssText = 'display:flex;flex-direction:column;position:absolute;top:72px;left:0;right:0;background:rgba(248,244,238,0.98);padding:20px 24px;border-bottom:1px solid var(--border);backdrop-filter:blur(16px);z-index:999;';
  }
}

// ── Subscribe ─────────────────────────────────────────────────────────────────
function subscribe() {
  const input = document.getElementById('emailInput');
  if (!input || !input.value.trim()) return showToast('Please enter your email');
  showToast("You're subscribed! Welcome to NeuGlow.");
  input.value = '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const toast    = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ── Go to checkout page ───────────────────────────────────────────────────────
function goToCheckout() {
  const user = API.getUser();
  if (!user) {
    showToast('Please sign in to checkout');
    closeCart();
    openModal('auth');
    return;
  }
  if (!Cart.get().length) {
    showToast('Your cart is empty');
    return;
  }
  window.location.href = 'checkout.html';
}