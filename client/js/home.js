const CATEGORY_ICONS = {
  electrolytes: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4c4 6 8 11.5 8 16.5A8 8 0 0 1 8 20.5C8 15.5 12 10 16 4z"/></svg>`,
  coffee: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11h16v9a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-9z"/><path d="M22 13h2a3 3 0 0 1 0 6h-2"/><path d="M11 6c0 1.2-1 1.2-1 2.4S11 9.6 11 10.8"/><path d="M16 6c0 1.2-1 1.2-1 2.4S16 9.6 16 10.8"/></svg>`,
  shampoo: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 6h6v3.5l2 3V26a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V12.5l2-3V6z"/><path d="M13 6V4h6v2"/><line x1="11" y1="17" x2="21" y2="17"/></svg>`,
  soaps: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="12" width="22" height="14" rx="5"/><path d="M9 12c0-3 2-5 7-5s7 2 7 5"/></svg>`,
  cosmetics: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 14h6v10a3 3 0 0 1-3 3a3 3 0 0 1-3-3V14z"/><path d="M14 14V9a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5"/></svg>`,
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
