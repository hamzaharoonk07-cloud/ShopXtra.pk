async function loadConfirmation() {
  const main = document.getElementById('confirmation-main');
  const orderId = new URLSearchParams(window.location.search).get('order');

  if (!orderId) {
    main.innerHTML = '<p class="text-center py-5">No order specified.</p>';
    return;
  }

  try {
    const order = await apiGet(`/orders/${encodeURIComponent(orderId)}`);
    const itemsHtml = order.items.map((item) => `
      <div class="d-flex justify-content-between mb-2">
        <span>${item.name} <span class="mono" style="color:#6b5a58;">x${item.qty}</span></span>
        <span class="price">${formatPrice(item.price_at_purchase * item.qty)}</span>
      </div>
    `).join('');

    main.innerHTML = `
      <div class="text-center mb-4" data-reveal="hero">
        <span style="font-size: 3rem; color: var(--gold);" aria-hidden="true">&#10004;</span>
        <h1 class="mt-2">Thank you, ${order.shipping_name.split(' ')[0]}!</h1>
        <p style="color:#6b5a58;">Your order <span class="mono">#${order.id}</span> has been placed and will be paid via Cash on Delivery.</p>
      </div>
      <div class="filter-panel" data-reveal="hero">
        <h2 class="h5 mb-3">Order summary</h2>
        ${itemsHtml}
        <hr>
        ${Number(order.discount_total) > 0 ? `
          <div class="d-flex justify-content-between mb-2">
            <span>Discount ${order.promo_code ? `(${order.promo_code})` : ''}</span>
            <span class="price" style="color: var(--gold);">- ${formatPrice(order.discount_total)}</span>
          </div>
        ` : ''}
        <div class="d-flex justify-content-between fw-semibold mb-3">
          <span>Total</span>
          <span class="price">${formatPrice(order.total)}</span>
        </div>
        <p class="mb-1" style="color:#6b5a58;">${order.shipping_address}, ${order.shipping_city}</p>
        <p class="mb-0" style="color:#6b5a58;">${order.shipping_phone}</p>
      </div>
      <div class="text-center mt-4" data-reveal="hero">
        <a href="/pages/shop.html" class="btn btn-plum">Continue shopping</a>
      </div>
    `;

    if (typeof gsap !== 'undefined' && !prefersReducedMotion) {
      gsap.from(main.children, { opacity: 0, y: 24, duration: 0.6, stagger: 0.15, ease: 'power2.out' });
    }
  } catch (err) {
    main.innerHTML = `<p class="text-center py-5 text-danger">Could not load order: ${err.message}</p>`;
  }
}

loadConfirmation();
