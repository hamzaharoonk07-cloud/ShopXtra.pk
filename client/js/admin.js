let allProducts = [];
let allOrders = [];
let allUsers = [];
let orderStatusFilter = '';

document.querySelectorAll('#admin-tabs [data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#admin-tabs [data-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-main > section').forEach((s) => s.classList.add('d-none'));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('d-none');
  });
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/pages/account.html';
});

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadOverview() {
  const stats = document.getElementById('overview-stats');
  const topProducts = document.getElementById('overview-top-products');
  const statusBars = document.getElementById('overview-status-bars');
  document.getElementById('overview-updated').textContent = `Updated ${new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`;

  try {
    const data = await apiGet('/orders/overview');
    const statusCounts = Object.fromEntries((data.byStatus || []).map((s) => [s.status, Number(s.count)]));
    const avgOrder = data.order_count > 0 ? data.revenue / data.order_count : 0;
    const lowStockCount = allProducts.filter((p) => p.stock > 0 && p.stock <= 5).length;

    stats.innerHTML = `
      <div class="admin-stat-card">
        <span class="admin-stat-label">Revenue</span>
        <span class="admin-stat-value">${formatPrice(data.revenue)}</span>
      </div>
      <div class="admin-stat-card">
        <span class="admin-stat-label">Orders</span>
        <span class="admin-stat-value">${data.order_count}</span>
      </div>
      <div class="admin-stat-card">
        <span class="admin-stat-label">Pending</span>
        <span class="admin-stat-value">${statusCounts.pending || 0}</span>
      </div>
      <div class="admin-stat-card">
        <span class="admin-stat-label">Avg. order value</span>
        <span class="admin-stat-value">${formatPrice(avgOrder)}</span>
      </div>
      <div class="admin-stat-card ${lowStockCount > 0 ? 'admin-stat-card-warn' : ''}">
        <span class="admin-stat-label">Low stock</span>
        <span class="admin-stat-value">${lowStockCount}</span>
      </div>
      <div class="admin-stat-card">
        <span class="admin-stat-label">Customers</span>
        <span class="admin-stat-value">${allUsers.length || '—'}</span>
      </div>
    `;

    const maxCount = Math.max(1, ...Object.values(statusCounts));
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    statusBars.innerHTML = statuses.map((s) => `
      <div class="admin-status-bar-row">
        <span class="admin-status-bar-label">${s}</span>
        <div class="admin-status-bar-track">
          <div class="admin-status-bar-fill" style="width:${((statusCounts[s] || 0) / maxCount) * 100}%;"></div>
        </div>
        <span class="admin-status-bar-count">${statusCounts[s] || 0}</span>
      </div>
    `).join('');

    topProducts.innerHTML = data.topProducts.length
      ? data.topProducts.map((p) => `
          <div class="admin-top-product-row">
            <span>${p.name}</span>
            <span class="mono">${p.units_sold} sold</span>
          </div>
        `).join('')
      : '<p style="color:#6b5a58;">No sales yet.</p>';

    const recentTbody = document.getElementById('overview-recent-orders');
    if (recentTbody) {
      const recent = allOrders.slice(0, 5);
      recentTbody.innerHTML = recent.length ? recent.map((o) => `
        <tr>
          <td class="mono">#${o.id}</td>
          <td>${o.shipping_name}</td>
          <td class="price">${formatPrice(o.total)}</td>
          <td><span class="admin-low-stock-tag" style="background:var(--tea-pink); color:var(--plum); text-transform:capitalize;">${o.status}</span></td>
          <td class="mono" style="font-size:0.8rem;">${new Date(o.created_at).toLocaleDateString('en-PK')}</td>
        </tr>
      `).join('') : '<tr><td colspan="5" style="color:#6b5a58;">No orders yet.</td></tr>';
    }
  } catch (err) {
    stats.innerHTML = `<p class="text-danger">Could not load overview: ${err.message}</p>`;
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  const query = document.getElementById('product-search').value.trim().toLowerCase();
  const filtered = query
    ? allProducts.filter((p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query))
    : allProducts;

  document.getElementById('product-count').textContent = `${filtered.length} of ${allProducts.length}`;

  tbody.innerHTML = filtered.map((p) => `
    <tr data-id="${p.id}" class="${p.stock > 0 && p.stock <= 5 ? 'admin-row-warn' : ''}">
      <td>
        <div class="admin-thumb" data-thumb>
          ${p.images && p.images[0] ? `<img src="${p.images[0]}" alt="">` : productIllustration(p.category)}
        </div>
      </td>
      <td>${p.name}${p.compare_at_price ? `<span class="admin-low-stock-tag" style="background:var(--tea-pink); color:var(--plum);">Sale</span>` : ''}</td>
      <td><span class="category-tint tint-${p.category}">${categoryLabel(p.category)}</span></td>
      <td>${formatPrice(p.price)}${p.compare_at_price ? `<br><span style="text-decoration:line-through; color:var(--muted); font-size:0.8rem;">${formatPrice(p.compare_at_price)}</span>` : ''}</td>
      <td>${p.stock}${p.stock > 0 && p.stock <= 5 ? '<span class="admin-low-stock-tag">Low</span>' : p.stock <= 0 ? '<span class="admin-low-stock-tag">Out</span>' : ''}</td>
      <td class="text-end">
        <button class="btn btn-outline-plum btn-sm edit-btn">Edit</button>
        <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('.edit-btn').addEventListener('click', () => {
      const product = allProducts.find((p) => String(p.id) === id);
      if (product) openEditProductModal(product);
    });
    row.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this product?')) return;
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Could not delete product.');
        return;
      }
      loadProducts();
    });
  });
}

let editingProductImages = [];

function renderEditImageGrid() {
  const grid = document.getElementById('ep-image-grid');
  grid.innerHTML = editingProductImages.map((url, i) => `
    <div class="admin-edit-image-thumb" data-index="${i}">
      <img src="${url}" alt="">
      <button type="button" class="admin-edit-image-remove" aria-label="Remove image">&times;</button>
    </div>
  `).join('') || '<p style="color:#a89490; font-size:0.85rem;">No images yet.</p>';

  grid.querySelectorAll('.admin-edit-image-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.closest('.admin-edit-image-thumb').dataset.index);
      editingProductImages.splice(i, 1);
      renderEditImageGrid();
    });
  });
}

let editingProductVariants = [];

function renderVariantList() {
  const list = document.getElementById('ep-variant-list');
  list.innerHTML = editingProductVariants.length ? editingProductVariants.map((v) => `
    <div class="admin-variant-row" data-id="${v.id}">
      <span class="admin-variant-swatch" style="background:${v.color_hex || 'var(--sand)'};"></span>
      <span class="admin-variant-name">${v.color_name || v.variant_name}</span>
      <span class="admin-variant-meta">${Number(v.price_modifier) !== 0 ? `${Number(v.price_modifier) > 0 ? '+' : ''}${formatPrice(v.price_modifier)} · ` : ''}${v.stock} in stock</span>
      <button type="button" class="admin-variant-remove" aria-label="Remove colour">&times;</button>
    </div>
  `).join('') : '<p style="color:#a89490; font-size:0.85rem;">No colour variants yet.</p>';

  list.querySelectorAll('.admin-variant-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.admin-variant-row');
      const variantId = row.dataset.id;
      const productId = document.getElementById('ep-id').value;
      const res = await fetch(`/api/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        editingProductVariants = editingProductVariants.filter((v) => String(v.id) !== variantId);
        renderVariantList();
      }
    });
  });
}

