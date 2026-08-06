const CATEGORY_ICONS = {
  electrolytes: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h6v3.2l2.2 3.6a3 3 0 0 1 .5 1.7V24a3 3 0 0 1-3 3h-5.4a3 3 0 0 1-3-3V13.5a3 3 0 0 1 .5-1.7L13 8.2V5z"/><path d="M13 5V3.5h6V5"/><path d="M11.5 15.5h9"/><circle cx="16" cy="19.5" r="2.2"/></svg>`,
  coffee: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13h15v7a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6v-7z"/><path d="M22 15h2.2a3 3 0 0 1 0 6H22"/><path d="M4.5 27h20"/><path d="M12 6c0 1.3-1.3 1.3-1.3 2.6S12 10.5 12 11.8"/><path d="M17 6c0 1.3-1.3 1.3-1.3 2.6S17 10.5 17 11.8"/></svg>`,
  shampoo: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="13" width="22" height="13" rx="5.5"/><path d="M8.5 13c0-3.3 2.3-5.5 7.5-5.5s7.5 2.2 7.5 5.5"/><path d="M10 18.7q6 3 12 0"/></svg>`,
  cosmetics: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 15h6v9.5a3 3 0 0 1-3 3a3 3 0 0 1-3-3V15z"/><path d="M13.4 15L14.3 8.2a1.8 1.8 0 0 1 3.4 0L18.6 15z"/><rect x="13" y="17.5" width="6" height="4.3" rx="0.6"/></svg>`,
};

function categoryIcon(slug) {
  return CATEGORY_ICONS[slug] || '';
}

const HOME_CATEGORIES = [
  { slug: 'electrolytes', name: 'Electrolytes', desc: 'Wake up faster, stay hydrated with green apple, peach, pineapple &amp; strawberry. Imported electrolytes.', image: '/assets/hero/electrolytes-category.webp', hoverImage: '/assets/hero/electrolytes-flavors.jpg' },
  { slug: 'coffee', name: 'Coffee', desc: 'Rich roast, one scoop away. Instant coffee that actually tastes brewed, over ice or milk.', image: '/assets/hero/coffee-pour.jpg' },
  { slug: 'shampoo', name: 'Shampoo', desc: "Clean that doesn't dry you out. Shampoo bars for an everyday routine that actually works." },
  { slug: 'cosmetics', name: 'Cosmetics', desc: 'Shades that match what you expect. Authentic cosmetics, delivered nationwide with Cash on Delivery.' },
];

function applyCategoryImagesFromProducts(products) {
  HOME_CATEGORIES.forEach((c) => {
    const inCategory = products.filter((p) => p.category === c.slug && p.images && p.images[0]);
    if (!c.image && inCategory[0]) c.image = inCategory[0].images[0];
    if (!c.hoverImage) {
      const sameProduct = inCategory.find((p) => p.images[0] === c.image && p.images[1]);
      const otherProduct = inCategory.find((p) => p.images[0] !== c.image);
      c.hoverImage = (sameProduct && sameProduct.images[1]) || (otherProduct && otherProduct.images[0]) || null;
    }
  });
  renderCategoryGrid();
}

async function showSaleBannerIfAny() {
  const toastEl = document.getElementById('saleBannerToast');
  const backdropEl = document.getElementById('saleBannerBackdrop');
  if (!toastEl) return false;
  try {
    const banner = await apiGet('/banner/active');
    if (!banner) return false;
    const dismissKey = `shopxtra_banner_dismissed_${banner.id}`;
    if (sessionStorage.getItem(dismissKey)) return false;

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
      if (backdropEl) {
        backdropEl.classList.remove('visible');
        backdropEl.setAttribute('aria-hidden', 'true');
      }
      sessionStorage.setItem(dismissKey, '1');
    };
    document.getElementById('sale-banner-close').addEventListener('click', dismiss, { once: true });
    if (backdropEl) backdropEl.addEventListener('click', dismiss, { once: true });

    // Centered, full-size banner: reveal shortly after load with a dimming backdrop.
    const reveal = () => {
      toastEl.classList.add('visible');
      toastEl.setAttribute('aria-hidden', 'false');
      if (backdropEl) {
        backdropEl.classList.add('visible');
        backdropEl.setAttribute('aria-hidden', 'false');
      }
    };
    setTimeout(reveal, 900);
    return true;
  } catch {
    // No active banner or request failed; fail silently.
    return false;
  }
}

