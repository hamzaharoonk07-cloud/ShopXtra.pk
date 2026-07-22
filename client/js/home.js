const CATEGORY_ICONS = {
  electrolytes: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h6v3.2l2.2 3.6a3 3 0 0 1 .5 1.7V24a3 3 0 0 1-3 3h-5.4a3 3 0 0 1-3-3V13.5a3 3 0 0 1 .5-1.7L13 8.2V5z"/><path d="M13 5V3.5h6V5"/><path d="M11.5 15.5h9"/><circle cx="16" cy="19.5" r="2.2"/></svg>`,
  coffee: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13h15v7a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6v-7z"/><path d="M22 15h2.2a3 3 0 0 1 0 6H22"/><path d="M4.5 27h20"/><path d="M12 6c0 1.3-1.3 1.3-1.3 2.6S12 10.5 12 11.8"/><path d="M17 6c0 1.3-1.3 1.3-1.3 2.6S17 10.5 17 11.8"/></svg>`,
  shampoo: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 5.5h7v3.3l2 3.3V26a2.3 2.3 0 0 1-2.3 2.3h-6.4a2.3 2.3 0 0 1-2.3-2.3V12.1l2-3.3V5.5z"/><path d="M12.5 5.5V4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1.5"/><path d="M10.5 16.5h11"/><path d="M13.5 21.3q2.5 2.4 5 0"/></svg>`,
  soaps: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="13" width="22" height="13" rx="5.5"/><path d="M8.5 13c0-3.3 2.3-5.5 7.5-5.5s7.5 2.2 7.5 5.5"/><path d="M10 18.7q6 3 12 0"/></svg>`,
  cosmetics: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 15h6v9.5a3 3 0 0 1-3 3a3 3 0 0 1-3-3V15z"/><path d="M13.4 15L14.3 8.2a1.8 1.8 0 0 1 3.4 0L18.6 15z"/><rect x="13" y="17.5" width="6" height="4.3" rx="0.6"/></svg>`,
};

function categoryIcon(slug) {
  return CATEGORY_ICONS[slug] || '';
}

const HOME_CATEGORIES = [
  { slug: 'electrolytes', name: 'Electrolytes', desc: 'Hydration that wakes you up faster than coffee.' },
  { slug: 'coffee', name: 'Coffee', desc: 'Rich roasts and cold brew for the daily ritual.' },
  { slug: 'shampoo', name: 'Shampoo', desc: 'Care that cleans without ever drying you out.' },
  { slug: 'soaps', name: 'Soaps', desc: 'Everyday bars for a clean, simple routine.' },
  { slug: 'cosmetics', name: 'Cosmetics', desc: 'Shades and finishes that match what you expect.' },
];

async function showSaleBannerIfAny() {
  const toastEl = document.getElementById('saleBannerToast');
  if (!toastEl) return;
  try {
    const banner = await apiGet('/banner/active');
    if (!banner) return;
    const dismissKey = `shopxtra_banner_dismissed_${banner.id}`;
    if (sessionStorage.getItem(dismissKey)) return;

    document.getElementById('saleBannerToastLabel').textContent = banner.title;
    document.getElementById('sale-banner-message').textContent = banner.message || '';
    const imageWrap = document.getElementById('sale-banner-image-wrap');
    imageWrap.innerHTML = banner.image_url ? `<img src="${banner.image_url}" alt="${banner.title}">` : '';
    const linkEl = document.getElementById('sale-banner-link');
    if (banner.link_url) {
      linkEl.href = banner.link_url;
      linkEl.classList.remove('d-none');
    } else {
      linkEl.classList.add('d-none');
    }

    const dismiss = () => {
      toastEl.classList.remove('visible');
      toastEl.setAttribute('aria-hidden', 'true');
      sessionStorage.setItem(dismissKey, '1');
    };
    document.getElementById('sale-banner-close').addEventListener('click', dismiss, { once: true });

    // Non-blocking: no backdrop, no scroll lock. Reveal only once the hero (and its
    // primary CTAs) has scrolled out of view, so the toast never sits on top of them.
    const reveal = () => {
      toastEl.classList.add('visible');
      toastEl.setAttribute('aria-hidden', 'false');
    };
    const heroEl = document.querySelector('.home-hero');
    if (heroEl && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) {
          reveal();
          observer.disconnect();
        }
      }, { threshold: 0 });
      observer.observe(heroEl);
    } else {
      setTimeout(reveal, 1400);
    }
  } catch {
    // No active banner or request failed; fail silently.
  }
}

