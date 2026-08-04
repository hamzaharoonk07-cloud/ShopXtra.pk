const SHOP_BANNER_PHOTOS = {
  electrolytes: '/assets/hero/electrolytes-flavors.jpg',
  coffee: '/assets/hero/coffee-pour.jpg',
  shampoo: '/assets/hero/shampoo-rosemary.jpg',
  cosmetics: '/assets/hero/cosmetics-flatlay.jpg',
};

const SHOP_BANNER_VIDEOS = {
  electrolytes: '/assets/bg/bg-electrolytes.mp4',
  coffee: '/assets/bg/bg-coffee.mp4',
  shampoo: '/assets/bg/bg-shampoo.mp4',
  cosmetics: '/assets/bg/bg-cosmetics.mp4',
};

function applyBannerPhoto(category) {
  const wrap = document.getElementById('shop-banner-photo');
  if (!wrap) return;
  if (!category) {
    wrap.className = 'shop-banner-photo shop-banner-photo-all';
    wrap.innerHTML = '<img src="/assets/logo-full.png" alt="ShopXtra">';
    return;
  }
  const photo = SHOP_BANNER_PHOTOS[category];
  wrap.className = 'shop-banner-photo' + (photo ? ` shop-banner-photo-${category}` : '');
  wrap.innerHTML = photo ? `<img src="${photo}" alt="">` : '';
}

function applyPageBgVideo(category) {
  const wrap = document.getElementById('shop-bg-video-wrap');
  if (!wrap) return;
  const video = category ? SHOP_BANNER_VIDEOS[category] : null;
  if (!video) {
    wrap.innerHTML = '';
    wrap.classList.remove('is-active');
    return;
  }
  wrap.innerHTML = `<video autoplay muted loop playsinline><source src="${video}" type="video/mp4"></video>`;
  wrap.classList.add('is-active');
  const v = wrap.querySelector('video');
  v.muted = true;
  v.play().catch(() => {});
}

const CATALOG_CACHE_KEY = 'shopxtra:catalog:v1';
let catalogPromise = null;

function readCatalogCache() {
  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCatalogCache(products) {
  try {
    sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(products));
  } catch {
    // sessionStorage unavailable (private mode, quota) — cache is a pure perf optimization
  }
}

function fetchCatalog() {
  return apiGet('/products').then((products) => {
    const withImages = products.filter((p) => p.images && p.images[0]);
    writeCatalogCache(withImages);
    return withImages;
  });
}

// Returns the full, unfiltered catalog. A cached copy resolves instantly and
// is refreshed from the network in the background so the next call gets
// current data without ever blocking the UI on a repeat fetch.
function getCatalog() {
  if (catalogPromise) return catalogPromise;
  const cached = readCatalogCache();
  if (cached) {
    catalogPromise = Promise.resolve(cached);
    fetchCatalog().then((fresh) => { catalogPromise = Promise.resolve(fresh); }).catch(() => {});
  } else {
    catalogPromise = fetchCatalog();
  }
  return catalogPromise;
}

function sortCatalog(products, sort) {
  const list = [...products];
  if (sort === 'price_asc') {
    list.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === 'price_desc') {
    list.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sort === 'bestseller') {
    list.sort((a, b) => {
      if (a.is_bestseller !== b.is_bestseller) return (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return list;
}

function filterCatalog(products, params) {
  let list = products;
  if (params.category) list = list.filter((p) => p.category === params.category);
  if (params.minPrice) list = list.filter((p) => Number(p.price) >= Number(params.minPrice));
  if (params.maxPrice) list = list.filter((p) => Number(p.price) <= Number(params.maxPrice));
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  return sortCatalog(list, params.sort);
}

function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  if (!products.length) {
    grid.innerHTML = '<p class="text-center py-5">No products match these filters.</p>';
    return;
  }
  const template = document.createElement('template');
  template.innerHTML = products.map(productCardHtml).join('');
  const fragment = document.createDocumentFragment();
  fragment.append(...template.content.childNodes);
  grid.replaceChildren(fragment);
  document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));
}

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
  if (!readCatalogCache() && !catalogPromise) {
    grid.innerHTML = '<p class="text-center py-5">Loading products…</p>';
  }
  try {
    const catalog = await getCatalog();
    renderProducts(filterCatalog(catalog, params));
  } catch (err) {
    grid.innerHTML = `
      <div class="text-center py-5">
        <p class="text-danger mb-3">Could not load products: ${err.message}</p>
        <button type="button" class="btn btn-plum" id="products-retry-btn">Retry</button>
      </div>
    `;
    document.getElementById('products-retry-btn').addEventListener('click', () => {
      catalogPromise = null;
      loadProducts(params);
    });
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
  applyBannerPhoto(params.category);
  applyPageBgVideo(params.category);
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
  applyBannerPhoto(category);
  applyPageBgVideo(category);

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
