function statusMessage(status) {
  const messages = {
    pending: 'We\'ve received your order and it\'s being reviewed before packing begins.',
    processing: 'Your order is confirmed and is now being packed for dispatch.',
    shipped: 'Your order is on its way with the courier.',
    delivered: 'This order has been delivered. We hope you love it.',
    cancelled: 'This order was cancelled.',
  };
  return messages[status] || 'We are processing your order.';
}

async function submitTrackForm() {
  const errorEl = document.getElementById('track-error');
  const resultEl = document.getElementById('track-result');
  errorEl.classList.add('d-none');
  resultEl.innerHTML = '';

  try {
    const res = await fetch('/api/orders/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: document.getElementById('track-order-id').value.trim().replace(/^SX-/i, ''),
        phone: document.getElementById('track-phone').value,
      }),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error);

    const itemsHtml = order.items.map((item) => `
      <div class="d-flex justify-content-between mb-2">
        <span>${item.name} <span class="mono" style="color:#6b5a58;">x${item.qty}</span></span>
        <span class="price">${formatPrice(item.price_at_purchase * item.qty)}</span>
      </div>
    `).join('');

    const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);

    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    resultEl.innerHTML = `
      <div class="track-result-card">
        <div class="track-result-head">
          <div>
            <h2>Order SX-${order.id}</h2>
            <span class="track-result-meta">Placed ${orderDate} · ${itemCount} item${itemCount === 1 ? '' : 's'} · ${formatPrice(order.total)} · Cash on Delivery</span>
          </div>
          <span class="track-status-pill">${order.status}</span>
        </div>
        ${statusTimelineHtml(order.status)}
        <div class="track-arriving-banner ${order.status === 'cancelled' ? 'track-banner-cancelled' : ''}">
          <span>${statusMessage(order.status)}</span>
        </div>
        <hr>
        ${itemsHtml}
        <div class="d-flex justify-content-between fw-semibold mt-2">
          <span>Total</span>
          <span class="price">${formatPrice(order.total)}</span>
        </div>
        <hr>
        <div style="font-size: 0.85rem; color:#6b5a58;">
          <p class="mb-1"><strong style="color:var(--plum);">${order.shipping_name}</strong></p>
          <p class="mb-0">${order.shipping_address}, ${order.shipping_city}${order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ''}</p>
        </div>
      </div>
    `;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
}

document.getElementById('track-form').addEventListener('submit', (e) => {
  e.preventDefault();
  submitTrackForm();
});

(() => {
  const params = new URLSearchParams(window.location.search);
  const orderParam = params.get('order');
  const phoneParam = params.get('phone');
  if (orderParam) document.getElementById('track-order-id').value = `SX-${orderParam}`;
  if (phoneParam) document.getElementById('track-phone').value = phoneParam;
  if (orderParam && phoneParam) submitTrackForm();
})();
