/**
 * js/api.js — NeuGlow API Client
 * All fetch calls go through here so auth headers are always attached.
 */

const API = (() => {
  const BASE = '/api';

  function getToken() { return localStorage.getItem('ng_token'); }
  function getUser()  {
    try { return JSON.parse(localStorage.getItem('ng_user')); }
    catch { return null; }
  }

  function headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const t = getToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  }

  async function req(method, path, body) {
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  return {
    getToken, getUser,

    auth: {
      login:    (email, password) => req('POST', '/auth/login',    { email, password }),
      register: (name, email, password) => req('POST', '/auth/register', { name, email, password }),
      me:       ()                => req('GET',  '/auth/me'),
      logout:   ()                => { localStorage.removeItem('ng_token'); localStorage.removeItem('ng_user'); },
    },

    products: {
      list:    ()   => req('GET', '/products'),
      get:     (id) => req('GET', `/products/${id}`),
    },

    orders: {
      create: (data) => req('POST', '/orders', data),
      mine:   ()     => req('GET',  '/orders/mine'),
    },

    admin: {
      stats:         ()       => req('GET',    '/admin/stats'),
      products:      ()       => req('GET',    '/admin/products'),
      createProduct: (data)   => req('POST',   '/admin/products',        data),
      updateProduct: (id, d)  => req('PUT',    `/admin/products/${id}`,   d),
      deleteProduct: (id)     => req('DELETE', `/admin/products/${id}`),
      updateStock:   (id, stock) => req('PATCH', `/admin/products/${id}/stock`, { stock }),
      orders:        (q = '') => req('GET',    '/admin/orders' + q),
      updateOrder:   (id, d)  => req('PUT',    `/admin/orders/${id}`,     d),
      users:         ()       => req('GET',    '/admin/users'),
      updateUserRole:(id, role) => req('PUT',  `/admin/users/${id}/role`, { role }),
    },

    config: {
      get:  ()     => req('GET',  '/config'),
      save: (data) => req('POST', '/config', data),
      test: ()     => req('POST', '/config/test-connection'),
    },

    health: () => req('GET', '/health'),
  };
})();

// Shared toast
function showToast(msg, type = 'default') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Cart helpers (localStorage)
const Cart = {
  get: () => { try { return JSON.parse(localStorage.getItem('ng_cart')) || []; } catch { return []; } },
  set: (items) => localStorage.setItem('ng_cart', JSON.stringify(items)),
  count: () => Cart.get().reduce((s, i) => s + i.qty, 0),
  add: (product, qty = 1) => {
    const items = Cart.get();
    const ex = items.find(i => i._id === product._id);
    if (ex) ex.qty += qty;
    else items.push({ ...product, qty });
    Cart.set(items);
    updateCartBadge();
  },
  remove: (id) => { Cart.set(Cart.get().filter(i => i._id !== id)); updateCartBadge(); },
  updateQty: (id, qty) => {
    if (qty < 1) return Cart.remove(id);
    const items = Cart.get();
    const i = items.find(i => i._id === id);
    if (i) i.qty = qty;
    Cart.set(items);
    updateCartBadge();
  },
  clear: () => { localStorage.removeItem('ng_cart'); updateCartBadge(); },
  total: () => Cart.get().reduce((s, i) => s + i.price * i.qty, 0),
};

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = Cart.count();
  badges.forEach(b => { b.textContent = count; b.style.display = count ? 'flex' : 'none'; });
}

// Init cart badge on load
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  // Navbar scroll effect
  const nav = document.querySelector('.navbar');
  if (nav) {
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 30), { passive: true });
    if (scrollY > 30) nav.classList.add('scrolled');
  }
});
