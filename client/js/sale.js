let currentCategory = '';

async function loadSaleItems() {
  const grid = document.getElementById('sale-grid');
  const countEl = document.getElementById('sale-count');
  const sort = document.getElementById('sale-sort').value;
  grid.innerHTML = '<p class="text-center py-5">Loading sale items…</p>';

  try {
    const query = new URLSearchParams({ sale: 'true', sort });
    if (currentCategory) query.set('category', currentCategory);
    const products = await apiGet(`/products?${query.toString()}`);

    if (!products.length) {
      grid.innerHTML = '<p class="text-center py-5">No sale items in this category right now.</p>';
      countEl.textContent = '0 products';
      return;
    }

    grid.innerHTML = products.map(productCardHtml).join('');
    countEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'} on sale`;
    document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));

    const maxDiscount = Math.max(...products.map((p) => saleDiscountPercent(p) || 0));
    if (maxDiscount > 0) {
      document.getElementById('sale-hero-subtitle').textContent =
        `Save up to ${maxDiscount}% across electrolytes, coffee, shampoo, soaps & cosmetics.`;
    }
  } catch (err) {
    grid.innerHTML = `<p class="text-center py-5 text-danger">Could not load sale items: ${err.message}</p>`;
  }
}

document.querySelectorAll('.sale-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.sale-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    currentCategory = pill.dataset.category;
    loadSaleItems();
  });
});

document.getElementById('sale-sort').addEventListener('change', loadSaleItems);

loadSaleItems();
