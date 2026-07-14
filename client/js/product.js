async function loadProduct() {
  const main = document.getElementById('product-main');
  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    main.innerHTML = '<p class="text-center py-5">No product specified.</p>';
    return;
  }

  try {
    const product = await apiGet(`/products/${encodeURIComponent(slug)}`);
    document.title = `${product.name} — ShopXtra`;

    const variantOptions = (product.variants || [])
      .map((v) => `<option value="${v.id}" data-modifier="${v.price_modifier}">${v.variant_name}</option>`)
      .join('');

    const images = (product.images && product.images.length) ? product.images : [];
    const thumbRail = images.length > 1 ? `
      <div class="pdp-thumb-rail">
        ${images.map((img, i) => `
          <button type="button" class="pdp-thumb ${i === 0 ? 'active' : ''}" data-img="${img}" aria-label="View image ${i + 1}">
            <img src="${img}" alt="${product.name} ${i + 1}">
          </button>
        `).join('')}
      </div>
    ` : '';

    main.innerHTML = `
      <nav class="shop-breadcrumb" aria-label="Breadcrumb">
        <a href="/index.html">Home</a> / <a href="/pages/shop.html?category=${product.category}">${categoryLabel(product.category)}</a> / <span>${product.name}</span>
      </nav>

      <div class="pdp-grid">
        <div class="pdp-gallery">
          <div class="pdp-main-image" id="pdp-main-image">
            ${productMediaHtml(product)}
          </div>
          ${thumbRail}
        </div>
        <div class="pdp-info">
          <span class="eyebrow">${categoryLabel(product.category)}${product.is_bestseller ? ' · Bestseller' : ''}</span>
          <h1 class="pdp-title">${product.name}</h1>
          <div class="pdp-stars-row" id="reviews-summary-inline"></div>
          <div class="pdp-price-row">
            <span class="pdp-price" id="product-price">${formatPrice(product.price)}</span>
            <span class="pdp-stock">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
          </div>
          <p class="pdp-desc">${product.description || ''}</p>

          ${product.variants && product.variants.length ? `
            <div class="mb-3">
              <label class="form-label mono" style="font-size:0.8rem;" for="variant-select">Variant</label>
              <select id="variant-select" class="form-select" style="max-width: 280px;">
                ${variantOptions}
              </select>
            </div>
          ` : ''}

          <div class="pdp-add-row">
            <div class="pdp-qty-stepper">
              <button type="button" class="pdp-qty-btn" data-step="-1" aria-label="Decrease quantity">&minus;</button>
              <input type="number" id="qty-input" value="1" min="1" max="${product.stock}" aria-label="Quantity">
              <button type="button" class="pdp-qty-btn" data-step="1" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn btn-plum flex-grow-1" id="add-to-cart-btn" ${product.stock <= 0 ? 'disabled' : ''}>
              ${product.stock <= 0 ? 'Out of stock' : `Add to bag — ${formatPrice(product.price)}`}
            </button>
            <button class="btn btn-outline-plum" id="wishlist-btn" aria-label="Add to wishlist" aria-pressed="false">
              <span id="wishlist-icon" aria-hidden="true">&#9825;</span>
            </button>
          </div>
          <p id="add-to-cart-msg" class="mt-2 mb-0" role="status"></p>

          <div class="pdp-cod-chip">
            <span class="pdp-cod-dot" aria-hidden="true"></span>
            <span>Cash on Delivery available · Ships within 24 hours · Delivered in 2–3 days</span>
          </div>

          <div class="pdp-accordion">
            ${product.ingredients ? `
              <details class="pdp-accordion-item" open>
                <summary>Ingredients</summary>
                <p>${product.ingredients}</p>
              </details>
            ` : ''}
            <details class="pdp-accordion-item">
              <summary>How to use</summary>
              <p>Follow the instructions on the product label. Store in a cool, dry place away from direct sunlight.</p>
            </details>
            <details class="pdp-accordion-item">
              <summary>Delivery &amp; returns</summary>
              <p>Cash on Delivery nationwide, with delivery in 2–3 days. Unopened items can be returned within 7 days of delivery.</p>
            </details>
          </div>
        </div>
      </div>

      <div class="py-5" id="pdp-related-section" style="display:none;">
        <h2 class="mb-4">Pairs well with</h2>
        <div class="pdp-related-grid" id="pdp-related-grid"></div>
      </div>

      <div class="filter-panel mt-4" data-reveal="up">
        <h2 class="h4 mb-3">Reviews</h2>
        <div id="reviews-summary" class="mb-4"><p style="color:#6b5a58;">Loading reviews…</p></div>
        <div id="review-form-slot"></div>
        <div id="reviews-list"></div>
      </div>
    `;

    loadReviews(slug);
    initWishlistButton(slug);
    loadRelatedProducts(product);

    if (thumbRail) {
      main.querySelectorAll('.pdp-thumb').forEach((btn) => {
        btn.addEventListener('click', () => {
          main.querySelectorAll('.pdp-thumb').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('pdp-main-image').innerHTML = `<img src="${btn.dataset.img}" alt="${product.name}">`;
        });
      });
    }

    const qtyInput = document.getElementById('qty-input');
    main.querySelectorAll('.pdp-qty-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = (Number(qtyInput.value) || 1) + Number(btn.dataset.step);
        qtyInput.value = Math.max(1, Math.min(next, product.stock || next));
      });
    });

    const addToCartBtn = document.getElementById('add-to-cart-btn');
    addToCartBtn?.addEventListener('click', (e) => {
      const qty = Number(document.getElementById('qty-input').value) || 1;
      addToCart(product, qty);
      const msg = document.getElementById('add-to-cart-msg');
      msg.textContent = 'Added to bag.';
      msg.style.color = 'var(--tea-pink)';
      if (typeof bounceButton === 'function') bounceButton(e.currentTarget);
      if (typeof flyToCart === 'function') flyToCart(document.querySelector('.pdp-main-image'));
    });

    initStickyAddBar(product, addToCartBtn);
  } catch (err) {
    main.innerHTML = `<p class="text-center py-5 text-danger">Could not load product: ${err.message}</p>`;
  }
}