function sampleImageColor(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 40;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2];
          count++;
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        resolve(`#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

document.getElementById('ev-auto-detect-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('edit-variant-error');
  errorEl.classList.add('d-none');
  const productId = document.getElementById('ep-id').value;
  if (!editingProductImages.length) {
    errorEl.textContent = 'Upload product images first, then auto-create colours from them.';
    errorEl.classList.remove('d-none');
    return;
  }
  const btn = document.getElementById('ev-auto-detect-btn');
  btn.disabled = true;
  btn.textContent = 'Detecting colours…';
  try {
    for (let i = 0; i < editingProductImages.length; i++) {
      const url = editingProductImages[i];
      const hex = await sampleImageColor(url).catch(() => '#78867D');
      const formData = new FormData();
      formData.append('variant_name', `Colour ${i + 1}`);
      formData.append('color_name', `Colour ${i + 1}`);
      formData.append('color_hex', hex);
      formData.append('price_modifier', 0);
      formData.append('stock', document.getElementById('ep-stock').value || 0);
      formData.append('image_url', url);
      const res = await fetch(`/api/products/${productId}/variants`, { method: 'POST', body: formData });
      const body = await res.json();
      if (res.ok) editingProductVariants.push(body);
    }
    renderVariantList();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not auto-create colours.';
    errorEl.classList.remove('d-none');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Auto-create colours from images';
  }
});

document.getElementById('ev-add-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('edit-variant-error');
  errorEl.classList.add('d-none');
  const productId = document.getElementById('ep-id').value;
  const colorName = document.getElementById('ev-color-name').value.trim();
  if (!colorName) {
    errorEl.textContent = 'Colour name is required.';
    errorEl.classList.remove('d-none');
    return;
  }
  try {
    const formData = new FormData();
    formData.append('variant_name', colorName);
    formData.append('color_name', colorName);
    formData.append('color_hex', document.getElementById('ev-color-hex').value);
    formData.append('price_modifier', document.getElementById('ev-price-modifier').value || 0);
    formData.append('stock', document.getElementById('ev-stock').value || 0);
    const imageFile = document.getElementById('ev-image').files[0];
    if (imageFile) formData.append('image', imageFile);

    const res = await fetch(`/api/products/${productId}/variants`, { method: 'POST', body: formData });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    editingProductVariants.push(body);
    renderVariantList();
    document.getElementById('ev-color-name').value = '';
    document.getElementById('ev-price-modifier').value = '0';
    document.getElementById('ev-stock').value = '0';
    document.getElementById('ev-image').value = '';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

async function openEditProductModal(product) {
  document.getElementById('ep-id').value = product.id;
  document.getElementById('ep-name').value = product.name;
  document.getElementById('ep-category').value = product.category;
  document.getElementById('ep-description').value = product.description || '';
  document.getElementById('ep-ingredients').value = product.ingredients || '';
  document.getElementById('ep-price').value = product.price;
  document.getElementById('ep-compare-price').value = product.compare_at_price || '';
  document.getElementById('ep-stock').value = product.stock;
  document.getElementById('ep-bestseller').checked = !!product.is_bestseller;
  document.getElementById('ep-new-images').value = '';
  document.getElementById('edit-product-error').classList.add('d-none');
  document.getElementById('edit-variant-error').classList.add('d-none');
  editingProductImages = [...(product.images || [])];
  renderEditImageGrid();
  editingProductVariants = [];
  renderVariantList();

  bootstrap.Modal.getOrCreateInstance(document.getElementById('editProductModal')).show();

  try {
    const full = await apiGet(`/products/${encodeURIComponent(product.slug)}`);
    editingProductVariants = full.variants || [];
    renderVariantList();
  } catch {
    // Variant list stays empty if this fetch fails; the rest of the form still works.
  }
}

document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('edit-product-error');
  errorEl.classList.add('d-none');
  const id = document.getElementById('ep-id').value;
  try {
    const formData = new FormData();
    formData.append('name', document.getElementById('ep-name').value);
    formData.append('category', document.getElementById('ep-category').value);
    formData.append('description', document.getElementById('ep-description').value);
    formData.append('ingredients', document.getElementById('ep-ingredients').value);
    formData.append('price', document.getElementById('ep-price').value);
    formData.append('compare_at_price', document.getElementById('ep-compare-price').value);
    formData.append('stock', document.getElementById('ep-stock').value);
    formData.append('is_bestseller', document.getElementById('ep-bestseller').checked);
    formData.append('existingImages', JSON.stringify(editingProductImages));
    [...document.getElementById('ep-new-images').files].forEach((file) => formData.append('images', file));

    const res = await fetch(`/api/products/${id}`, { method: 'PUT', body: formData });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
    loadProducts();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

async function loadProducts() {
  const tbody = document.getElementById('products-table-body');
  try {
    allProducts = await apiGet('/products');
    renderProductsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Could not load products: ${err.message}</td></tr>`;
  }
}

