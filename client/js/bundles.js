function bundleCardHtml(bundle) {
  const photosHtml = bundle.image_url
    ? `<img src="${thumbSrc(bundle.image_url)}" ${thumbFallbackAttr(bundle.image_url)} alt="" loading="lazy" decoding="async">`
    : `<span class="bundle-card-emoji" aria-hidden="true">&#10024;</span>`;

  return `
    <div class="col-md-4" id="${bundle.slug}" data-reveal="item">
      <div class="bundle-card h-100" data-slug="${bundle.slug}" role="button" tabindex="0">
        <div class="bundle-card-image">
          ${photosHtml}
        </div>
        <div class="bundle-card-body">
          <h3 class="bundle-card-name">${bundle.name}</h3>
          ${bundle.description ? `<p class="bundle-card-desc">${bundle.description}</p>` : ''}
          <div class="bundle-card-price-row">
            <span class="bundle-card-price">${formatPrice(bundle.price)}</span>
          </div>
          <button type="button" class="btn btn-plum w-100 add-bundle-btn" data-slug="${bundle.slug}">Add kit to bag</button>
        </div>
      </div>
    </div>
  `;
}

async function loadBundles() {
  const grid = document.getElementById('bundles-grid');
  try {
    // Bundles created before price replaced the discount/products model
    // have no price set - skip them rather than show a broken "Rs NaN" card.
    const bundles = (await apiGet('/bundles')).filter((b) => b.price != null);
    grid.innerHTML = bundles.map(bundleCardHtml).join('');
    document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));

    function addBundleToCart(slug) {
      const bundle = bundles.find((b) => b.slug === slug);
      if (!bundle) return;
      // Bundles ride the normal cart/checkout pipeline via a mirrored
      // products row the server keeps in sync (see bundleModel.js) -
      // "bundle-" + slug is that row's slug, matching what
      // orderModel.createOrder looks up at checkout.
      addToCart({
        slug: `bundle-${bundle.slug}`,
        name: bundle.name,
        price: Number(bundle.price),
        category: 'bundle',
        images: bundle.image_url ? [bundle.image_url] : [],
      }, 1);
      window.location.href = '/pages/checkout.html';
    }

    grid.querySelectorAll('.bundle-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-bundle-btn')) return;
        addBundleToCart(card.dataset.slug);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('.add-bundle-btn')) return;
        e.preventDefault();
        addBundleToCart(card.dataset.slug);
      });
    });

    grid.querySelectorAll('.add-bundle-btn').forEach((btn) => {
      btn.addEventListener('click', () => addBundleToCart(btn.dataset.slug));
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