function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;
  grid.innerHTML = HOME_CATEGORIES.map((c) => `
    <a href="/pages/shop.html?category=${c.slug}" class="category-tile category-tile-${c.slug}" data-reveal="item">
      <div class="category-tile-image">
        ${c.image ? `<img src="${thumbSrc(c.image)}" ${thumbFallbackAttr(c.image)} alt="" loading="lazy" decoding="async">` : categoryIcon(c.slug)}
        ${c.hoverImage ? `<img src="${thumbSrc(c.hoverImage)}" ${thumbFallbackAttr(c.hoverImage)} alt="" loading="lazy" decoding="async" class="category-tile-image-hover">` : ''}
      </div>
      <div class="category-tile-foot">
        <span class="category-tile-name">${c.name}</span>
        <p class="category-tile-desc">${c.desc}</p>
        <span class="category-tile-link">Shop &rarr;</span>
      </div>
    </a>
  `).join('');
}

async function loadCategoryImages() {
  try {
    const products = await apiGet('/products');
    applyCategoryImagesFromProducts(products);
  } catch {
    // Static category images from HOME_CATEGORIES stay as the fallback.
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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;

  // Only slide 0's video has a real src on page load - the other 3 (~6MB
  // combined) were all downloading simultaneously on every homepage visit
  // regardless of which slide was visible, which was a big chunk of the
  // "loading feels slow" complaint. Load each slide's video source lazily,
  // right before it's needed, and pre-fetch the next one for a smooth switch.
  function ensureVideoLoaded(slide) {
    const video = slide?.querySelector('video');
    const source = video?.querySelector('source[data-src]');
    if (!source) return;
    source.src = source.dataset.src;
    delete source.dataset.src;
    video.load();
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => {
      d.classList.toggle('active', di === index);
      d.setAttribute('aria-selected', di === index ? 'true' : 'false');
    });
    ensureVideoLoaded(slides[index]);
    ensureVideoLoaded(slides[(index + 1) % slides.length]);
    slides.forEach((slide, si) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (si === index) {
        // The video's src was just set (ensureVideoLoaded -> load()) - on a
        // slow connection (mobile) there's no buffered data yet, so calling
        // play() immediately fails silently and the video never starts,
        // leaving the slide's plain dark background showing (looks black).
        // Retry once real data is actually available.
        const tryPlay = () => video.play().catch(() => {});
        tryPlay();
        if (video.readyState < 2) video.addEventListener('canplay', tryPlay, { once: true });
      } else {
        video.pause();
      }
    });
  }
  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function stopAutoplay() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function startAutoplay() {
    if (reduceMotion || slides.length < 2) return;
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

function initSiteBgVideo() {
  const wrap = document.getElementById('site-bg-video-wrap');
  if (!wrap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const videos = Array.from(wrap.querySelectorAll('.site-bg-video'));
  if (!videos.length) return;
  videos.forEach((v) => { v.loop = true; });

  function ensureLoaded(video) {
    if (!video.dataset.src) return;
    const source = document.createElement('source');
    source.src = video.dataset.src;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.load();
    delete video.dataset.src;
  }

  let activeIndex = 0;
  videos[0].play().catch(() => {});
  if (videos[1]) ensureLoaded(videos[1]);

  function setActive(i) {
    if (i === activeIndex) return;
    videos[activeIndex].classList.remove('active');
    videos[activeIndex].pause();
    ensureLoaded(videos[i]);
    videos[i].classList.add('active');
    videos[i].play().catch(() => {});
    activeIndex = i;
    if (videos[i + 1]) ensureLoaded(videos[i + 1]);
  }

  // Reading scrollHeight forces a layout reflow, so it's cached here and
  // only recomputed on resize/content-load - not on every scroll tick,
  // which was causing layout thrashing (and visible video jank) on scroll.
  let maxScroll = 0;
  function recalcMaxScroll() {
    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  recalcMaxScroll();
  window.addEventListener('resize', recalcMaxScroll, { passive: true });
  window.addEventListener('load', recalcMaxScroll);
  document.addEventListener('shopxtra:products-rendered', recalcMaxScroll);

  function updateFromScroll() {
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    const segment = Math.min(videos.length - 1, Math.floor(progress * videos.length));
    setActive(segment);
    if (videos[segment].paused) videos[segment].play().catch(() => {});
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateFromScroll(); ticking = false; });
  }, { passive: true });

  updateFromScroll();
}

initSiteBgVideo();
renderCategoryGrid();
loadCategoryImages();
showSaleBannerIfAny();
