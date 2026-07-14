function cartItemHtml(item) {
  return `
    <div class="d-flex align-items-center gap-3 py-3 border-bottom" data-slug="${item.slug}">
      <div class="product-image" style="width: 90px; aspect-ratio: 1/1; border-radius: var(--radius-sm); flex-shrink: 0;">
        ${productMediaHtml(item)}
      </div>
      <div class="flex-grow-1">
        <span class="category-tint tint-${item.category}" style="font-size: 0.65rem;">${categoryLabel(item.category)}</span>
        <div class="product-name">${item.name}</div>
        <div class="price" style="color: var(--plum); font-weight: 600;">${formatPrice(item.price)}</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <input type="number" class="form-control qty-input" value="${item.qty}" min="1" style="width: 70px;" aria-label="Quantity for ${item.name}">
        <button class="btn btn-outline-plum btn-sm remove-btn" aria-label="Remove ${item.name}">Remove</button>
      </div>
    </div>
  `;
}

function renderCartPage() {
  const container = document.getElementById('cart-items');
  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `
      <div class="filter-panel text-center py-5">
        <p class="mb-3">Your cart is empty.</p>
        <a href="/pages/shop.html" class="btn btn-plum">Start shopping</a>
      </div>
    `;
    document.getElementById('checkout-btn').classList.add('disabled');
    document.getElementById('checkout-btn').setAttribute('aria-disabled', 'true');
  } else {
    container.innerHTML = cart.map(cartItemHtml).join('');
    document.getElementById('checkout-btn').classList.remove('disabled');
    document.getElementById('checkout-btn').removeAttribute('aria-disabled');

    container.querySelectorAll('[data-slug]').forEach((row) => {
      const slug = row.dataset.slug;
      row.querySelector('.qty-input').addEventListener('change', (e) => {
        updateCartQty(slug, Number(e.target.value) || 0);
        renderCartPage();
      });
      row.querySelector('.remove-btn').addEventListener('click', () => {
        removeFromCart(slug);
        renderCartPage();
      });
    });
  }

  document.getElementById('cart-subtotal').textContent = formatPrice(cartTotal(cart));
  const count = cartCount(cart);
  document.getElementById('cart-count-label').textContent = count ? `· ${count} item${count === 1 ? '' : 's'}` : '';
}

renderCartPage();
