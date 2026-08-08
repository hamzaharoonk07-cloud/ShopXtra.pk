const API_BASE = '/api';

async function apiGet(path) {
  // Without a timeout, a hung request (slow mobile connection, server not
  // responding) never resolves or rejects - the caller's catch block never
  // fires, and pages are stuck showing "Loading..." forever with no way to
  // recover short of a manual refresh. This turns that into a real error
  // after 15s so callers can show a Retry button instead.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection and try again.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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

const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Sialkot', 'Gujranwala', 'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Gujrat', 'Mardan', 'Kasur', 'Dera Ghazi Khan',
  'Sahiwal', 'Nawabshah', 'Okara', 'Mingora', 'Chiniot', 'Kamoke', 'Mandi Bahauddin',
  'Jhelum', 'Sadiqabad', 'Jacobabad', 'Shikarpur', 'Khanewal', 'Hafizabad', 'Kohat',
  'Muzaffargarh', 'Khanpur', 'Gojra', 'Bahawalnagar', 'Muridke', 'Pakpattan', 'Abbottabad',
  'Attock', 'Tando Adam', 'Vehari', 'Nowshera', 'Dera Ismail Khan', 'Chaman', 'Wazirabad',
  'Ahmedpur East', 'Kamalia', 'Khairpur', 'Turbat', 'Burewala', 'Zhob', 'Muzaffarabad',
  'Mirpur', 'Gwadar',
];

function cityOptionsHtml(selected) {
  return '<option value="">Select city</option>' + PAKISTAN_CITIES.map((city) =>
    `<option value="${city}" ${selected === city ? 'selected' : ''}>${city}</option>`
  ).join('');
}

const FREE_SHIPPING_THRESHOLD = 3000;
const KARACHI_SHIPPING_FEE = 200;
const STANDARD_SHIPPING_FEE = 250;

function computeShippingFee(city, subtotal) {
  if (Number(subtotal) >= FREE_SHIPPING_THRESHOLD) return 0;
  return String(city || '').trim().toLowerCase() === 'karachi' ? KARACHI_SHIPPING_FEE : STANDARD_SHIPPING_FEE;
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

// Grid/listing cards only ever render a few hundred CSS px per image, so we
// request the small sibling generated alongside every compressed upload
// (see server/utils/imageStorage.js) instead of the full 1600px master.
// Legacy images uploaded before the thumbnail existed 404 on the sibling
// until "Compress product images" is re-run in admin, hence the fallback.
function thumbSrc(url) {
  if (!url || url.startsWith('/assets/') || !/\.webp$/i.test(url)) return url;
  return url.replace(/\.webp$/i, '-thumb.webp');
}

function thumbFallbackAttr(fullUrl) {
  return `onerror="this.onerror=null;this.src='${fullUrl.replace(/'/g, '%27')}'"`;
}

function productMediaHtml(product, { fullSize = false } = {}) {
  if (product.images && product.images.length && product.images[0]) {
    const full = product.images[0];
    const src = fullSize ? full : thumbSrc(full);
    const fallback = fullSize ? '' : thumbFallbackAttr(full);
    // Bundle photos are admin-uploaded marketing images that often have a
    // title baked into the top - anchor the crop there instead of center.
    const style = product.is_bundle ? ' style="object-position:top;"' : '';
    return `<img src="${src}" ${fallback} alt="${product.name}" loading="lazy" decoding="async" width="600" height="600"${style}>`;
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
    detergents: 'Detergents',
    coffee: 'Coffee',
    cosmetics: 'Cosmetics',
  };
  return labels[category] || category;
}

/* Storefront listings skip products with no photo at all. The card falls back
   to a generic category icon, which sits next to real product photography
   looking like a broken or half-finished listing. They stay visible in the
   admin table so an image can be added (or the product removed) there. */
/* Card image boxes are a fixed square so every card in a row is the same size
   and each photo fills it completely. That means object-fit: cover crops
   whatever doesn't fit the square - unavoidable while the source photos are
   different shapes (the detergent cover is 817x1238, the coffee pods 0.66).
   Squaring the uploads is what removes the crop; nothing here can do it
   without either resizing the card or leaving space in it. */

function hasProductImage(product) {
  return Boolean(product && product.images && product.images[0]);
}

function withProductImages(products) {
  return (products || []).filter(hasProductImage);
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
  const lowStock = !outOfStock && Number(product.stock) <= 5;
  const reviewCount = Number(product.review_count) || 0;
  return `
    <div class="col-6 col-md-4 col-lg-4" data-reveal="item">
      <div class="product-card h-100 ${outOfStock ? 'is-out-of-stock' : ''}">
        <a href="/pages/product.html?slug=${encodeURIComponent(product.slug)}" class="product-card-media-link">
          <div class="product-image">
            ${productMediaHtml(product)}
            ${product.images && product.images[1] ? `<img src="${thumbSrc(product.images[1])}" ${thumbFallbackAttr(product.images[1])} alt="" loading="lazy" decoding="async" width="600" height="600" class="product-image-hover">` : ''}
            ${outOfStock
              ? '<span class="product-card-badge product-card-badge-muted">Out of stock</span>'
              : discount ? `<span class="product-card-badge">Save ${discount}%</span>` : product.is_bestseller ? '<span class="product-card-badge">Bestseller</span>' : ''}
            ${lowStock ? `<span class="product-card-urgency">Only ${product.stock} left</span>` : ''}
          </div>
        </a>
        <a href="/pages/product.html?slug=${encodeURIComponent(product.slug)}" class="product-card-link">
          <div class="product-body">
            <div class="product-name">${product.name}</div>
            ${reviewCount > 0 ? `
              <div class="product-card-rating">${starsHtml(product.avg_rating, '0.8rem')}<span class="product-card-rating-count">${reviewCount} review${reviewCount === 1 ? '' : 's'}</span></div>
            ` : ''}
          </div>
        </a>
        <!-- Add to cart comes AFTER the name, and carries the price inside it.
             Shoppers (and anyone tabbing through with a keyboard) used to reach
             the buy button before they had read what the product was or what it
             cost, which put the loudest element on the card in front of the
             information needed to act on it. When the product is on sale the
             struck-through original sits just above, so the saving is still
             legible without duplicating the live price outside the button. -->
        ${discount ? `<div class="product-card-compare-row"><span class="compare-price">${formatPrice(product.compare_at_price)}</span></div>` : ''}
        <button type="button" class="quick-add-btn" aria-label="${outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to bag, ${formatPrice(product.price)}`}"
          data-slug="${product.slug}" data-name="${product.name.replace(/"/g, '&quot;')}"
          data-price="${product.price}" data-category="${product.category}"
          data-image="${(product.images && product.images[0]) || ''}"
          ${outOfStock ? 'disabled' : ''}><span class="quick-add-btn-label">${outOfStock ? 'Sold out' : 'Add to cart'}</span><span class="quick-add-btn-price">${formatPrice(product.price)}</span></button>
      </div>
    </div>
  `;
}
