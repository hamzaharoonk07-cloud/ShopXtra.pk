async function fetchCurrentUser() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return null;
  const body = await res.json();
  return body.user;
}

function showLoggedIn(user) {
  document.getElementById('account-loading').classList.add('d-none');
  document.getElementById('account-logged-out').classList.add('d-none');
  document.getElementById('account-logged-in').classList.remove('d-none');
  document.getElementById('account-name').textContent = user.name;
  document.getElementById('account-email').textContent = user.email;
  document.getElementById('account-avatar').textContent = (user.name || '?').trim().charAt(0).toUpperCase();
  document.getElementById('admin-panel-link')?.classList.toggle('d-none', user.role !== 'admin');
  document.getElementById('profile-name').value = user.name || '';
  document.getElementById('profile-phone').value = user.phone || '';
  loadOrderHistory();
  loadWishlist();
  loadAddresses();
}

document.querySelectorAll('#dashboard-nav [data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#dashboard-nav [data-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.dashboard-pane').forEach((pane) => pane.classList.add('d-none'));
    document.getElementById(`dash-${btn.dataset.tab}`)?.classList.remove('d-none');
  });
});

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const savedEl = document.getElementById('profile-saved');
  savedEl.classList.add('d-none');
  try {
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('profile-name').value,
        phone: document.getElementById('profile-phone').value,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    document.getElementById('account-name').textContent = body.user.name;
    savedEl.classList.remove('d-none');
  } catch {
    // Silently ignore; form values remain as typed for the user to retry.
  }
});

async function loadAddresses() {
  const container = document.getElementById('address-list');
  try {
    const addresses = await apiGet('/addresses');
    document.getElementById('stat-address-count').textContent = addresses.length;
    container.innerHTML = addresses.length
      ? addresses.map((a) => `
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom" data-id="${a.id}">
            <div>
              <span>${a.line1}, ${a.city}${a.postal_code ? ' ' + a.postal_code : ''}</span>
              ${a.is_default ? '<span class="category-tint tint-cosmetics ms-2" style="font-size:0.6rem;">Default</span>' : ''}
            </div>
            <div class="d-flex gap-2">
              ${!a.is_default ? '<button type="button" class="btn btn-outline-plum btn-sm set-default-btn">Set default</button>' : ''}
              <button type="button" class="btn btn-sm btn-outline-danger remove-addr-btn">Remove</button>
            </div>
          </div>
        `).join('')
      : '<p style="color:#6b5a58;">No saved addresses yet.</p>';

    container.querySelectorAll('[data-id]').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('.set-default-btn')?.addEventListener('click', async () => {
        await fetch(`/api/addresses/${id}/default`, { method: 'PATCH' });
        loadAddresses();
      });
      row.querySelector('.remove-addr-btn')?.addEventListener('click', async () => {
        await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
        loadAddresses();
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Could not load addresses: ${err.message}</p>`;
  }
}

document.getElementById('address-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line1: document.getElementById('addr-line1').value,
        city: document.getElementById('addr-city').value,
        postal_code: document.getElementById('addr-postal').value,
        is_default: false,
      }),
    });
    if (!res.ok) return;
    document.getElementById('address-form').reset();
    loadAddresses();
  } catch {
    // Address list stays as-is; user can retry the add.
  }
});

async function loadWishlist() {
  const container = document.getElementById('wishlist-items');
  try {
    const items = await apiGet('/wishlist');
    document.getElementById('stat-wishlist-count').textContent = items.length;
    container.innerHTML = items.length
      ? items.map(productCardHtml).join('')
      : '<p style="color:#6b5a58;">Nothing saved yet — tap the heart on any product.</p>';
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Could not load wishlist: ${err.message}</p>`;
  }
}

async function loadOrderHistory() {
  const container = document.getElementById('order-history');
  const overview = document.getElementById('overview-latest-order');
  try {
    const orders = await apiGet('/orders/mine');

    document.getElementById('stat-order-count').textContent = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
    document.getElementById('stat-total-spent').textContent = formatPrice(totalSpent);

    if (!orders.length) {
      container.innerHTML = '<p style="color:#6b5a58;">No orders yet.</p>';
      overview.innerHTML = '<p style="color:#6b5a58;">No orders yet — <a href="/pages/shop.html">start shopping</a>.</p>';
      return;
    }

    overview.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <span class="mono">#${orders[0].id}</span>
          <span class="category-tint tint-cosmetics ms-2" style="font-size:0.65rem;">${orders[0].status}</span>
        </div>
        <span class="price">${formatPrice(orders[0].total)}</span>
      </div>
      ${statusTimelineHtml(orders[0].status)}
    `;

    container.innerHTML = orders.map((order, i) => `
      <div class="border-bottom">
        <button type="button" class="order-history-row btn w-100 d-flex justify-content-between align-items-center py-2 text-start" data-target="order-timeline-${i}">
          <div>
            <span class="mono">#${order.id}</span>
            <span class="category-tint tint-cosmetics ms-2" style="font-size:0.65rem;">${order.status}</span>
            <div style="color:#6b5a58; font-size: 0.85rem;">${new Date(order.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
          <span class="price">${formatPrice(order.total)}</span>
        </button>
        <div class="collapse pb-3" id="order-timeline-${i}">${statusTimelineHtml(order.status)}</div>
      </div>
    `).join('');

    container.querySelectorAll('.order-history-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        bootstrap.Collapse.getOrCreateInstance(document.getElementById(btn.dataset.target)).toggle();
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Could not load orders: ${err.message}</p>`;
  }
}

function showLoggedOut() {
  document.getElementById('account-loading').classList.add('d-none');
  document.getElementById('account-logged-in').classList.add('d-none');
  document.getElementById('account-logged-out').classList.remove('d-none');
}

document.querySelectorAll('#auth-tabs [data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#auth-tabs [data-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('login-form').classList.toggle('d-none', tab !== 'login');
    document.getElementById('signup-form').classList.toggle('d-none', tab !== 'signup');
  });
});

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('d-none');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    showLoggedIn(body.user);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('signup-error');
  errorEl.classList.add('d-none');
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('signup-name').value,
        email: document.getElementById('signup-email').value,
        phone: document.getElementById('signup-phone').value,
        password: document.getElementById('signup-password').value,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    showLoggedIn(body.user);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  document.getElementById('account-logged-in').classList.add('d-none');
  showLoggedOut();
});

(async () => {
  const user = await fetchCurrentUser();
  if (user) {
    showLoggedIn(user);
  } else {
    showLoggedOut();
  }
})();
