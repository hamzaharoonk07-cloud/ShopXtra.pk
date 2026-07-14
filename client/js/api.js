const API_BASE = '/api';

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function formatPrice(value) {
  const num = Number(value);
  return `Rs ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const PRODUCT_ILLUSTRATIONS = {
  electrolytes: `
    <svg viewBox="0 0 120 120" width="55%" role="img" aria-hidden="true">
      <ellipse cx="60" cy="108" rx="26" ry="6" fill="var(--plum)" opacity="0.08"/>
      <rect x="42" y="20" width="16" height="10" rx="3" fill="var(--plum)" opacity="0.55"/>
      <path d="M40 32 h20 a8 8 0 0 1 8 8 v58 a10 10 0 0 1 -10 10 h-16 a10 10 0 0 1 -10 -10 v-58 a8 8 0 0 1 8 -8 z"
        fill="var(--tea-pink)" stroke="var(--plum)" stroke-width="1.5" opacity="0.9"/>
      <path d="M38 78 h44 v14 a10 10 0 0 1 -10 10 h-24 a10 10 0 0 1 -10 -10 z" fill="var(--gold)" opacity="0.85"/>
      <circle cx="72" cy="46" r="4" fill="var(--ivory-blush)"/>
      <circle cx="66" cy="58" r="2.5" fill="var(--ivory-blush)"/>
    </svg>`,
  coffee: `
    <svg viewBox="0 0 120 120" width="55%" role="img" aria-hidden="true">
      <ellipse cx="58" cy="100" rx="30" ry="6" fill="var(--plum)" opacity="0.08"/>
      <path d="M28 92 l6 -46 h48 l6 46 a8 8 0 0 1 -8 8 h-44 a8 8 0 0 1 -8 -8 z"
        fill="var(--gold)" stroke="var(--plum)" stroke-width="1.5"/>
      <path d="M82 54 h10 a10 10 0 0 1 0 20 h-8" fill="none" stroke="var(--plum)" stroke-width="3" stroke-linecap="round"/>
      <path d="M45 30 q4 -10 0 -18" fill="none" stroke="var(--dusty-rose)" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
      <path d="M58 30 q4 -10 0 -18" fill="none" stroke="var(--dusty-rose)" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
    </svg>`,
  shampoo: `
    <svg viewBox="0 0 120 120" width="55%" role="img" aria-hidden="true">
      <ellipse cx="60" cy="108" rx="24" ry="6" fill="var(--plum)" opacity="0.08"/>
      <rect x="46" y="14" width="10" height="14" rx="2" fill="var(--plum)" opacity="0.6"/>
      <path d="M38 30 h30 l4 8 v58 a12 12 0 0 1 -12 12 h-18 a12 12 0 0 1 -12 -12 v-58 z"
        fill="var(--dusty-rose)" stroke="var(--plum)" stroke-width="1.5" opacity="0.9"/>
      <rect x="34" y="60" width="52" height="6" fill="var(--ivory-blush)" opacity="0.5"/>
      <path d="M46 78 q8 8 16 0" fill="none" stroke="var(--ivory-blush)" stroke-width="2" opacity="0.7"/>
    </svg>`,
  soaps: `
    <svg viewBox="0 0 120 120" width="55%" role="img" aria-hidden="true">
      <ellipse cx="60" cy="102" rx="34" ry="6" fill="var(--plum)" opacity="0.08"/>
      <rect x="24" y="46" width="72" height="44" rx="18" fill="var(--sand)" stroke="var(--plum)" stroke-width="1.5"/>
      <path d="M34 60 q26 12 52 0" fill="none" stroke="var(--gold)" stroke-width="2" opacity="0.7"/>
      <path d="M34 74 q26 10 52 0" fill="none" stroke="var(--gold)" stroke-width="2" opacity="0.5"/>
    </svg>`,
  cosmetics: `
    <svg viewBox="0 0 120 120" width="55%" role="img" aria-hidden="true">
      <ellipse cx="60" cy="106" rx="20" ry="5" fill="var(--plum)" opacity="0.08"/>
      <rect x="48" y="60" width="24" height="42" rx="6" fill="var(--plum)" opacity="0.85"/>
      <path d="M50 60 l3 -30 a7 7 0 0 1 14 0 l3 30 z" fill="var(--dusty-rose)" stroke="var(--plum)" stroke-width="1.5"/>
      <rect x="52" y="66" width="16" height="6" fill="var(--gold)" opacity="0.7"/>
    </svg>`,
};

function productIllustration(category) {
  return PRODUCT_ILLUSTRATIONS[category] || `<span aria-hidden="true">&#10022;</span>`;
}

