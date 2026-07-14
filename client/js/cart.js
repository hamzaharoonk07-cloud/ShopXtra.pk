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
}

function removeFromCart(slug) {
  saveCart(getCart().filter((item) => item.slug !== slug));
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

document.addEventListener('DOMContentLoaded', updateCartBadge);

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
