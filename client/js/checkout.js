let appliedPromo = null;

function renderCheckoutSummary() {
  const cart = getCart();
  const itemsEl = document.getElementById('checkout-items');
  const submitBtn = document.getElementById('place-order-btn');

  if (!cart.length) {
    itemsEl.innerHTML = '<p style="color:#6b5a58;">Your cart is empty.</p>';
    submitBtn.disabled = true;
  } else {
    itemsEl.innerHTML = cart.map((item) => `
      <div class="checkout-summary-item">
        <div class="checkout-summary-thumb">${productMediaHtml(item)}</div>
        <div class="checkout-summary-item-info">
          <span class="checkout-summary-item-name">${item.name}</span>
          <span class="checkout-summary-item-qty">Qty ${item.qty}</span>
        </div>
        <span class="checkout-summary-item-price">${formatPrice(item.price * item.qty)}</span>
      </div>
    `).join('');
  }
  updateTotals();
}

function updateTotals() {
  const subtotal = cartTotal(getCart());
  document.getElementById('checkout-subtotal').textContent = formatPrice(subtotal);

  const city = document.getElementById('ship-city').value;
  const shippingFee = computeShippingFee(city, subtotal);
  document.getElementById('checkout-shipping').textContent = shippingFee > 0 ? formatPrice(shippingFee) : 'Free';

  const discountRow = document.getElementById('promo-discount-row');
  const discount = appliedPromo ? appliedPromo.discountAmount : 0;
  if (appliedPromo && appliedPromo.discountType === 'free_gift') {
    discountRow.classList.remove('d-none');
    document.getElementById('checkout-discount-label').textContent = 'Free gift';
    document.getElementById('checkout-discount').textContent = appliedPromo.giftProduct?.name || 'Included';
  } else if (appliedPromo) {
    discountRow.classList.remove('d-none');
    document.getElementById('checkout-discount-label').textContent = 'Discount';
    document.getElementById('checkout-discount').textContent = `- ${formatPrice(discount)}`;
  } else {
    discountRow.classList.add('d-none');
  }
  document.getElementById('checkout-total').textContent = formatPrice(subtotal - discount + shippingFee);
}

async function applyPromoCode(code) {
  const messageEl = document.getElementById('promo-message');
  if (!code) return;

  try {
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal: cartTotal(getCart()) }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);

    appliedPromo = body;
    messageEl.textContent = `Code "${body.code}" applied.`;
    messageEl.style.color = 'var(--gold)';
    messageEl.classList.remove('d-none');
    updateTotals();
  } catch (err) {
    appliedPromo = null;
    messageEl.textContent = err.message;
    messageEl.style.color = '#b3413a';
    messageEl.classList.remove('d-none');
    updateTotals();
  }
}

document.getElementById('promo-apply-btn').addEventListener('click', () => {
  const input = document.getElementById('promo-input');
  applyPromoCode(input.value.trim());
});

document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('checkout-error');
  const submitBtn = document.getElementById('place-order-btn');
  errorEl.classList.add('d-none');

  const cart = getCart();
  if (!cart.length) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Placing order…';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((item) => ({ slug: item.slug, qty: item.qty })),
        email: document.getElementById('ship-email').value,
        shipping: {
          name: document.getElementById('ship-name').value,
          phone: document.getElementById('ship-phone').value,
          address: document.getElementById('ship-address').value,
          city: document.getElementById('ship-city').value,
          postalCode: document.getElementById('ship-postal').value,
        },
        paymentMethod: 'cod',
        promoCode: appliedPromo ? appliedPromo.code : undefined,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);

    localStorage.removeItem(CART_KEY);
    submitBtn.innerHTML = '<span class="btn-checkmark" aria-hidden="true">&#10004;</span> Order placed!';
    submitBtn.classList.add('btn-success-state');

    const goToConfirmation = () => {
      window.location.href = `/pages/order-confirmation.html?order=${body.id}`;
    };
    if (typeof gsap !== 'undefined' && !prefersReducedMotion) {
      gsap.fromTo(submitBtn, { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1, onComplete: () => setTimeout(goToConfirmation, 350) });
    } else {
      setTimeout(goToConfirmation, 600);
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place order';
  }
});

document.getElementById('ship-city').innerHTML = cityOptionsHtml();
document.getElementById('ship-city').addEventListener('change', updateTotals);

renderCheckoutSummary();

(async () => {
  try {
    const meRes = await fetch('/api/auth/me');
    if (!meRes.ok) return;
    const { user } = await meRes.json();
    document.getElementById('ship-name').value = user.name || '';
    document.getElementById('ship-phone').value = user.phone || '';
    document.getElementById('ship-email').value = user.email || '';

    const addresses = await apiGet('/addresses');
    const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];
    if (defaultAddress) {
      document.getElementById('ship-address').value = defaultAddress.line1;
      document.getElementById('ship-city').value = defaultAddress.city;
      document.getElementById('ship-postal').value = defaultAddress.postal_code || '';
      updateTotals();
    }
  } catch {
    // Guest checkout; leave shipping fields blank for manual entry.
  }
})();

const promoFromUrl = new URLSearchParams(window.location.search).get('promo');
if (promoFromUrl) {
  document.getElementById('promo-input').value = promoFromUrl;
  applyPromoCode(promoFromUrl);
}
