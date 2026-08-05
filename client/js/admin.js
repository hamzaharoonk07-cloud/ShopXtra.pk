let allProducts = [];
let allOrders = [];
let allUsers = [];
let orderStatusFilter = '';

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413 || /request entity too large/i.test(text)) {
      throw new Error('Upload too large. Try fewer images, or smaller ones (under ~1MB each), and try again.');
    }
    throw new Error(`Server error (${res.status}). Try again with fewer/smaller images.`);
  }
}

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

const IMAGE_PREVIEW_MAX = 6;
const imagePreviewFiles = {};

function syncInputFiles(input, files) {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  input.files = dt.files;
}

function renderImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const files = imagePreviewFiles[inputId] || [];
  preview.innerHTML = '';

  files.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const thumb = document.createElement('div');
    thumb.className = 'admin-image-preview-thumb';
    thumb.innerHTML = `
      <img src="${url}" alt="Preview">
      <button type="button" class="admin-image-preview-remove" aria-label="Remove this image">&times;</button>
    `;
    thumb.querySelector('.admin-image-preview-remove').addEventListener('click', () => {
      imagePreviewFiles[inputId].splice(i, 1);
      syncInputFiles(input, imagePreviewFiles[inputId]);
      renderImagePreview(inputId, previewId);
    });
    preview.appendChild(thumb);
  });

  if (files.length >= IMAGE_PREVIEW_MAX) {
    const note = document.createElement('p');
    note.className = 'admin-image-preview-limit';
    note.textContent = `Maximum ${IMAGE_PREVIEW_MAX} images reached.`;
    preview.appendChild(note);
  }
}

// Native <input type="file" multiple> replaces the whole selection every time
// the picker reopens, so re-selecting to add more images silently drops the
// ones already chosen. This accumulates across picker sessions (up to the
// server's 6-image limit) instead, syncing the merged set back into the
// input itself so the existing submit-time `[...input.files]` code needs no
// changes.
function initImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  imagePreviewFiles[inputId] = [];

  input.addEventListener('change', () => {
    const picked = [...input.files];
    if (!picked.length) return;

    const existing = imagePreviewFiles[inputId];
    picked.forEach((file) => {
      const isDupe = existing.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
      if (!isDupe && existing.length < IMAGE_PREVIEW_MAX) existing.push(file);
    });

    syncInputFiles(input, existing);
    renderImagePreview(inputId, previewId);
  });
}

function clearImagePreview(previewId, inputId) {
  const preview = document.getElementById(previewId);
  if (preview) preview.innerHTML = '';
  if (inputId) imagePreviewFiles[inputId] = [];
}

function initVideoPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    preview.innerHTML = '';
    const file = input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<video src="${url}" controls muted style="max-width:220px; border-radius:8px; display:block; margin-top:0.5rem;"></video>`;
  });
}

function clearVideoPreview(previewId, inputId) {
  const preview = document.getElementById(previewId);
  if (preview) preview.innerHTML = '';
  const input = document.getElementById(inputId);
  if (input) input.value = '';
}

initImagePreview('np-image', 'np-image-preview');
initImagePreview('ep-new-images', 'ep-new-images-preview');
initVideoPreview('np-video', 'np-video-preview');
initVideoPreview('ep-new-video', 'ep-new-video-preview');

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
        <span class="admin-stat-value">${allUsers.length}</span>
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

    const mostViewed = document.getElementById('overview-most-viewed');
    if (mostViewed) {
      mostViewed.innerHTML = (data.mostViewed || []).length
        ? data.mostViewed.map((p) => `
            <div class="admin-top-product-row">
              <a href="/pages/product.html?slug=${p.slug}" target="_blank" rel="noopener">${p.name}</a>
              <span class="mono">${p.view_count} view${p.view_count === 1 ? '' : 's'}</span>
            </div>
          `).join('')
        : '<p style="color:#6b5a58;">No product views recorded yet.</p>';
    }

    const mostWishlisted = document.getElementById('overview-most-wishlisted');
    if (mostWishlisted) {
      mostWishlisted.innerHTML = (data.mostWishlisted || []).length
        ? data.mostWishlisted.map((p) => `
            <div class="admin-top-product-row">
              <a href="/pages/product.html?slug=${p.slug}" target="_blank" rel="noopener">${p.name}</a>
              <span class="mono">${p.wishlist_count} save${p.wishlist_count === 1 ? '' : 's'}</span>
            </div>
          `).join('')
        : '<p style="color:#6b5a58;">No wishlist saves recorded yet.</p>';
    }

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
          ${p.images && p.images[0] ? `<img src="${thumbSrc(p.images[0])}" ${thumbFallbackAttr(p.images[0])} alt="" loading="lazy" decoding="async">` : productIllustration(p.category)}
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
let editingProductVideoUrl = null;
let editingProductVideoRemoved = false;

function renderCurrentVideo() {
  const wrap = document.getElementById('ep-video-current');
  if (!editingProductVideoUrl || editingProductVideoRemoved) {
    wrap.innerHTML = '<p style="color:#a89490; font-size:0.85rem; margin:0;">No video yet.</p>';
    return;
  }
  wrap.innerHTML = `
    <div class="admin-video-preview">
      <video src="${editingProductVideoUrl}" controls muted style="max-width:220px; border-radius:8px; display:block;"></video>
      <button type="button" class="btn btn-outline-plum btn-sm mt-2" id="ep-remove-video-btn">Remove video</button>
    </div>
  `;
  document.getElementById('ep-remove-video-btn').addEventListener('click', () => {
    editingProductVideoRemoved = true;
    renderCurrentVideo();
  });
}

function renderEditImageGrid() {
  const grid = document.getElementById('ep-image-grid');
  const last = editingProductImages.length - 1;
  grid.innerHTML = editingProductImages.map((url, i) => `
    <div class="admin-edit-image-thumb" data-index="${i}">
      <div class="admin-edit-image-photo">
        ${i === 0 ? '<span class="admin-edit-image-primary">Cover</span>' : ''}
        <img src="${url}" alt="">
        <button type="button" class="admin-edit-image-remove" aria-label="Remove image">&times;</button>
      </div>
      <div class="admin-edit-image-move-row">
        <button type="button" class="admin-edit-image-move" data-dir="-1" aria-label="Move image earlier" ${i === 0 ? 'disabled' : ''}>&larr;</button>
        <button type="button" class="admin-edit-image-move" data-dir="1" aria-label="Move image later" ${i === last ? 'disabled' : ''}>&rarr;</button>
      </div>
    </div>
  `).join('') || '<p style="color:#a89490; font-size:0.85rem;">No images yet.</p>';

  grid.querySelectorAll('.admin-edit-image-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.closest('.admin-edit-image-thumb').dataset.index);
      editingProductImages.splice(i, 1);
      renderEditImageGrid();
    });
  });

  grid.querySelectorAll('.admin-edit-image-move').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.closest('.admin-edit-image-thumb').dataset.index);
      const dir = Number(btn.dataset.dir);
      const target = i + dir;
      if (target < 0 || target >= editingProductImages.length) return;
      [editingProductImages[i], editingProductImages[target]] = [editingProductImages[target], editingProductImages[i]];
      renderEditImageGrid();
    });
  });
}

let editingProductVariants = [];

let editingVariantId = null;

function resetVariantForm() {
  editingVariantId = null;
  document.getElementById('ev-color-name').value = '';
  document.getElementById('ev-price-modifier').value = '0';
  document.getElementById('ev-stock').value = '0';
  document.getElementById('ev-image').value = '';
  document.getElementById('ev-color-hex').value = '#3C7A5D';
  document.getElementById('ev-add-btn').textContent = '+ Add variant';
}

function renderVariantList() {
  const list = document.getElementById('ep-variant-list');
  list.innerHTML = editingProductVariants.length ? editingProductVariants.map((v) => `
    <div class="admin-variant-row" data-id="${v.id}">
      <span class="admin-variant-swatch" style="background:${v.color_hex || 'var(--sand)'};"></span>
      <span class="admin-variant-name" style="cursor:pointer; text-decoration:underline dotted;" title="Click to edit">${v.color_name || v.variant_name}</span>
      <span class="admin-variant-meta">${Number(v.price_modifier) !== 0 ? `${Number(v.price_modifier) > 0 ? '+' : ''}${formatPrice(v.price_modifier)} · ` : ''}${v.stock} in stock</span>
      <button type="button" class="admin-variant-remove" aria-label="Remove variant">&times;</button>
    </div>
  `).join('') : '<p style="color:#a89490; font-size:0.85rem;">No variants yet.</p>';

  list.querySelectorAll('.admin-variant-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.admin-variant-row');
      const variantId = row.dataset.id;
      const productId = document.getElementById('ep-id').value;
      const res = await fetch(`/api/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        editingProductVariants = editingProductVariants.filter((v) => String(v.id) !== variantId);
        if (String(editingVariantId) === variantId) resetVariantForm();
        renderVariantList();
      }
    });
  });

  list.querySelectorAll('.admin-variant-name').forEach((nameEl) => {
    nameEl.addEventListener('click', () => {
      const row = nameEl.closest('.admin-variant-row');
      const variant = editingProductVariants.find((v) => String(v.id) === row.dataset.id);
      if (!variant) return;
      editingVariantId = variant.id;
      document.getElementById('ev-color-name').value = variant.color_name || variant.variant_name || '';
      document.getElementById('ev-price-modifier').value = variant.price_modifier || '0';
      document.getElementById('ev-stock').value = variant.stock || '0';
      if (variant.color_hex) document.getElementById('ev-color-hex').value = variant.color_hex;
      document.getElementById('ev-add-btn').textContent = 'Update variant';
      document.getElementById('ev-color-name').scrollIntoView({ block: 'center', behavior: 'smooth' });
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

function isFlavorVariantType() {
  return document.getElementById('ev-type-flavor').checked;
}

document.querySelectorAll('#ev-type-toggle input[name="ev-type"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const flavor = isFlavorVariantType();
    document.getElementById('ev-swatch-field').style.display = flavor ? 'none' : '';
    document.getElementById('ev-name-label').textContent = flavor ? 'Flavour name' : 'Colour name';
    document.getElementById('ev-image-label').textContent = flavor ? 'Photo' : 'Photo (optional)';
  });
});

document.getElementById('ev-add-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('edit-variant-error');
  errorEl.classList.add('d-none');
  const productId = document.getElementById('ep-id').value;
  const flavor = isFlavorVariantType();
  const name = document.getElementById('ev-color-name').value.trim();
  if (!name) {
    errorEl.textContent = flavor ? 'Flavour name is required.' : 'Colour name is required.';
    errorEl.classList.remove('d-none');
    return;
  }
  const imageFile = document.getElementById('ev-image').files[0];
  if (flavor && !imageFile && !editingVariantId) {
    errorEl.textContent = 'A photo is required so this flavour has an image to switch to.';
    errorEl.classList.remove('d-none');
    return;
  }
  try {
    const formData = new FormData();
    formData.append('variant_name', name);
    if (!flavor) {
      formData.append('color_name', name);
      formData.append('color_hex', document.getElementById('ev-color-hex').value);
    }
    formData.append('price_modifier', document.getElementById('ev-price-modifier').value || 0);
    formData.append('stock', document.getElementById('ev-stock').value || 0);
    if (imageFile) formData.append('image', imageFile);

    const isEditing = editingVariantId != null;
    const url = isEditing ? `/api/products/${productId}/variants/${editingVariantId}` : `/api/products/${productId}/variants`;
    const res = await fetch(url, { method: isEditing ? 'PUT' : 'POST', body: formData });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    if (isEditing) {
      editingProductVariants = editingProductVariants.map((v) => (v.id === body.id ? body : v));
    } else {
      editingProductVariants.push(body);
    }
    resetVariantForm();
    renderVariantList();
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
  document.getElementById('ep-price').value = product.price;
  document.getElementById('ep-compare-price').value = product.compare_at_price || '';
  document.getElementById('ep-stock').value = product.stock;
  document.getElementById('ep-bestseller').checked = !!product.is_bestseller;
  document.getElementById('ep-new-images').value = '';
  clearImagePreview('ep-new-images-preview', 'ep-new-images');
  document.getElementById('edit-product-error').classList.add('d-none');
  document.getElementById('edit-variant-error').classList.add('d-none');
  resetVariantForm();
  editingProductImages = [...(product.images || [])];
  renderEditImageGrid();
  editingProductVideoUrl = product.video_url || null;
  editingProductVideoRemoved = false;
  renderCurrentVideo();
  clearVideoPreview('ep-new-video-preview', 'ep-new-video');
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
    formData.append('price', document.getElementById('ep-price').value);
    formData.append('compare_at_price', document.getElementById('ep-compare-price').value);
    formData.append('stock', document.getElementById('ep-stock').value);
    formData.append('is_bestseller', document.getElementById('ep-bestseller').checked);
    formData.append('existingImages', JSON.stringify(editingProductImages));
    [...document.getElementById('ep-new-images').files].forEach((file) => formData.append('images', file));
    const videoFile = document.getElementById('ep-new-video').files[0];
    if (videoFile) formData.append('video', videoFile);
    else if (editingProductVideoRemoved) formData.append('removeVideo', 'true');

    const res = await fetch(`/api/products/${id}`, { method: 'PUT', body: formData });
    const body = await safeJson(res);
    if (!res.ok) throw new Error(body.error);
    bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
    clearImagePreview('ep-new-images-preview', 'ep-new-images');
    clearVideoPreview('ep-new-video-preview', 'ep-new-video');
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

document.getElementById('compress-images-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (!confirm('Compress all existing product images now? This re-uploads and replaces images for every product that isn\'t already compressed. It can take a while for many products.')) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Compressing…';
  try {
    const res = await fetch('/api/products/reprocess-images', { method: 'POST' });
    const report = await res.json();
    if (!res.ok) throw new Error(report.error || 'Request failed');
    const beforeKB = Math.round(report.totalBefore / 1024);
    const afterKB = Math.round(report.totalAfter / 1024);
    const pct = report.totalBefore ? Math.round((1 - report.totalAfter / report.totalBefore) * 100) : 0;
    alert(`Compressed ${report.processed} image(s).\n${beforeKB}KB -> ${afterKB}KB (${pct}% smaller).`);
  } catch (err) {
    alert(err.message || 'Could not compress images.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

document.getElementById('seed-testimonials-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (!confirm('Add 10 testimonials to every product? Skips products/reviewers that already have one, so it\'s safe to run again.')) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Adding…';
  try {
    const res = await fetch('/api/products/reviews/seed-testimonials', { method: 'POST' });
    const report = await res.json();
    if (!res.ok) throw new Error(report.error || 'Request failed');
    alert(`Added ${report.inserted} testimonial(s) across ${report.products} product(s).`);
  } catch (err) {
    alert(err.message || 'Could not add testimonials.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
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
    const videoFile = document.getElementById('np-video').files[0];
    if (videoFile) formData.append('video', videoFile);

    const res = await fetch('/api/products', { method: 'POST', body: formData });
    const body = await safeJson(res);
    if (!res.ok) throw new Error(body.error);
    document.getElementById('add-product-form').reset();
    clearImagePreview('np-image-preview', 'np-image');
    clearVideoPreview('np-video-preview', 'np-video');
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
    <tr data-id="${o.id}" style="cursor:pointer;">
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
    row.addEventListener('click', (e) => {
      if (e.target.closest('.status-select')) return;
      showOrderDetail(id);
    });
    row.querySelector('.status-select').addEventListener('change', async (e) => {
      const select = e.target;
      const newStatus = select.value;
      const order = allOrders.find((o) => String(o.id) === id);
      let cancelReason;
      if (newStatus === 'cancelled') {
        cancelReason = prompt('Reason for cancelling this order? (sent to the customer in the cancellation email)');
        if (!cancelReason) {
          select.value = order ? order.status : select.value;
          return;
        }
      }
      await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, cancelReason }),
      });
      if (order) order.status = newStatus;
    });
  });
}

