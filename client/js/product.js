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
    updateProductSeo(product, slug);

    const variants = product.variants || [];
    const colorVariants = variants.filter((v) => v.color_hex);
    const plainVariants = colorVariants.length ? [] : variants;

    const colorSwatchesHtml = colorVariants.length ? `
      <div class="mb-3">
        <label class="form-label mono" style="font-size:0.8rem;">Colour</label>
        <div class="pdp-color-swatches" id="pdp-color-swatches">
          ${colorVariants.map((v, i) => `
            <button type="button" class="pdp-color-swatch ${i === 0 ? 'active' : ''}"
              data-variant-id="${v.id}"
              data-modifier="${v.price_modifier}"
              data-image="${v.image_url || ''}"
              data-stock="${v.stock}"
              style="background:${v.color_hex};"
              aria-label="${v.color_name || v.variant_name}" title="${v.color_name || v.variant_name}"></button>
          `).join('')}
        </div>
        <span class="pdp-color-name" id="pdp-color-name">${colorVariants[0].color_name || colorVariants[0].variant_name}</span>
      </div>
    ` : '';

    const variantOptions = plainVariants
      .map((v) => `<option value="${v.id}" data-modifier="${v.price_modifier}">${v.variant_name}</option>`)
      .join('');

    const images = (product.images && product.images.length) ? product.images : [];
    const thumbRail = (images.length > 1 || product.video_url) ? `
      <div class="pdp-thumb-rail">
        ${images.map((img, i) => `
          <button type="button" class="pdp-thumb ${i === 0 ? 'active' : ''}" data-img="${img}" aria-label="View image ${i + 1}">
            <img src="${img}" alt="${product.name} ${i + 1}" loading="lazy">
          </button>
        `).join('')}
        ${product.video_url ? `
          <button type="button" class="pdp-thumb pdp-thumb-video" data-video="${product.video_url}" aria-label="Play product video">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="9 7 18 12 9 17 9 7"/></svg>
          </button>
        ` : ''}
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
            <span class="pdp-stock${product.stock > 0 && product.stock <= 5 ? ' pdp-stock-urgent' : ''}">${product.stock > 0 ? (product.stock <= 5 ? `Only ${product.stock} left — order soon` : `${product.stock} in stock`) : 'Out of stock'}</span>
          </div>
          <p class="pdp-desc">${product.description || ''}</p>

          ${colorSwatchesHtml}

          ${plainVariants.length ? `
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

          <a href="${whatsappLink(`Hi ShopXtra, I have a question about ${product.name}.`)}" target="_blank" rel="noopener" class="pdp-whatsapp-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.6-.4z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5.1-1.3A9.9 9.9 0 0 0 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 20.2 12 8.2 8.2 0 0 1 12 20.2z"/></svg>
            Ask about this product on WhatsApp
          </a>

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
        <h2 class="text-center mb-4">You may also like</h2>
        <div class="row g-4" id="pdp-related-grid" data-reveal-group></div>
      </div>

      <div class="my-5 reviews-section-pdp" data-reveal="up">
        <h2 class="text-center mb-4">Customer Reviews</h2>
        <div id="reviews-summary" class="mb-4"><p style="color:#6b5a58;">Loading reviews…</p></div>
        <div id="review-form-slot"></div>
        <div class="review-grid" id="reviews-list" data-reveal-group></div>
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
          const mainImage = document.getElementById('pdp-main-image');
          if (btn.dataset.video) {
            mainImage.innerHTML = `<video src="${btn.dataset.video}" controls autoplay muted playsinline></video>`;
          } else {
            mainImage.innerHTML = `<img src="${btn.dataset.img}" alt="${product.name}">`;
          }
        });
      });
    }

    let selectedVariant = colorVariants[0] || null;

    function applyVariantPrice() {
      const modifier = selectedVariant ? Number(selectedVariant.price_modifier) : 0;
      const finalPrice = Number(product.price) + modifier;
      document.getElementById('product-price').textContent = formatPrice(finalPrice);
      const btn = document.getElementById('add-to-cart-btn');
      const outOfStock = selectedVariant ? Number(selectedVariant.stock) <= 0 : product.stock <= 0;
      if (btn) {
        btn.disabled = outOfStock;
        btn.textContent = outOfStock ? 'Out of stock' : `Add to bag — ${formatPrice(finalPrice)}`;
      }
      return finalPrice;
    }

    if (colorVariants.length) {
      main.querySelectorAll('.pdp-color-swatch').forEach((swatch) => {
        swatch.addEventListener('click', () => {
          main.querySelectorAll('.pdp-color-swatch').forEach((s) => s.classList.remove('active'));
          swatch.classList.add('active');
          selectedVariant = colorVariants.find((v) => String(v.id) === swatch.dataset.variantId);
          document.getElementById('pdp-color-name').textContent = selectedVariant.color_name || selectedVariant.variant_name;
          if (swatch.dataset.image) {
            document.getElementById('pdp-main-image').innerHTML = `<img src="${swatch.dataset.image}" alt="${product.name} — ${selectedVariant.color_name || ''}">`;
            main.querySelectorAll('.pdp-thumb').forEach((b) => b.classList.remove('active'));
          }
          applyVariantPrice();
        });
      });
      applyVariantPrice();
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
      const cartProduct = selectedVariant ? {
        ...product,
        slug: `${product.slug}::${selectedVariant.id}`,
        name: `${product.name} — ${selectedVariant.color_name || selectedVariant.variant_name}`,
        price: Number(product.price) + Number(selectedVariant.price_modifier || 0),
        images: selectedVariant.image_url ? [selectedVariant.image_url] : product.images,
      } : product;
      addToCart(cartProduct, qty);
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
    const related = products.filter((p) => p.slug !== product.slug).slice(0, 4);
    if (!related.length) return;
    grid.innerHTML = related.map(productCardHtml).join('');
    document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));
    section.style.display = '';
  } catch {
    // Related products are a nice-to-have; fail silently.
  }
}

