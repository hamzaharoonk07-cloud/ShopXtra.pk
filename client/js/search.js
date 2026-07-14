document.addEventListener('DOMContentLoaded', function initNavSearch() {
  const input = document.getElementById('nav-search-input');
  const results = document.getElementById('nav-search-results');
  if (!input || !results) return;

  let debounceTimer;

  function hideResults() {
    results.classList.add('d-none');
    results.innerHTML = '';
  }

  async function runSearch(query) {
    if (!query.trim()) return hideResults();
    try {
      const products = await apiGet(`/products?search=${encodeURIComponent(query)}`);
      const top = products.slice(0, 5);
      if (!top.length) {
        results.innerHTML = '<p class="px-3 py-3 mb-0" style="color:#6b5a58;">No products found.</p>';
      } else {
        results.innerHTML = top.map((p) => `
          <a href="/pages/product.html?slug=${encodeURIComponent(p.slug)}" class="search-result-item">
            <span class="search-result-thumb" aria-hidden="true">&#10022;</span>
            <span class="flex-grow-1">
              <span class="d-block" style="font-size: 0.9rem;">${p.name}</span>
              <span class="price" style="font-size: 0.8rem; color: var(--gold);">${formatPrice(p.price)}</span>
            </span>
          </a>
        `).join('') + `<a href="/pages/shop.html?search=${encodeURIComponent(query)}" class="search-view-all">View all results</a>`;
      }
      results.classList.remove('d-none');
    } catch {
      hideResults();
    }
  }

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value;
    debounceTimer = setTimeout(() => runSearch(query), 250);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = `/pages/shop.html?search=${encodeURIComponent(input.value.trim())}`;
    }
    if (e.key === 'Escape') hideResults();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-search-input') && !e.target.closest('#nav-search-results')) {
      hideResults();
    }
  });
});