document.getElementById('product-search').addEventListener('input', renderProductsTable);

document.getElementById('export-products-btn').addEventListener('click', () => {
  const rows = [['Name', 'Category', 'Price', 'Stock', 'Bestseller']];
  allProducts.forEach((p) => rows.push([p.name, p.category, p.price, p.stock, p.is_bestseller ? 'Yes' : 'No']));
  downloadCsv('shopxtra-products.csv', rows);
});

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('add-product-error');
  errorEl.classList.add('d-none');
  try {
    const formData = new FormData();
    formData.append('name', document.getElementById('np-name').value);
    formData.append('category', document.getElementById('np-category').value);
    formData.append('price', document.getElementById('np-price').value);
    formData.append('stock', document.getElementById('np-stock').value || '0');
    formData.append('description', document.getElementById('np-description').value);
    [...document.getElementById('np-image').files].forEach((file) => formData.append('images', file));

    const res = await fetch('/api/products', { method: 'POST', body: formData });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    document.getElementById('add-product-form').reset();
    loadProducts();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  const query = document.getElementById('order-search').value.trim().toLowerCase();
  let filtered = orderStatusFilter ? allOrders.filter((o) => o.status === orderStatusFilter) : allOrders;
  if (query) filtered = filtered.filter((o) => (o.shipping_name || '').toLowerCase().includes(query));

  tbody.innerHTML = filtered.length ? filtered.map((o) => `
    <tr data-id="${o.id}">
      <td class="mono">#${o.id}</td>
      <td>${o.shipping_name}</td>
      <td class="price">${formatPrice(o.total)}</td>
      <td>
        <select class="form-select form-select-sm status-select" style="width: 140px;">
          ${['pending', 'processing', 'shipped', 'delivered', 'cancelled']
            .map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`)
            .join('')}
        </select>
      </td>
      <td class="mono" style="font-size:0.8rem;">${new Date(o.created_at).toLocaleDateString('en-PK')}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="color:#6b5a58;">No orders match.</td></tr>';

  tbody.querySelectorAll('tr[data-id]').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('.status-select').addEventListener('change', async (e) => {
      await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: e.target.value }),
      });
      const order = allOrders.find((o) => String(o.id) === id);
      if (order) order.status = e.target.value;
    });
  });
}