async function showOrderDetail(id) {
  const modalEl = document.getElementById('orderDetailModal');
  const body = document.getElementById('order-detail-body');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  body.innerHTML = 'Loading…';
  modal.show();

  try {
    const order = await apiGet(`/orders/${id}`);
    document.getElementById('orderDetailModalLabel').textContent = `Order #${order.id}`;

    const itemsHtml = (order.items || []).length
      ? order.items.map((item) => `
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <span>${item.name}</span>
              <span style="color:#6b5a58; font-size:0.8rem;"> &times; ${item.qty}</span>
            </div>
            <span class="price">${formatPrice(item.price_at_purchase * item.qty)}</span>
          </div>
        `).join('')
      : '<p style="color:#6b5a58;">No items found.</p>';

    body.innerHTML = `
      <div class="mb-3">
        <span class="category-tint tint-cosmetics" style="font-size:0.7rem;">${order.status}</span>
        <span style="color:#6b5a58; font-size:0.8rem; margin-left:0.5rem;">${new Date(order.created_at).toLocaleString('en-PK')}</span>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <div style="font-size:0.75rem; color:#6b5a58; text-transform:uppercase; letter-spacing:0.03em;">Customer</div>
          <div>${order.shipping_name}</div>
        </div>
        <div class="col-sm-6">
          <div style="font-size:0.75rem; color:#6b5a58; text-transform:uppercase; letter-spacing:0.03em;">Phone</div>
          <div><a href="tel:${order.shipping_phone}">${order.shipping_phone}</a></div>
        </div>
        <div class="col-12">
          <div style="font-size:0.75rem; color:#6b5a58; text-transform:uppercase; letter-spacing:0.03em;">Delivery address</div>
          <div>${order.shipping_address}, ${order.shipping_city}${order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ''}</div>
        </div>
        ${order.email ? `
        <div class="col-12">
          <div style="font-size:0.75rem; color:#6b5a58; text-transform:uppercase; letter-spacing:0.03em;">Email</div>
          <div>${order.email}</div>
        </div>` : ''}
        ${order.notes ? `
        <div class="col-12">
          <div style="font-size:0.75rem; color:#6b5a58; text-transform:uppercase; letter-spacing:0.03em;">Shade / colour notes</div>
          <div>${order.notes}</div>
        </div>` : ''}
      </div>
      <div style="font-size:0.75rem; color:#6b5a58; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:0.4rem;">Items</div>
      ${itemsHtml}
      <div class="d-flex justify-content-between mt-2">
        <span>Shipping</span>
        <span class="price">${Number(order.shipping_fee) > 0 ? formatPrice(order.shipping_fee) : 'Free'}</span>
      </div>
      <div class="d-flex justify-content-between align-items-center pt-3 mt-2" style="border-top: 2px solid #1C231D;">
        <strong>Total</strong>
        <strong class="price">${formatPrice(order.total)}</strong>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<p class="text-danger">Could not load order: ${err.message}</p>`;
  }
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
    const { user, orders, addresses, wishlist, recentViews } = await apiGet(`/users/${id}/detail`);
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

    const wishlistHtml = (wishlist || []).length
      ? wishlist.map((p) => `
          <div class="py-1"><a href="/pages/product.html?slug=${p.slug}" target="_blank" rel="noopener">${p.name}</a></div>
        `).join('')
      : '<p style="color:#6b5a58;">Nothing wishlisted.</p>';

    const recentViewsHtml = (recentViews || []).length
      ? recentViews.map((p) => `
          <div class="d-flex justify-content-between align-items-center py-1">
            <a href="/pages/product.html?slug=${p.slug}" target="_blank" rel="noopener">${p.name}</a>
            <span style="color:#6b5a58; font-size:0.75rem;">${new Date(p.last_viewed).toLocaleDateString('en-PK')}</span>
          </div>
        `).join('')
      : '<p style="color:#6b5a58;">No product views recorded.</p>';

    body.innerHTML = `
      <div class="mb-4">
        <p class="mb-1"><strong>Email:</strong> ${user.email}</p>
        <p class="mb-1"><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
        <p class="mb-1"><strong>Role:</strong> ${user.role}</p>
        <p class="mb-0"><strong>Signed up:</strong> ${new Date(user.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <h3 class="h6">Addresses</h3>
      <div class="mb-4">${addressesHtml}</div>
      <h3 class="h6">Recently viewed</h3>
      <div class="mb-4">${recentViewsHtml}</div>
      <h3 class="h6">Wishlist</h3>
      <div class="mb-4">${wishlistHtml}</div>
      <h3 class="h6">Orders (${orders.length})</h3>
      <div>${ordersHtml}</div>
    `;
  } catch (err) {
    body.innerHTML = `<p class="text-danger">Could not load user detail: ${err.message}</p>`;
  }
}

