// Every bundle has a mirrored row in the products table (see
// bundleModel.js) so it can ride the normal cart/checkout pipeline - reusing
// productCardHtml() here means bundles look, link, and "Add to cart" exactly
// like regular product cards, and the mirror row's own product.html page
// becomes a real bundle detail page for free.
function bundleAsProduct(bundle) {
  return {
    slug: `bundle-${bundle.slug}`,
    name: bundle.name,
    price: bundle.price,
    compare_at_price: null,
    stock: 999999,
    images: bundle.image_url ? [bundle.image_url] : [],
    category: 'bundle',
    is_bundle: true,
    is_bestseller: false,
    review_count: 0,
    avg_rating: null,
  };
}

async function loadBundles() {
  const grid = document.getElementById('bundles-grid');
  try {
    // Bundles created before price replaced the discount/products model
    // have no price set - skip them rather than show a broken "Rs NaN" card.
    const bundles = (await apiGet('/bundles')).filter((b) => b.price != null);
    if (!bundles.length) {
      grid.innerHTML = '<p class="text-center py-5">No kits available right now.</p>';
      return;
    }
    grid.innerHTML = bundles.map((b) => productCardHtml(bundleAsProduct(b))).join('');
    document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));

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
