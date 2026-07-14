const CART_KEY = 'shopxtra_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.slug === product.slug);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      category: product.category,
      images: product.images || [],
      qty,
    });
  }
  saveCart(cart);
  openCartDrawer();
}

function updateCartQty(slug, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((item) => item.slug !== slug);
  } else {
    const item = cart.find((i) => i.slug === slug);
    if (item) item.qty = qty;
  }
  saveCart(cart);
  renderCartDrawer();
}

function removeFromCart(slug) {
  saveCart(getCart().filter((item) => item.slug !== slug));
  renderCartDrawer();
}

function cartTotal(cart = getCart()) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartCount(cart = getCart()) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  if (!badge) return;
  const newCount = cartCount();
  const changed = badge.textContent !== String(newCount);
  badge.textContent = newCount;
  if (changed && typeof pulseCartBadge === 'function') pulseCartBadge();
}

function ensureCartDrawer() {
  if (document.getElementById('cart-drawer')) return;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="offcanvas offcanvas-end cart-drawer" tabindex="-1" id="cart-drawer" aria-labelledby="cartDrawerLabel">
      <div class="cart-drawer-header">
        <span id="cartDrawerLabel">Your bag <span class="cart-drawer-count" id="cart-drawer-count"></span></span>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="cart-drawer-body" id="cart-drawer-items"></div>
      <div class="cart-drawer-footer" id="cart-drawer-footer"></div>
    </div>
  `;
  document.body.appendChild(el.firstElementChild);
}

function cartDrawerItemHtml(item) {
  return `
    <div class="cart-drawer-item">
      <div class="cart-drawer-thumb">${productMediaHtml(item)}</div>
      <div class="cart-drawer-item-info">
        <span class="cart-drawer-item-name">${item.name}</span>
        <span class="cart-drawer-item-meta">Qty ${item.qty} &middot; ${formatPrice(item.price)}</span>
      </div>
      <span class="cart-drawer-item-price">${formatPrice(item.price * item.qty)}</span>
    </div>
  `;
}

function renderCartDrawer() {
  ensureCartDrawer();
  const cart = getCart();
  const itemsEl = document.getElementById('cart-drawer-items');
  const footerEl = document.getElementById('cart-drawer-footer');
  const countEl = document.getElementById('cart-drawer-count');

  countEl.textContent = cart.length ? `· ${cartCount(cart)} item${cartCount(cart) === 1 ? '' : 's'}` : '';

  if (!cart.length) {
    itemsEl.innerHTML = '<p class="text-center py-5" style="color:var(--muted);">Your bag is empty.</p>';
    footerEl.innerHTML = `<a href="/pages/shop.html" class="btn btn-plum w-100">Start shopping</a>`;
    return;
  }

  itemsEl.innerHTML = cart.map(cartDrawerItemHtml).join('');
  footerEl.innerHTML = `
    <div class="cart-drawer-subtotal">
      <span>Subtotal</span>
      <span>${formatPrice(cartTotal(cart))}</span>
    </div>
    <a href="/pages/checkout.html" class="btn btn-plum w-100">Checkout — Cash on Delivery</a>
    <a href="/pages/cart.html" class="cart-drawer-view-cart">View &amp; edit bag</a>
  `;
}

function openCartDrawer() {
  ensureCartDrawer();
  renderCartDrawer();
  if (typeof bootstrap !== 'undefined') {
    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('cart-drawer')).show();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ensureCartDrawer();
  updateCartBadge();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.quick-add-btn');
  if (!btn || btn.disabled) return;
  e.preventDefault();
  e.stopPropagation();

  addToCart({
    slug: btn.dataset.slug,
    name: btn.dataset.name,
    price: Number(btn.dataset.price),
    category: btn.dataset.category,
    images: btn.dataset.image ? [btn.dataset.image] : [],
  });

  if (typeof bounceButton === 'function') bounceButton(btn);
  if (typeof flyToCart === 'function') flyToCart(btn);
});