function initHeroCarousel() {
  const track = document.getElementById('hero-carousel-track');
  const carousel = document.getElementById('hero-carousel');
  const dotsWrap = document.getElementById('hero-carousel-dots');
  const prevBtn = document.getElementById('hero-prev');
  const nextBtn = document.getElementById('hero-next');
  if (!track || !carousel) return;

  document.querySelectorAll('.hero-slide-icon[data-icon]').forEach((el) => {
    el.innerHTML = categoryIcon(el.dataset.icon);
  });

  const slides = Array.from(track.children);
  const dots = dotsWrap ? Array.from(dotsWrap.children) : [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => {
      d.classList.toggle('active', di === index);
      d.setAttribute('aria-selected', di === index ? 'true' : 'false');
    });
  }
  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function stopAutoplay() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function startAutoplay() {
    if (prefersReducedMotion || slides.length < 2) return;
    stopAutoplay();
    timer = setInterval(next, 5500);
  }

  prevBtn?.addEventListener('click', () => { prev(); startAutoplay(); });
  nextBtn?.addEventListener('click', () => { next(); startAutoplay(); });
  dots.forEach((dot, di) => dot.addEventListener('click', () => { goTo(di); startAutoplay(); }));

  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', startAutoplay);

  carousel.setAttribute('tabindex', '0');
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { prev(); startAutoplay(); }
    if (e.key === 'ArrowRight') { next(); startAutoplay(); }
  });

  let touchStartX = null;
  carousel.addEventListener('pointerdown', (e) => { touchStartX = e.clientX; });
  carousel.addEventListener('pointerup', (e) => {
    if (touchStartX === null) return;
    const delta = e.clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) next(); else prev();
    startAutoplay();
  });

  goTo(0);
  startAutoplay();
}

function renderBundlesVisual() {
  const el = document.getElementById('bundles-band-visual');
  if (!el) return;
  el.innerHTML = `
    <div class="bundle-visual-pair">
      <div class="bundle-visual-item">${productIllustration('shampoo')}</div>
      <span class="bundle-visual-plus">+</span>
      <div class="bundle-visual-item">${productIllustration('electrolytes')}</div>
    </div>
    <span class="mono bundle-visual-label">Midday Ritual Bundle</span>
  `;
}

function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;
  grid.innerHTML = HOME_CATEGORIES.map((c) => `
    <a href="/pages/shop.html?category=${c.slug}" class="category-tile category-tile-${c.slug}" data-reveal="item">
      <div class="category-tile-image">${categoryIcon(c.slug)}</div>
      <div class="category-tile-foot">
        <span class="category-tile-name">${c.name}</span>
        <p class="category-tile-desc">${c.desc}</p>
        <span class="category-tile-link">Shop &rarr;</span>
      </div>
    </a>
  `).join('');
}

function productCardSkeletonHtml() {
  return `
    <div class="product-card-skeleton">
      <div class="skeleton-block skeleton-image"></div>
      <div class="skeleton-block skeleton-line" style="width:40%;"></div>
      <div class="skeleton-block skeleton-line" style="width:75%;"></div>
      <div class="skeleton-block skeleton-line" style="width:35%;"></div>
    </div>
  `;
}

async function loadBestsellers() {
  const grid = document.getElementById('bestseller-grid');
  grid.innerHTML = Array(4).fill(productCardSkeletonHtml()).join('');
  try {
    const products = await apiGet('/products?sort=bestseller');
    const top = products.slice(0, 4);
    if (!top.length) {
      grid.innerHTML = '<p class="text-center py-5">No products yet.</p>';
      return;
    }
    grid.innerHTML = top.map(productCardHtml).join('');
    document.dispatchEvent(new CustomEvent('shopxtra:products-rendered'));
  } catch (err) {
    grid.innerHTML = `<p class="text-center py-5 text-danger">Could not load products: ${err.message}</p>`;
  }
}

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'newsletter-form') return;
  e.preventDefault();
  const emailInput = document.getElementById('newsletter-email');
  const msg = document.getElementById('newsletter-msg');
  try {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    msg.textContent = 'You\'re on the list — thank you!';
    msg.style.color = 'var(--tea-pink)';
    emailInput.value = '';
  } catch (err) {
    msg.textContent = err.message || 'Something went wrong.';
    msg.style.color = '#e8a5a0';
  }
});

initHeroCarousel();
renderCategoryGrid();
renderBundlesVisual();
loadBestsellers();
showSaleBannerIfAny();