function productMediaHtml(product) {
  if (product.images && product.images.length && product.images[0]) {
    return `<img src="${product.images[0]}" alt="${product.name}" loading="lazy">`;
  }
  return productIllustration(product.category);
}

const ORDER_STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

function statusTimelineHtml(status) {
  if (status === 'cancelled') {
    return `<p class="text-center mb-0" style="color:#b3413a;">This order was cancelled.</p>`;
  }
  const currentIndex = ORDER_STATUS_STEPS.indexOf(status);
  return `
    <div class="track-stepper">
      ${ORDER_STATUS_STEPS.map((step, i) => `
        <div class="track-step">
          <span class="track-step-circle ${i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''}">
            ${i < currentIndex ? '&#10003;' : ''}
          </span>
          <span class="track-step-label ${i <= currentIndex ? 'active' : ''}">${step}</span>
        </div>
        ${i < ORDER_STATUS_STEPS.length - 1 ? `<div class="track-step-line ${i < currentIndex ? 'done' : ''}"></div>` : ''}
      `).join('')}
    </div>
  `;
}

function starsHtml(rating, size = '1rem') {
  const filled = Math.round(Number(rating) || 0);
  let html = `<span style="font-size:${size}; color: var(--gold); letter-spacing: 1px;" aria-hidden="true">`;
  for (let i = 1; i <= 5; i++) {
    html += i <= filled ? '&#9733;' : '&#9734;';
  }
  html += '</span>';
  return html;
}

function categoryLabel(category) {
  const labels = {
    electrolytes: 'Electrolytes',
    shampoo: 'Shampoo',
    soaps: 'Soaps',
    coffee: 'Coffee',
    cosmetics: 'Cosmetics',
  };
  return labels[category] || category;
}

function saleDiscountPercent(product) {
  const compareAt = Number(product.compare_at_price);
  const price = Number(product.price);
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function productCardHtml(product) {
  const discount = saleDiscountPercent(product);
  const outOfStock = product.stock <= 0;
  return `
    <div class="col-6 col-md-4 col-lg-3" data-reveal="item">
      <div class="product-card h-100 ${outOfStock ? 'is-out-of-stock' : ''}">
        <a href="/pages/product.html?slug=${encodeURIComponent(product.slug)}" class="product-card-link">
          <div class="product-image">
            ${productMediaHtml(product)}
            ${outOfStock
              ? '<span class="product-card-badge product-card-badge-muted">Out of stock</span>'
              : discount ? `<span class="product-card-badge">-${discount}%</span>` : product.is_bestseller ? '<span class="product-card-badge">Bestseller</span>' : ''}
          </div>
          <div class="product-body">
            <span class="category-tint tint-${product.category}">${categoryLabel(product.category)}</span>
            <div class="product-name">${product.name}</div>
          </div>
        </a>
        <div class="product-card-foot">
          <span class="price">
            ${formatPrice(product.price)}
            ${discount ? `<span class="compare-price">${formatPrice(product.compare_at_price)}</span>` : ''}
          </span>
          <button type="button" class="quick-add-btn" aria-label="${outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to bag`}"
            data-slug="${product.slug}" data-name="${product.name.replace(/"/g, '&quot;')}"
            data-price="${product.price}" data-category="${product.category}"
            data-image="${(product.images && product.images[0]) || ''}"
            ${outOfStock ? 'disabled' : ''}>${outOfStock ? 'Out of stock' : 'Add to bag'}</button>
        </div>
      </div>
    </div>
  `;
}
