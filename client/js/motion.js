const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initNavbarScroll() {
  const nav = document.querySelector('.navbar-shopxtra');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initHeroDecorations() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const blob = document.createElement('div');
  blob.className = 'hero-gradient-blob';
  hero.prepend(blob);

  const glyphs = ['&#10022;', '&#10038;', '&#10022;'];
  const positions = [
    { top: '12%', left: '6%' },
    { top: '65%', left: '14%' },
    { top: '30%', left: '92%' },
  ];
  glyphs.forEach((glyph, i) => {
    const span = document.createElement('span');
    span.className = `hero-sparkle s${i + 1}`;
    span.style.top = positions[i].top;
    span.style.left = positions[i].left;
    span.style.fontSize = i === 1 ? '1rem' : '1.6rem';
    span.innerHTML = glyph;
    span.setAttribute('aria-hidden', 'true');
    hero.appendChild(span);
  });

  // Mouse parallax: blob + sparkles drift toward the cursor with lerped easing.
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });
  hero.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

  function raf() {
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;
    blob.style.transform = `translate(${curX * 24}px, ${curY * 24}px)`;
    hero.querySelectorAll('.hero-sparkle').forEach((s, i) => {
      const depth = (i + 1) * 6;
      s.style.marginLeft = `${curX * depth}px`;
      s.style.marginTop = `${curY * depth}px`;
    });
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

function initMagneticButtons() {
  document.querySelectorAll('.btn-plum:not(.btn-sm), .btn-outline-plum:not(.btn-sm)').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      btn.style.transform = `translate(${px * 10}px, ${py * 8}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

function initPageTransitions() {
  if (typeof gsap === 'undefined') return;

  // No entry fade here: the full-page loader (#page-loader, a child of body)
  // already covers the page while assets load and reveals it via its own
  // fade-out. Fading body from opacity 0 as well made the loader itself
  // invisible for that same stretch (opacity on an ancestor composites the
  // whole subtree) - page flashed unstyled, then the loader popped in, then
  // out. The page underneath just renders normally; only the click-driven
  // exit transition below needs body opacity.

  // Clicking a link fades the body to opacity 0 before navigating away (see
  // below). If the browser restores THIS page from its back-forward cache
  // (hitting Back/Forward instead of a fresh load), it restores the DOM
  // exactly as it was left - mid-fade, stuck at opacity 0 - which looks like
  // the page is frozen/blank. pageshow with persisted=true fires on every
  // bfcache restore, so force it visible again there.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) gsap.set(document.body, { opacity: 1 });
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let url;
    try { url = new URL(link.href, window.location.href); } catch { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.hash) return;

    e.preventDefault();
    gsap.to(document.body, {
      opacity: 0,
      duration: 0.28,
      ease: 'power1.in',
      onComplete: () => { window.location.href = link.href; },
    });
  });
}

function initCounters() {
  if (typeof gsap === 'undefined') return;
  gsap.utils.toArray('[data-counter]').forEach((el) => {
    const target = Number(el.dataset.counter);
    const suffix = el.dataset.counterSuffix || '';
    const counter = { value: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 95%',
      once: true,
      onEnter: () => {
        // The HTML already shows the real final number so it's correct even
        // if this script never runs (slow connection, crawler) - only reset
        // to 0 right before the count-up animation actually starts.
        el.textContent = '0';
        gsap.to(counter, {
          value: target,
          duration: 1.4,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = Math.round(counter.value).toLocaleString('en-US') + suffix; },
        });
      },
    });
  });
}

function initGsapAnimations() {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const heroTargets = gsap.utils.toArray('[data-reveal="hero"]');
  if (heroTargets.length) {
    gsap.set(heroTargets, { opacity: 0, y: 34, scale: 0.97 });
    gsap.to(heroTargets, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.9,
      stagger: 0.13,
      ease: 'power3.out',
      delay: 0.2,
    });
    // The hero is the very first thing on the page - if this tween never
    // completes (backgrounded tab throttling rAF, a slow/low-power device,
    // anything), the headline/eyebrow/CTA stay invisible forever with
    // nothing else on the page to trigger the general safety net below.
    // Force them visible unconditionally after a short, generous timeout.
    setTimeout(() => {
      heroTargets.forEach((el) => {
        if (parseFloat(getComputedStyle(el).opacity) < 1) {
          gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: 'transform' });
        }
      });
    }, 1800);
  }

  // Elements already scrolled past (e.g. browser scroll-restoration jumping straight
  // to a saved position on reload) never cross the scroll-trigger threshold, so they'd
  // stay stuck at their hidden state forever. Show those immediately instead of animating.
  const alreadyPastFold = (el) => el.getBoundingClientRect().top < window.innerHeight;

  gsap.utils.toArray('[data-reveal="up"]').forEach((el) => {
    if (alreadyPastFold(el)) return;
    gsap.set(el, { opacity: 0, y: 36, scale: 0.97 });
    gsap.to(el, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 100%' },
    });
  });

  gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
    const items = group.querySelectorAll('[data-reveal="item"]');
    if (!items.length || alreadyPastFold(group)) return;
    gsap.set(items, { opacity: 0, y: 32, scale: 0.96 });
    gsap.to(items, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.7,
      stagger: 0.1,
      ease: 'back.out(1.4)',
      scrollTrigger: { trigger: group, start: 'top 100%' },
    });
  });

  const ritualLine = document.querySelector('.ritual-line-track');
  if (ritualLine) {
    gsap.to(ritualLine, {
      scaleX: 1,
      duration: 1,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: ritualLine, start: 'top 100%' },
    });
  }

  initCounters();

  // Safety net: if a reveal element is visible on screen but its animation never
  // fired (layout shifted after fonts/images loaded, scroll restoration, etc.),
  // force it to its final visible state rather than leaving it stuck hidden.
  const forceStuckRevealsVisible = () => {
    document.querySelectorAll('[data-reveal="up"], [data-reveal-group] [data-reveal="item"], [data-reveal="hero"]').forEach((el) => {
      const style = getComputedStyle(el);
      if (parseFloat(style.opacity) < 1 && el.getBoundingClientRect().top < window.innerHeight) {
        gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out', overwrite: true });
      }
    });
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
      forceStuckRevealsVisible();
    });
  }
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    setTimeout(forceStuckRevealsVisible, 300);
  });
}

function initFaqAccordion() {
  if (typeof gsap === 'undefined') return;
  document.querySelectorAll('.faq-accordion details').forEach((details) => {
    if (details.dataset.faqBound) return;
    details.dataset.faqBound = 'true';
    const summary = details.querySelector('summary');
    const content = details.querySelector('p');
    if (!summary || !content) return;
    let animating = false;

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (animating) return;
      animating = true;

      if (details.open) {
        gsap.to(content, {
          height: 0,
          opacity: 0,
          marginTop: 0,
          duration: 0.26,
          ease: 'power2.inOut',
          onComplete: () => {
            details.open = false;
            gsap.set(content, { clearProps: 'height,opacity,marginTop,overflow' });
            animating = false;
          },
        });
      } else {
        details.open = true;
        const targetHeight = content.scrollHeight;
        gsap.fromTo(
          content,
          { height: 0, opacity: 0, marginTop: 0, overflow: 'hidden' },
          {
            height: targetHeight,
            opacity: 1,
            marginTop: '0.75rem',
            duration: 0.32,
            ease: 'power2.out',
            onComplete: () => {
              gsap.set(content, { clearProps: 'height,opacity,marginTop,overflow' });
              animating = false;
            },
          }
        );
      }
    });
  });
}

function initProductTilt() {
  document.querySelectorAll('.product-card').forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = 'true';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${py * -7}deg) rotateY(${px * 7}deg) translateY(-6px) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function flyToCart(originEl) {
  const cartIcon = document.querySelector('a.icon-link[aria-label="Cart"]');
  if (!originEl || !cartIcon) {
    pulseCartBadge();
    return;
  }
  if (prefersReducedMotion || typeof gsap === 'undefined') {
    pulseCartBadge();
    return;
  }

  const originRect = originEl.getBoundingClientRect();
  const targetRect = cartIcon.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'fly-to-cart-dot';
  document.body.appendChild(flyer);

  const startX = originRect.left + originRect.width / 2;
  const startY = originRect.top + originRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  gsap.set(flyer, { x: startX, y: startY, opacity: 1, scale: 1 });
  gsap.to(flyer, {
    x: endX,
    y: endY,
    scale: 0.2,
    duration: 0.7,
    ease: 'power2.in',
    onUpdate: function () {
      const p = this.progress();
      const arc = Math.sin(p * Math.PI) * -60;
      flyer.style.transform += ` translateY(${arc}px)`;
    },
    onComplete: () => {
      flyer.remove();
      pulseCartBadge();
    },
  });
  gsap.to(flyer, { opacity: 0, duration: 0.25, delay: 0.45 });
}

function bounceButton(btn) {
  if (!btn || prefersReducedMotion) return;
  btn.classList.remove('btn-bounce');
  void btn.offsetWidth;
  btn.classList.add('btn-bounce');
}

function pulseCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  if (!badge || prefersReducedMotion) return;
  badge.classList.remove('badge-pulse');
  void badge.offsetWidth;
  badge.classList.add('badge-pulse');
}

let cartToastTimer = null;
function showCartToast(product) {
  let toast = document.getElementById('cart-added-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cart-added-toast';
    toast.className = 'cart-added-toast';
    document.body.appendChild(toast);
  }
  const image = product.images && product.images[0];
  toast.innerHTML = `
    ${image ? `<img src="${thumbSrc(image)}" ${thumbFallbackAttr(image)} alt="" decoding="async" class="cart-added-toast-img">` : '<span class="cart-added-toast-check">&#10003;</span>'}
    <span class="cart-added-toast-text"><strong>${product.name}</strong> added to cart</span>
  `;
  clearTimeout(cartToastTimer);
  toast.classList.remove('visible');
  void toast.offsetWidth;
  toast.classList.add('visible');
  cartToastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  if (prefersReducedMotion) return;
  initPageTransitions();
  initHeroDecorations();
  initGsapAnimations();
  initProductTilt();
  initMagneticButtons();
  initFaqAccordion();
});

document.addEventListener('shopxtra:products-rendered', () => {
  if (prefersReducedMotion) return;
  initProductTilt();
  if (typeof gsap !== 'undefined') {
    gsap.utils.toArray('[data-reveal-group] [data-reveal="item"]:has(.product-card)').forEach((el) => {
      if (el.dataset.revealed) return;
      el.dataset.revealed = 'true';
      gsap.from(el, { opacity: 0, y: 28, scale: 0.96, duration: 0.6, ease: 'back.out(1.4)' });
    });
  }
});
