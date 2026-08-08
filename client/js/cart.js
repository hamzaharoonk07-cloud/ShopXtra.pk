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

/* Cosmetics ship in numbered shades. Rather than a variant per shade (which
   ties up stock counts nobody maintains) or a free-text box at checkout the
   customer has already forgotten the product by, the choice is asked for at
   the moment of adding to the cart. It rides along on the cart line and is
   composed into the order notes at checkout. */
const SHADE_COUNT = 6;

function ensureShadeModal() {
  let modal = document.getElementById('shade-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'shade-modal';
  modal.className = 'shade-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'shade-modal-title');
  modal.hidden = true;
  modal.innerHTML = `
    <div class="shade-modal-backdrop" data-shade-dismiss></div>
    <div class="shade-modal-panel">
      <button type="button" class="shade-modal-close" data-shade-dismiss aria-label="Close">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
      </button>
      <h2 id="shade-modal-title">Choose your shade</h2>
      <p class="shade-modal-sub" id="shade-modal-product"></p>
      <div class="shade-modal-options" id="shade-modal-options"></div>
      <p class="shade-modal-error" id="shade-modal-error" hidden>Pick a shade to continue.</p>
      <button type="button" class="btn btn-plum w-100" id="shade-modal-confirm">Add to cart</button>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

/* Resolves to the chosen shade, or null if the shopper backed out - in which
   case nothing is added, rather than landing an unspecified cosmetic in the
   cart for someone to chase up later. */
function askForShade(product) {
  return new Promise((resolve) => {
    const modal = ensureShadeModal();
    const options = modal.querySelector('#shade-modal-options');
    const error = modal.querySelector('#shade-modal-error');
    const confirm = modal.querySelector('#shade-modal-confirm');
    let selected = null;

    modal.querySelector('#shade-modal-product').textContent = product.name;
    error.hidden = true;
    options.innerHTML = Array.from({ length: SHADE_COUNT }, (_, i) => `
      <button type="button" class="shade-option" data-shade="Shade ${i + 1}">${i + 1}</button>
    `).join('');

    const close = (value) => {
      modal.hidden = true;
      document.body.classList.remove('shade-modal-open');
      options.onclick = null;
      confirm.onclick = null;
      document.removeEventListener('keydown', onKey);
      modal.querySelectorAll('[data-shade-dismiss]').forEach((el) => { el.onclick = null; });
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };

    options.onclick = (e) => {
      const btn = e.target.closest('.shade-option');
      if (!btn) return;
      options.querySelectorAll('.shade-option').forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selected = btn.dataset.shade;
      error.hidden = true;
    };
    confirm.onclick = () => {
      if (!selected) { error.hidden = false; return; }
      close(selected);
    };
    modal.querySelectorAll('[data-shade-dismiss]').forEach((el) => { el.onclick = () => close(null); });
    document.addEventListener('keydown', onKey);

    modal.hidden = false;
    document.body.classList.add('shade-modal-open');
    options.querySelector('.shade-option')?.focus();
  });
}

async function addToCart(product, qty = 1) {
  let shade = product.shade || null;
  if (!shade && product.category === 'cosmetics') {
    shade = await askForShade(product);
    if (!shade) return;
  }

  const cart = getCart();
  const existing = cart.find((item) => item.slug === product.slug && (item.shade || null) === shade);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      slug: product.slug,
      name: shade ? `${product.name} (${shade})` : product.name,
      shade: shade || undefined,
      price: Number(product.price),
      category: product.category,
      images: product.images || [],
      qty,
    });
  }
  saveCart(cart);
  openCartDrawer();
  if (typeof showCartToast === 'function') showCartToast(product);
  if (typeof fbq === 'function') {
    fbq('track', 'AddToCart', {
      content_ids: [product.slug],
      content_name: product.name,
      content_type: 'product',
      value: Number(product.price) * qty,
      currency: 'PKR',
    });
  }
  if (product.slug) {
    fetch(`/api/products/${product.slug}/cart-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty }),
    }).catch(() => {});
  }
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
    <div class="cart-drawer-item" data-slug="${item.slug}">
      <div class="cart-drawer-thumb">${productMediaHtml(item)}</div>
      <div class="cart-drawer-item-info">
        <span class="cart-drawer-item-name">${item.name}</span>
        <span class="cart-drawer-item-meta">${formatPrice(item.price)} each</span>
        <div class="cart-drawer-qty-stepper">
          <button type="button" class="cart-drawer-qty-btn" data-action="decrease" aria-label="Decrease quantity">&minus;</button>
          <span class="cart-drawer-qty-value">${item.qty}</span>
          <button type="button" class="cart-drawer-qty-btn" data-action="increase" aria-label="Increase quantity">+</button>
          <button type="button" class="cart-drawer-remove-btn" data-action="remove" aria-label="Remove ${item.name}">Remove</button>
        </div>
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
    <a href="/pages/checkout.html" class="btn btn-plum w-100">Checkout with Cash on Delivery</a>
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
  const stepperBtn = e.target.closest('.cart-drawer-qty-btn, .cart-drawer-remove-btn');
  if (stepperBtn) {
    const row = stepperBtn.closest('[data-slug]');
    const slug = row.dataset.slug;
    const action = stepperBtn.dataset.action;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (action === 'remove') {
      if (!reduceMotion && typeof gsap !== 'undefined') {
        gsap.to(row, {
          opacity: 0,
          x: 24,
          height: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => removeFromCart(slug),
        });
      } else {
        removeFromCart(slug);
      }
    } else {
      const item = getCart().find((i) => i.slug === slug);
      if (item) updateCartQty(slug, item.qty + (action === 'increase' ? 1 : -1));
      if (!reduceMotion && typeof gsap !== 'undefined') {
        requestAnimationFrame(() => {
          const newRow = document.querySelector(`.cart-drawer-item[data-slug="${slug}"]`);
          const targets = newRow ? [newRow.querySelector('.cart-drawer-qty-value'), newRow.querySelector('.cart-drawer-item-price')] : [];
          targets.forEach((el) => {
            if (!el) return;
            gsap.fromTo(el, { scale: 1.35 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
          });
        });
      }
    }
    return;
  }

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