function updateProductSeo(product, slug) {
  const url = `https://shop-xtra-pk.vercel.app/pages/product.html?slug=${encodeURIComponent(slug)}`;
  const description = (product.description || '').slice(0, 160) ||
    `${product.name} — authentic, PKR-priced, delivered nationwide across Pakistan with Cash on Delivery.`;
  const image = (product.images && product.images[0]) || 'https://shop-xtra-pk.vercel.app/assets/logo-full.png';

  const setMeta = (selector, attr, value) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
      if (selector.includes('rel="canonical"')) el.setAttribute('rel', 'canonical');
      else if (selector.includes('property=')) el.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
      else if (selector.includes('name=')) el.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', 'content', description);
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[property="og:title"]', 'content', `${product.name} — ShopXtra`);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:image"]', 'content', image);

  let jsonLd = document.getElementById('product-jsonld');
  if (!jsonLd) {
    jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.id = 'product-jsonld';
    document.head.appendChild(jsonLd);
  }
  jsonLd.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    image,
    sku: String(product.id),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: product.price,
      availability: Number(product.stock) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
    },
    ...(Number(product.review_count) > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.avg_rating,
        reviewCount: product.review_count,
      },
    } : {}),
  });
}

function animateReviewsSection() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || typeof gsap === 'undefined') return;

  const section = document.querySelector('.reviews-section-pdp');
  if (!section) return;

  const bars = gsap.utils.toArray('.reviews-bar-fill');
  const cards = gsap.utils.toArray('.review-card-v2');

  ScrollTrigger.create({
    trigger: section,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      bars.forEach((bar, i) => {
        gsap.to(bar, {
          width: `${bar.dataset.pct}%`,
          duration: 0.8,
          delay: i * 0.08,
          ease: 'power2.out',
        });
      });
      if (cards.length) {
        gsap.set(cards, { opacity: 0, y: 28, scale: 0.96 });
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'back.out(1.4)',
        });
      }
    },
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}

async function loadReviews(slug) {
  const summaryEl = document.getElementById('reviews-summary');
  const listEl = document.getElementById('reviews-list');
  const formSlot = document.getElementById('review-form-slot');

  try {
    const { reviews, average, count } = await apiGet(`/products/${encodeURIComponent(slug)}/reviews`);

    if (count > 0) {
      const breakdown = [5, 4, 3, 2, 1].map((star) => {
        const starCount = reviews.filter((r) => r.rating === star).length;
        const pct = Math.round((starCount / count) * 100);
        return `
          <div class="reviews-bar-row">
            <span>${star} star</span>
            <span class="reviews-bar-track"><span class="reviews-bar-fill" data-pct="${pct}" style="width:0%"></span></span>
            <span>${starCount}</span>
          </div>
        `;
      }).join('');

      summaryEl.innerHTML = `
        <div class="reviews-overview" id="reviews-summary-anchor">
          <div class="reviews-overview-score">
            <span class="reviews-overview-score-num">${average}</span>
            ${starsHtml(average, '1.1rem')}
            <span class="reviews-overview-score-count">Based on ${count} review${count === 1 ? '' : 's'}</span>
          </div>
          <div class="reviews-overview-bars">${breakdown}</div>
        </div>
      `;
    } else {
      summaryEl.innerHTML = '<p class="text-center" style="color:#6b5a58;">No reviews yet — be the first.</p>';
    }

    const inlineEl = document.getElementById('reviews-summary-inline');
    if (inlineEl) {
      inlineEl.innerHTML = count > 0
        ? `${starsHtml(average, '0.95rem')}<a href="#reviews-summary">${count} review${count === 1 ? '' : 's'}</a>`
        : `${starsHtml(0, '0.95rem')}<a href="#reviews-summary">Be the first to review</a>`;
    }

    listEl.innerHTML = reviews.map((r) => `
      <div class="review-card-v2" data-reveal="item">
        <span class="review-stars">${starsHtml(r.rating)}</span>
        ${r.comment ? `<p class="review-quote">"${r.comment}"</p>` : ''}
        <div class="review-author-row">
          <span class="review-avatar">${(r.user_name || '?').charAt(0).toUpperCase()}</span>
          <div class="d-flex flex-column">
            <span class="review-author-name">${r.user_name}</span>
            <span class="review-author-meta">Verified buyer · ${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    `).join('');

    animateReviewsSection();

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
