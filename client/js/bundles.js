function bundleCardHtml(bundle) {
  const itemsHtml = bundle.items.map((p) => `
    <li><span class="bundle-item-dot" aria-hidden="true"></span>${p.name}</li>
  `).join('');

  return `
    <div class="col-md-4" id="${bundle.slug}" data-reveal="item">
      <div class="bundle-card h-100">
        <div class="bundle-card-image">
          <span class="bundle-card-badge">Save ${bundle.discount_percent}%</span>
          <span class="bundle-card-emoji" aria-hidden="true">&#10024;</span>
        </div>
        <div class="bundle-card-body">
          <span class="bundle-card-name">${bundle.name}</span>
          <p class="bundle-card-desc">${bundle.description || ''}</p>
          <ul class="bundle-card-items">${itemsHtml}</ul>
          <div class="bundle-card-price-row">
            <span class="bundle-card-price">${formatPrice(bundle.bundle_price)}</span>
            <span class="bundle-card-was">${formatPrice(bundle.original_total)}</span>
          </div>
          <button class="btn btn-plum w-100 add-bundle-btn" data-slug="${bundle.slug}">Add kit to bag</button>
        </div>
      </div>
    </div>
  `;
}

async function loadBundles() {
  const grid = document.getElementById('bundles-grid');
  try {
    const bundles = await apiGet('/bundles');
    grid.innerHTML = bundles.map(bundleCardHtml).join('');
    document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));

    grid.querySelectorAll('.add-bundle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const bundle = bundles.find((b) => b.slug === btn.dataset.slug);
        bundle.items.forEach((p) => addToCart(p, 1));
        const promoCode = `${bundle.ritual_time.toUpperCase()}-RITUAL`;
        window.location.href = `/pages/checkout.html?promo=${encodeURIComponent(promoCode)}`;
      });
    });

    const hash = window.location.hash.slice(1);
    if (hash) {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (err) {
    grid.innerHTML = `<p class="text-center py-5 text-danger">Could not load bundles: ${err.message}</p>`;
  }
}

loadBundles();
