function getParams() {
  return new URLSearchParams(window.location.search);
}

function buildQuery(params) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.minPrice) query.set('minPrice', params.minPrice);
  if (params.maxPrice) query.set('maxPrice', params.maxPrice);
  if (params.sort) query.set('sort', params.sort);
  if (params.search) query.set('search', params.search);
  return query;
}

async function loadProducts(params) {
  const grid = document.getElementById('product-grid');
  const countEl = document.getElementById('shop-count');
  grid.innerHTML = '<p class="text-center py-5">Loading products…</p>';
  try {
    const query = buildQuery(params);
    const products = await apiGet(`/products?${query.toString()}`);
    if (!products.length) {
      grid.innerHTML = '<p class="text-center py-5">No products match these filters.</p>';
      countEl.textContent = '0 products';
      return;
    }
    grid.innerHTML = products.map(productCardHtml).join('');
    countEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
    document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));
  } catch (err) {
    grid.innerHTML = `<p class="text-center py-5 text-danger">Could not load products: ${err.message}</p>`;
  }
}

function setActivePill(category) {
  document.querySelectorAll('.shop-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.category === category);
  });
}

function currentParams() {
  return {
    category: document.getElementById('f-category').value,
    minPrice: document.getElementById('f-min').value,
    maxPrice: document.getElementById('f-max').value,
    sort: document.getElementById('f-sort').value,
    search: document.getElementById('f-search').value,
  };
}

function applyAndLoad() {
  const params = currentParams();
  const query = buildQuery(params);
  window.history.pushState({}, '', `${window.location.pathname}?${query.toString()}`);
  const title = document.getElementById('shop-title');
  title.textContent = params.category ? categoryLabel(params.category) : 'Shop all';
  loadProducts(params);
}

function initFromUrl() {
  const params = getParams();
  const category = params.get('category') || '';

  document.getElementById('f-category').value = category;
  document.getElementById('f-search').value = params.get('search') || '';
  document.getElementById('f-min').value = params.get('minPrice') || '';
  document.getElementById('f-max').value = params.get('maxPrice') || '';
  document.getElementById('f-sort').value = params.get('sort') || 'newest';

  setActivePill(category);
  document.getElementById('shop-title').textContent = category ? categoryLabel(category) : 'Shop all';

  loadProducts({
    category,
    minPrice: params.get('minPrice'),
    maxPrice: params.get('maxPrice'),
    sort: params.get('sort'),
    search: params.get('search'),
  });
}

document.getElementById('category-pills').addEventListener('click', (e) => {
  const pill = e.target.closest('.shop-pill');
  if (!pill) return;
  document.getElementById('f-category').value = pill.dataset.category;
  setActivePill(pill.dataset.category);
  applyAndLoad();
});

document.getElementById('f-sort').addEventListener('change', applyAndLoad);

document.getElementById('filter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  applyAndLoad();
  const drawerEl = document.getElementById('filterDrawer');
  bootstrap.Offcanvas.getOrCreateInstance(drawerEl).hide();
});

initFromUrl();