function promoTypeLabel(type) {
  if (type === 'percent') return 'Percent';
  if (type === 'free_gift') return 'Free gift';
  return 'Flat';
}

function promoValueLabel(c) {
  if (c.discount_type === 'percent') {
    const pct = `${Number(c.discount_value)}%`;
    return c.max_discount_amount != null ? `${pct} (up to ${formatPrice(c.max_discount_amount)})` : pct;
  }
  if (c.discount_type === 'free_gift') return c.gift_product_name || 'Gift product';
  return formatPrice(c.discount_value);
}

async function loadPromoCodes() {
  const tbody = document.getElementById('promo-table-body');
  try {
    const codes = await apiGet('/promo');
    tbody.innerHTML = codes.length
      ? codes.map((c) => `
          <tr data-id="${c.id}">
            <td class="mono">${c.code}</td>
            <td>${promoTypeLabel(c.discount_type)}</td>
            <td>${promoValueLabel(c)}</td>
            <td>${c.active ? 'Active' : 'Inactive'}</td>
            <td><button type="button" class="btn btn-outline-plum btn-sm promo-toggle-btn" data-active="${c.active}">${c.active ? 'Deactivate' : 'Activate'}</button></td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" style="color:#6b5a58;">No promo codes yet.</td></tr>';

    tbody.querySelectorAll('.promo-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const id = row.dataset.id;
        const nextActive = btn.dataset.active !== 'true';
        btn.disabled = true;
        try {
          const res = await fetch(`/api/promo/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: nextActive }),
          });
          if (!res.ok) throw new Error();
          loadPromoCodes();
        } catch {
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Could not load promo codes: ${err.message}</td></tr>`;
  }
}

function populateGiftProductOptions() {
  const select = document.getElementById('promo-gift-product-input');
  if (!select) return;
  select.innerHTML = '<option value="">Select gift product</option>' +
    allProducts.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
}

document.getElementById('promo-type-input').addEventListener('change', (e) => {
  const isGift = e.target.value === 'free_gift';
  const isPercent = e.target.value === 'percent';
  document.getElementById('promo-value-field').classList.toggle('d-none', isGift);
  document.getElementById('promo-value-input').required = !isGift;
  document.getElementById('promo-gift-field').classList.toggle('d-none', !isGift);
  document.getElementById('promo-gift-product-input').required = isGift;
  document.getElementById('promo-max-discount-field').classList.toggle('d-none', !isPercent);
  if (isGift) populateGiftProductOptions();
});

document.getElementById('broadcast-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById('broadcast-status');
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const formData = new FormData();
    formData.append('subject', document.getElementById('broadcast-subject').value);
    formData.append('message', document.getElementById('broadcast-message').value);
    const imageFile = document.getElementById('broadcast-image').files[0];
    if (imageFile) formData.append('image', imageFile);

    const res = await fetch('/api/newsletter/broadcast', { method: 'POST', body: formData });
    const body = await safeJson(res);
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

async function loadSubscribers() {
  const tbody = document.getElementById('subscribers-table-body');
  const countEl = document.getElementById('subscriber-count');
  try {
    const subs = await apiGet('/newsletter/subscribers');
    if (countEl) countEl.textContent = `(${subs.length})`;
    tbody.innerHTML = subs.length
      ? subs.map((s) => `
          <tr>
            <td>${s.email}</td>
            <td>${new Date(s.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2" style="color:#6b5a58;">No subscribers yet.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-danger">Could not load subscribers: ${err.message}</td></tr>`;
  }
}

async function loadCartEvents() {
  const tbody = document.getElementById('cart-events-table-body');
  try {
    const events = await apiGet('/products/cart-events');
    tbody.innerHTML = events.length
      ? events.map((ev) => `
          <tr>
            <td>${ev.product_name}</td>
            <td>${ev.qty}</td>
            <td>${ev.user_email || 'Guest'}</td>
            <td>${new Date(ev.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" style="color:#6b5a58;">No cart activity yet.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Could not load cart activity: ${err.message}</td></tr>`;
  }
}

document.getElementById('add-promo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('add-promo-error');
  errorEl.classList.add('d-none');
  const discountType = document.getElementById('promo-type-input').value;
  try {
    const maxDiscountRaw = document.getElementById('promo-max-discount-input').value;
    const res = await fetch('/api/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: document.getElementById('promo-code-input').value,
        discountType,
        discountValue: discountType === 'free_gift' ? 0 : Number(document.getElementById('promo-value-input').value),
        giftProductId: discountType === 'free_gift' ? Number(document.getElementById('promo-gift-product-input').value) : undefined,
        maxDiscountAmount: discountType === 'percent' && maxDiscountRaw ? Number(maxDiscountRaw) : undefined,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    document.getElementById('add-promo-form').reset();
    document.getElementById('promo-value-field').classList.remove('d-none');
    document.getElementById('promo-gift-field').classList.add('d-none');
    document.getElementById('promo-max-discount-field').classList.add('d-none');
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

let allBundles = [];
let editingBundleId = null;

function renderBundleProductChecklist() {
  const wrap = document.getElementById('bundle-product-checklist');
  wrap.innerHTML = allProducts.map((p) => `
    <div class="form-check">
      <input type="checkbox" class="form-check-input bundle-product-checkbox" id="bp-${p.id}" value="${p.id}">
      <label class="form-check-label" for="bp-${p.id}" style="font-size:0.85rem;">${p.name} <span style="color:#a89490;">(${p.category}, Rs ${p.price})</span></label>
    </div>
  `).join('');
}

function resetBundleForm() {
  editingBundleId = null;
  document.getElementById('bundle-form-title').textContent = 'Create bundle';
  document.getElementById('bundle-submit-btn').textContent = 'Create';
  document.getElementById('bundle-cancel-edit-btn').classList.add('d-none');
  document.getElementById('bundle-id').value = '';
  document.getElementById('bundle-name').value = '';
  document.getElementById('bundle-ritual-time').value = '';
  document.getElementById('bundle-discount').value = '10';
  document.getElementById('bundle-description').value = '';
  document.querySelectorAll('.bundle-product-checkbox').forEach((cb) => { cb.checked = false; });
}

function renderBundlesTable() {
  const tbody = document.getElementById('bundles-table-body');
  tbody.innerHTML = allBundles.length ? allBundles.map((b) => `
    <tr data-id="${b.id}">
      <td>${b.name}</td>
      <td style="text-transform:capitalize;">${b.ritual_time}</td>
      <td>${b.discount_percent}%</td>
      <td>${b.items.length}</td>
      <td>Rs ${b.bundle_price}</td>
      <td class="text-end">
        <button type="button" class="btn btn-outline-plum btn-sm edit-bundle-btn">Edit</button>
        <button type="button" class="btn btn-sm text-danger delete-bundle-btn">Delete</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="color:#a89490;">No bundles yet.</td></tr>';

  tbody.querySelectorAll('.edit-bundle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.closest('tr').dataset.id);
      const bundle = allBundles.find((b) => b.id === id);
      if (!bundle) return;
      editingBundleId = id;
      document.getElementById('bundle-form-title').textContent = `Edit "${bundle.name}"`;
      document.getElementById('bundle-submit-btn').textContent = 'Save changes';
      document.getElementById('bundle-cancel-edit-btn').classList.remove('d-none');
      document.getElementById('bundle-id').value = id;
      document.getElementById('bundle-name').value = bundle.name;
      document.getElementById('bundle-ritual-time').value = bundle.ritual_time;
      document.getElementById('bundle-discount').value = bundle.discount_percent;
      document.getElementById('bundle-description').value = bundle.description || '';
      const itemIds = new Set(bundle.items.map((p) => p.id));
      document.querySelectorAll('.bundle-product-checkbox').forEach((cb) => {
        cb.checked = itemIds.has(Number(cb.value));
      });
      document.getElementById('bundle-name').scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  });

  tbody.querySelectorAll('.delete-bundle-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.closest('tr').dataset.id);
      if (!confirm('Delete this bundle? This cannot be undone.')) return;
      const res = await fetch(`/api/bundles/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        allBundles = allBundles.filter((b) => b.id !== id);
        renderBundlesTable();
      }
    });
  });
}

async function loadBundles() {
  const tbody = document.getElementById('bundles-table-body');
  try {
    allBundles = await apiGet('/bundles');
    renderBundlesTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Could not load bundles: ${err.message}</td></tr>`;
  }
}

document.getElementById('bundle-cancel-edit-btn').addEventListener('click', resetBundleForm);

document.getElementById('add-bundle-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('add-bundle-error');
  errorEl.classList.add('d-none');

  const productIds = Array.from(document.querySelectorAll('.bundle-product-checkbox:checked')).map((cb) => Number(cb.value));
  if (!productIds.length) {
    errorEl.textContent = 'Select at least one product for this bundle.';
    errorEl.classList.remove('d-none');
    return;
  }

  const payload = {
    name: document.getElementById('bundle-name').value.trim(),
    ritualTime: document.getElementById('bundle-ritual-time').value,
    discountPercent: document.getElementById('bundle-discount').value || 10,
    description: document.getElementById('bundle-description').value.trim(),
    productIds,
  };

  try {
    const url = editingBundleId ? `/api/bundles/${editingBundleId}` : '/api/bundles';
    const method = editingBundleId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await safeJson(res);
    if (!res.ok) throw new Error(body.error);

    if (editingBundleId) {
      allBundles = allBundles.map((b) => (b.id === editingBundleId ? body : b));
    } else {
      allBundles.push(body);
    }
    renderBundlesTable();
    resetBundleForm();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('d-none');
  }
});

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
    renderBundleProductChecklist();
    await loadOverview();
    loadPromoCodes();
    loadBanners();
    loadBundles();
    loadSubscribers();
    loadCartEvents();
  } catch {
    document.getElementById('admin-loading').classList.add('d-none');
    document.getElementById('admin-denied').classList.remove('d-none');
  }
})();