async function loadOrders() {
  const tbody = document.getElementById('orders-table-body');
  try {
    allOrders = await apiGet('/orders');
    renderOrdersTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Could not load orders: ${err.message}</td></tr>`;
  }
}

document.getElementById('order-search').addEventListener('input', renderOrdersTable);

document.getElementById('order-status-filters').addEventListener('click', (e) => {
  const pill = e.target.closest('.admin-pill');
  if (!pill) return;
  document.querySelectorAll('#order-status-filters .admin-pill').forEach((p) => p.classList.remove('active'));
  pill.classList.add('active');
  orderStatusFilter = pill.dataset.status;
  renderOrdersTable();
});

document.getElementById('export-orders-btn').addEventListener('click', () => {
  const rows = [['Order #', 'Customer', 'Total', 'Status', 'Date']];
  allOrders.forEach((o) => rows.push([o.id, o.shipping_name, o.total, o.status, new Date(o.created_at).toLocaleDateString('en-PK')]));
  downloadCsv('shopxtra-orders.csv', rows);
});

async function showUserDetail(id) {
  const modalEl = document.getElementById('userDetailModal');
  const body = document.getElementById('user-detail-body');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  body.innerHTML = 'Loading…';
  modal.show();

  try {
    const { user, orders, addresses } = await apiGet(`/users/${id}/detail`);
    document.getElementById('userDetailModalLabel').textContent = user.name;

    const ordersHtml = orders.length
      ? orders.map((o) => `
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <span class="mono">#${o.id}</span>
              <span class="category-tint tint-cosmetics ms-2" style="font-size:0.6rem;">${o.status}</span>
              <div style="color:#6b5a58; font-size:0.8rem;">${new Date(o.created_at).toLocaleDateString('en-PK')}</div>
            </div>
            <span class="price">${formatPrice(o.total)}</span>
          </div>
        `).join('')
      : '<p style="color:#6b5a58;">No orders yet.</p>';

    const addressesHtml = addresses.length
      ? addresses.map((a) => `
          <div class="py-1">${a.line1}, ${a.city}${a.postal_code ? ' ' + a.postal_code : ''} ${a.is_default ? '<span class="category-tint tint-cosmetics ms-1" style="font-size:0.6rem;">Default</span>' : ''}</div>
        `).join('')
      : '<p style="color:#6b5a58;">No saved addresses.</p>';

    body.innerHTML = `
      <div class="mb-4">
        <p class="mb-1"><strong>Email:</strong> ${user.email}</p>
        <p class="mb-1"><strong>Phone:</strong> ${user.phone || '—'}</p>
        <p class="mb-1"><strong>Role:</strong> ${user.role}</p>
        <p class="mb-0"><strong>Signed up:</strong> ${new Date(user.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <h3 class="h6">Addresses</h3>
      <div class="mb-4">${addressesHtml}</div>
      <h3 class="h6">Orders (${orders.length})</h3>
      <div>${ordersHtml}</div>
    `;
  } catch (err) {
    body.innerHTML = `<p class="text-danger">Could not load user detail: ${err.message}</p>`;
  }
}

async function loadPromoCodes() {
  const tbody = document.getElementById('promo-table-body');
  try {
    const codes = await apiGet('/promo');
    tbody.innerHTML = codes.length
      ? codes.map((c) => `
          <tr>
            <td class="mono">${c.code}</td>
            <td>${c.discount_type === 'percent' ? 'Percent' : 'Flat'}</td>
            <td>${c.discount_type === 'percent' ? `${Number(c.discount_value)}%` : formatPrice(c.discount_value)}</td>
            <td>${c.active ? 'Active' : 'Inactive'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" style="color:#6b5a58;">No promo codes yet.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Could not load promo codes: ${err.message}</td></tr>`;
  }
}

document.getElementById('broadcast-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById('broadcast-status');
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const res = await fetch('/api/newsletter/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: document.getElementById('broadcast-subject').value,
        message: document.getElementById('broadcast-message').value,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    statusEl.textContent = body.message;
    statusEl.style.color = 'var(--tea-pink)';
    statusEl.classList.remove('d-none');
    document.getElementById('broadcast-form').reset();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.style.color = '#b3413a';
    statusEl.classList.remove('d-none');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('add-promo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('add-promo-error');
  errorEl.classList.add('d-none');
  try {
    const res = await fetch('/api/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: document.getElementById('promo-code-input').value,
        discountType: document.getElementById('promo-type-input').value,
        discountValue: Number(document.getElementById('promo-value-input').value),
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    document.getElementById('add-promo-form').reset();
    loadPromoCodes();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

async function loadBanners() {
  const list = document.getElementById('banner-list');
  try {
    const banners = await apiGet('/banner');
    list.innerHTML = banners.length ? banners.map((b) => `
      <div class="admin-top-product-row" data-id="${b.id}" style="align-items:center;">
        <div class="d-flex align-items-center gap-3">
          ${b.image_url ? `<img src="${b.image_url}" alt="" style="width:48px; height:48px; object-fit:cover; border-radius:8px;">` : ''}
          <div>
            <div style="font-weight:600; color:var(--plum);">${b.title} ${b.active ? '<span class="admin-low-stock-tag" style="background:var(--tea-pink); color:var(--plum);">Active</span>' : ''}</div>
            <div style="font-size:0.8rem; color:var(--muted);">${b.message || ''}</div>
          </div>
        </div>
        <div class="d-flex gap-2">
          ${b.active
            ? `<button type="button" class="btn btn-outline-plum btn-sm deactivate-banner-btn">Deactivate</button>`
            : `<button type="button" class="btn btn-outline-plum btn-sm activate-banner-btn">Activate</button>`}
          <button type="button" class="btn btn-sm btn-outline-danger delete-banner-btn">Delete</button>
        </div>
      </div>
    `).join('') : '<p style="color:#6b5a58;">No banners yet.</p>';

    list.querySelectorAll('[data-id]').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('.activate-banner-btn')?.addEventListener('click', async () => {
        await fetch(`/api/banner/${id}/activate`, { method: 'PATCH' });
        loadBanners();
      });
      row.querySelector('.deactivate-banner-btn')?.addEventListener('click', async () => {
        await fetch(`/api/banner/${id}/deactivate`, { method: 'PATCH' });
        loadBanners();
      });
      row.querySelector('.delete-banner-btn').addEventListener('click', async () => {
        if (!confirm('Delete this banner?')) return;
        await fetch(`/api/banner/${id}`, { method: 'DELETE' });
        loadBanners();
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="text-danger">Could not load banners: ${err.message}</p>`;
  }
}

document.getElementById('add-banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('add-banner-error');
  errorEl.classList.add('d-none');
  try {
    const formData = new FormData();
    formData.append('title', document.getElementById('bn-title').value);
    formData.append('message', document.getElementById('bn-message').value);
    formData.append('linkUrl', document.getElementById('bn-link').value);
    formData.append('active', document.getElementById('bn-active').checked);
    const imageFile = document.getElementById('bn-image').files[0];
    if (imageFile) formData.append('image', imageFile);

    const res = await fetch('/api/banner', { method: 'POST', body: formData });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    document.getElementById('add-banner-form').reset();
    document.getElementById('bn-active').checked = true;
    loadBanners();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  const query = document.getElementById('user-search').value.trim().toLowerCase();
  const filtered = query
    ? allUsers.filter((u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
    : allUsers;

  document.getElementById('user-count').textContent = `${filtered.length} of ${allUsers.length}`;

  tbody.innerHTML = filtered.map((u) => `
    <tr data-id="${u.id}">
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone || ''}</td>
      <td>
        <select class="form-select form-select-sm role-select" style="width: 120px;">
          <option value="customer" ${u.role === 'customer' ? 'selected' : ''}>Customer</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td class="mono" style="font-size:0.8rem;">${new Date(u.created_at).toLocaleDateString('en-PK')}</td>
      <td><button type="button" class="btn btn-outline-plum btn-sm view-user-btn">View</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr').forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('.role-select').addEventListener('change', async (e) => {
      await fetch(`/api/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: e.target.value }),
      });
    });
    row.querySelector('.view-user-btn').addEventListener('click', () => showUserDetail(id));
  });
}

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  try {
    allUsers = await apiGet('/users');
    renderUsersTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Could not load users: ${err.message}</td></tr>`;
  }
}

document.getElementById('user-search').addEventListener('input', renderUsersTable);

(async () => {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('not logged in');
    const { user } = await res.json();
    if (user.role !== 'admin') throw new Error('not admin');

    document.getElementById('admin-loading').classList.add('d-none');
    document.getElementById('admin-app').classList.remove('d-none');
    document.getElementById('admin-whoami').textContent = user.email;

    await Promise.all([loadProducts(), loadUsers(), loadOrders()]);
    await loadOverview();
    loadPromoCodes();
    loadBanners();
  } catch {
    document.getElementById('admin-loading').classList.add('d-none');
    document.getElementById('admin-denied').classList.remove('d-none');
  }
})();
