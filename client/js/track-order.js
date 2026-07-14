document.getElementById('track-form').addEventListener('submit', async (e) => {
  e.preventDefault();
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

    resultEl.innerHTML = `
      <div class="track-result-card">
        <div class="track-result-head">
          <div>
            <h2>Order SX-${order.id}</h2>
            <span class="track-result-meta">${itemCount} item${itemCount === 1 ? '' : 's'} · ${formatPrice(order.total)} · Cash on Delivery</span>
          </div>
          <span class="track-status-pill">${order.status}</span>
        </div>
        ${statusTimelineHtml(order.status)}
        ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
          <div class="track-arriving-banner">
            <span>Your order is on its way — have ${formatPrice(order.total)} ready for the rider.</span>
          </div>
        ` : ''}
        <hr>
        ${itemsHtml}
        <div class="d-flex justify-content-between fw-semibold mt-2">
          <span>Total</span>
          <span class="price">${formatPrice(order.total)}</span>
        </div>
        <p class="mb-0 mt-2" style="color:#6b5a58; font-size: 0.85rem;">${order.shipping_address}, ${order.shipping_city}</p>
      </div>
    `;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});