async function loadRelatedProducts(product) {
  const section = document.getElementById('pdp-related-section');
  const grid = document.getElementById('pdp-related-grid');
  try {
    const products = await apiGet(`/products?category=${encodeURIComponent(product.category)}`);
    const related = products.filter((p) => p.slug !== product.slug).slice(0, 3);
    if (!related.length) return;
    grid.innerHTML = related.map((item) => `
      <a href="/pages/product.html?slug=${encodeURIComponent(item.slug)}" class="pdp-related-card">
        <div class="pdp-related-thumb">${productMediaHtml(item)}</div>
        <div class="d-flex flex-column gap-1 min-width-0">
          <span class="pdp-related-name">${item.name}</span>
          <span class="pdp-related-price">${formatPrice(item.price)}</span>
          <span class="pdp-related-add">Add to bag</span>
        </div>
      </a>
    `).join('');
    section.style.display = '';
  } catch {
    // Related products are a nice-to-have; fail silently.
  }
}

async function loadReviews(slug) {
  const summaryEl = document.getElementById('reviews-summary');
  const listEl = document.getElementById('reviews-list');
  const formSlot = document.getElementById('review-form-slot');

  try {
    const { reviews, average, count } = await apiGet(`/products/${encodeURIComponent(slug)}/reviews`);

    summaryEl.innerHTML = count > 0
      ? `<div class="d-flex align-items-center gap-2">${starsHtml(average, '1.3rem')}<span class="fw-semibold">${average}</span><span style="color:#6b5a58;">(${count} review${count === 1 ? '' : 's'})</span></div>`
      : '<p style="color:#6b5a58;">No reviews yet — be the first.</p>';

    const inlineEl = document.getElementById('reviews-summary-inline');
    if (inlineEl) {
      inlineEl.innerHTML = count > 0
        ? `${starsHtml(average, '0.95rem')}<a href="#reviews-summary">${count} review${count === 1 ? '' : 's'}</a>`
        : `${starsHtml(0, '0.95rem')}<a href="#reviews-summary">Be the first to review</a>`;
    }

    listEl.innerHTML = reviews.map((r) => `
      <div class="py-3 border-bottom">
        <div class="d-flex justify-content-between align-items-center">
          <span class="fw-semibold">${r.user_name}</span>
          ${starsHtml(r.rating, '0.85rem')}
        </div>
        ${r.comment ? `<p class="mb-0 mt-1" style="color:#6b5a58;">${r.comment}</p>` : ''}
      </div>
    `).join('');

    const meRes = await fetch('/api/auth/me');
    if (meRes.ok) {
      formSlot.innerHTML = `
        <form id="review-form" class="mb-4">
          <label class="form-label mono" style="font-size:0.8rem;">Your rating</label>
          <div class="d-flex gap-1 mb-2" id="star-picker">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="btn btn-sm star-btn" data-value="${n}" style="font-size:1.2rem; color: var(--sand); border:none; background:none; padding:0.1rem 0.2rem;" aria-label="${n} star">&#9733;</button>`).join('')}
          </div>
          <input type="hidden" id="review-rating" value="0">
          <textarea class="form-control mb-2" id="review-comment" rows="2" placeholder="Share your thoughts (optional)"></textarea>
          <p class="text-danger d-none mb-2" id="review-error"></p>
          <button type="submit" class="btn btn-outline-plum btn-sm">Submit review</button>
        </form>
      `;

      const starBtns = formSlot.querySelectorAll('.star-btn');
      const ratingInput = document.getElementById('review-rating');
      starBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const value = Number(btn.dataset.value);
          ratingInput.value = value;
          starBtns.forEach((b) => {
            b.style.color = Number(b.dataset.value) <= value ? 'var(--gold)' : 'var(--sand)';
          });
        });
      });

      document.getElementById('review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('review-error');
        errorEl.classList.add('d-none');
        try {
          const res = await fetch(`/api/products/${encodeURIComponent(slug)}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rating: Number(ratingInput.value),
              comment: document.getElementById('review-comment').value,
            }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error);
          loadReviews(slug);
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('d-none');
        }
      });
    } else {
      formSlot.innerHTML = `<p class="mb-4" style="color:#6b5a58;"><a href="/pages/account.html">Log in</a> to leave a review.</p>`;
    }
  } catch (err) {
    summaryEl.innerHTML = `<p class="text-danger">Could not load reviews: ${err.message}</p>`;
  }
}

