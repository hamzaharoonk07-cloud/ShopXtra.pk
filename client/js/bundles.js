function bundleCardHtml(bundle) {
  const itemsHtml = bundle.items.map((p) => `
    <li><span class="bundle-item-dot" aria-hidden="true"></span><a href="/pages/product.html?slug=${encodeURIComponent(p.slug)}" class="bundle-item-link">${p.name}</a></li>
  `).join('');

  const photos = bundle.items.filter((p) => p.images && p.images[0]).slice(0, 2);
  const photosHtml = bundle.image_url
    ? `<img src="${thumbSrc(bundle.image_url)}" ${thumbFallbackAttr(bundle.image_url)} alt="" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover;">`
    : photos.length
      ? `<div class="bundle-card-photos">${photos.map((p) => `<img src="${thumbSrc(p.images[0])}" ${thumbFallbackAttr(p.images[0])} alt="" loading="lazy" decoding="async">`).join('')}</div>`
      : `<span class="bundle-card-emoji" aria-hidden="true">&#10024;</span>`;

  return `
    <div class="col-md-4" id="${bundle.slug}" data-reveal="item">
      <div class="bundle-card h-100">
        <div class="bundle-card-image">
          <span class="bundle-card-badge">Save ${bundle.discount_percent}%</span>
          ${photosHtml}
        </div>
        <div class="bundle-card-body">
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
        bundle.items.forEach((p) => {
          const discountedPrice = Number((Number(p.price) * (1 - bundle.discount_percent / 100)).toFixed(2));
          addToCart({ ...p, price: discountedPrice }, 1);
        });
        window.location.href = '/pages/checkout.html';
      });
    });

    const hash = window.location.hash.slice(1);
    if (hash) {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="text-center py-5">
        <p class="text-danger mb-3">Could not load bundles: ${err.message}</p>
        <button type="button" class="btn btn-plum" id="bundles-retry-btn">Retry</button>
      </div>
    `;
    document.getElementById('bundles-retry-btn').addEventListener('click', loadBundles);
  }
}

loadBundles();