function initStickyAddBar(product, mainAddBtn) {
  const bar = document.getElementById('sticky-add-bar');
  if (!bar || !mainAddBtn) return;

  document.getElementById('sticky-add-name').textContent = product.name;
  document.getElementById('sticky-add-price').textContent = formatPrice(product.price);

  const stickyBtn = document.getElementById('sticky-add-btn');
  if (product.stock <= 0) {
    stickyBtn.disabled = true;
    stickyBtn.textContent = 'Out of stock';
  }
  stickyBtn.addEventListener('click', () => {
    const qty = Number(document.getElementById('qty-input')?.value) || 1;
    addToCart(product, qty);
    if (typeof bounceButton === 'function') bounceButton(stickyBtn);
    if (typeof flyToCart === 'function') flyToCart(stickyBtn);
  });

  const observer = new IntersectionObserver(
    ([entry]) => bar.classList.toggle('visible', !entry.isIntersecting),
    { threshold: 0 }
  );
  observer.observe(mainAddBtn);
}

async function initWishlistButton(slug) {
  const btn = document.getElementById('wishlist-btn');
  const icon = document.getElementById('wishlist-icon');
  let isWishlisted = false;

  function render() {
    icon.innerHTML = isWishlisted ? '&#9829;' : '&#9825;';
    btn.style.color = isWishlisted ? 'var(--dusty-rose)' : '';
    btn.setAttribute('aria-pressed', String(isWishlisted));
  }

  try {
    const res = await fetch('/api/wishlist');
    if (res.ok) {
      const items = await res.json();
      isWishlisted = items.some((p) => p.slug === slug);
      render();
    }
  } catch {
    // Not logged in or request failed; leave as default unwishlisted state.
  }

  btn.addEventListener('click', async () => {
    try {
      if (isWishlisted) {
        const res = await fetch(`/api/wishlist/${encodeURIComponent(slug)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        isWishlisted = false;
      } else {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        if (!res.ok) throw new Error();
        isWishlisted = true;
      }
      render();
    } catch {
      window.location.href = '/pages/account.html';
    }
  });
}

loadProduct();
