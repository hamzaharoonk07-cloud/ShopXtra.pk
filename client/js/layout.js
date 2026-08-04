const PAGE_LOADER_MESSAGES = [
  'Getting your essentials ready...',
  'Hydration, coffee, care & glow...',
  'Packing in authentic quality...',
  'Almost there...',
];

function renderPageLoader() {
  return `
    <div class="page-loader" id="page-loader">
      <div class="page-loader-inner">
        <div class="page-loader-logo-wrap">
          <img src="/assets/logo-full.png" alt="ShopXtra" class="page-loader-logo page-loader-logo-base">
          <img src="/assets/logo-full.png" alt="" aria-hidden="true" class="page-loader-logo page-loader-logo-fill">
        </div>
        <p class="page-loader-text" id="page-loader-text">${PAGE_LOADER_MESSAGES[0]}</p>
      </div>
    </div>
  `;
}

let pageLoaderTextTimer = null;

function startPageLoaderText() {
  const el = document.getElementById('page-loader-text');
  if (!el) return;
  let i = 0;
  pageLoaderTextTimer = setInterval(() => {
    i = (i + 1) % PAGE_LOADER_MESSAGES.length;
    el.classList.add('is-swapping');
    setTimeout(() => {
      el.textContent = PAGE_LOADER_MESSAGES[i];
      el.classList.remove('is-swapping');
    }, 200);
  }, 1600);
}

function hidePageLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  if (pageLoaderTextTimer) {
    clearInterval(pageLoaderTextTimer);
    pageLoaderTextTimer = null;
  }
  loader.classList.add('is-hidden');
  setTimeout(() => loader.remove(), 500);
}

function initPageLoader() {
  const slot = document.getElementById('page-loader-slot');
  if (!slot) return;
  slot.innerHTML = renderPageLoader();
  startPageLoaderText();
  if (document.readyState === 'complete') {
    hidePageLoader();
    return;
  }
  window.addEventListener('load', hidePageLoader);
  setTimeout(hidePageLoader, 6000);
}

initPageLoader();

function renderAnnouncementBar() {
  const items = `
    <span>Cash on Delivery nationwide</span>
    <span class="dot" aria-hidden="true">&#8226;</span>
    <span class="announcement-highlight">Free delivery over Rs 3,000</span>
    <span class="dot" aria-hidden="true">&#8226;</span>
    <span>Imported &amp; authentic products</span>
    <span class="dot" aria-hidden="true">&#8226;</span>
  `;
  return `
    <div class="announcement-bar">
      <div class="announcement-marquee">
        <div class="announcement-marquee-track">
          ${items}${items}
        </div>
      </div>
    </div>
  `;
}

function renderCategoryDropdownItem(category, label) {
  return `
    <li class="nav-dropdown" data-category="${category}">
      <span class="nav-dropdown-trigger">
        <a href="/pages/shop.html?category=${category}">${label}</a>
        <button type="button" class="nav-dropdown-caret" aria-expanded="false" aria-haspopup="true" aria-label="Show ${label} products">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </span>
      <div class="nav-dropdown-menu" role="menu"></div>
    </li>
  `;
}

function renderNavbar(activePath = '') {
  return `
    ${renderAnnouncementBar()}
    <nav class="navbar-shopxtra">
      <div class="navbar-top container">
        <a class="navbar-brand" href="/index.html">
          <img src="/assets/logo-full.png" alt="ShopXtra" class="logo-img">
        </a>

        <button class="navbar-toggler-dm" type="button" data-bs-toggle="collapse" data-bs-target="#navLinksRow"
          aria-controls="navLinksRow" aria-expanded="false" aria-label="Toggle navigation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div class="collapse navbar-links-collapse" id="navLinksRow">
          <ul class="navbar-links-row">
            <li><a href="/pages/shop.html">Shop all</a></li>
            ${renderCategoryDropdownItem('electrolytes', 'Electrolytes')}
            ${renderCategoryDropdownItem('coffee', 'Coffee')}
            ${renderCategoryDropdownItem('shampoo', 'Shampoo')}
            ${renderCategoryDropdownItem('cosmetics', 'Cosmetics')}
            <li><a href="/pages/bundles.html">Bundles</a></li>
            <li><a href="/pages/why-shopxtra.html">Why Us</a></li>
          </ul>
        </div>

        <div class="navbar-top-right">
          <a href="/pages/track-order.html" class="nav-icon-btn" aria-label="Track order">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="1" y="6" width="14" height="11" rx="1.5"/><path d="M15 10h4l3 3.5V17h-7z"/><circle cx="6.5" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/>
            </svg>
          </a>
          <a href="/pages/account.html" class="nav-icon-btn" aria-label="Account">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5"/>
            </svg>
          </a>
          <button type="button" class="nav-icon-btn" id="nav-search-toggle" aria-label="Search" aria-expanded="false" aria-controls="navSearchRow">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
            </svg>
          </button>
          <a href="/pages/cart.html" class="nav-bag-btn" aria-label="Cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span id="cart-count-badge">0</span>
          </a>
        </div>
      </div>

      <div class="navbar-search-row" id="navSearchRow">
        <div class="container">
          <div class="nav-search-wrap position-relative">
            <span class="nav-search-icon" aria-hidden="true">&#8981;</span>
            <input type="search" id="nav-search-input" placeholder="Search products"
              aria-label="Search products" autocomplete="off">
            <div id="nav-search-results" class="d-none"></div>
          </div>
        </div>
      </div>
    </nav>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-main">
        <div class="footer-brand-col">
          <div class="footer-brand-row">
            <img src="/assets/logo-full.png" alt="ShopXtra" class="logo-img logo-img-footer">
          </div>
          <p>Everyday essentials that are imported, authentic, and PKR-priced. Look after yourself, every single day.</p>
          <div class="footer-brand-stats">
            <span>&#9733; 4.8 rated</span>
            <span>3,000+ orders</span>
          </div>
        </div>
        <div class="footer-col">
          <h4>Shop</h4>
          <a href="/pages/shop.html?category=electrolytes">Electrolytes</a>
          <a href="/pages/shop.html?category=coffee">Coffee</a>
          <a href="/pages/shop.html?category=shampoo">Shampoo</a>
          <a href="/pages/shop.html?category=cosmetics">Cosmetics</a>
        </div>
        <div class="footer-col">
          <h4>Help</h4>
          <a href="/pages/track-order.html">Track order</a>
          <a href="/pages/contact.html">Contact us</a>
          <a href="/pages/account.html">Your account</a>
          <a href="/pages/bundles.html">Kits &amp; bundles</a>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <a href="/pages/privacy-policy.html">Privacy policy</a>
          <a href="/pages/terms-and-conditions.html">Terms &amp; conditions</a>
          <a href="/pages/return-refund-policy.html">Return &amp; refund policy</a>
          <a href="/pages/shipping-policy.html">Shipping policy</a>
          <a href="/pages/cancellation-policy.html">Cancellation policy</a>
        </div>
        <div class="footer-col">
          <h4>Store information</h4>
          <p style="color:#A8BFA3; font-size:0.85rem; line-height:1.55; margin:0 0 0.9rem;">Authentic products, sourced and sold with transparency and quality you can trust.</p>
          <p style="margin:0 0 0.35rem;"><strong style="color:#fff;">Phone:</strong> <a href="tel:+923272255447" style="display:inline; padding:0;">+92 327 2255447</a></p>
          <p style="margin:0;"><strong style="color:#fff;">Email:</strong> <a href="mailto:shopxtra9@gmail.com" style="display:inline; padding:0;">shopxtra9@gmail.com</a></p>
        </div>
        <div class="footer-col footer-newsletter-col">
          <h4>Stay in the loop</h4>
          <p>New drops and kit deals, no spam.</p>
          <form id="newsletter-form" class="footer-newsletter-form" novalidate>
            <input type="email" id="newsletter-email" placeholder="Email address" required aria-label="Email address">
            <button type="submit">Join</button>
          </form>
          <p id="newsletter-msg" role="status" style="margin: 0.5rem 0 0; font-size: 0.8rem;"></p>
        </div>
      </div>
      <div class="footer-bottom-bar">
        <span>&copy; 2026 ShopXtra &middot; Made in Pakistan for Pakistan</span>
        <span>Cash on Delivery &middot; 5&ndash;7 day nationwide delivery</span>
      </div>
    </footer>
  `;
}

const SHOPXTRA_WHATSAPP_NUMBER = '923272255447';

function whatsappLink(message) {
  const text = message || "Hi ShopXtra, I'd like to ask about an order.";
  return `https://wa.me/${SHOPXTRA_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function renderWhatsAppFloat() {
  const a = document.createElement('a');
  a.href = whatsappLink();
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'whatsapp-float';
  a.setAttribute('aria-label', 'Chat with us on WhatsApp');
  a.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.6-.4z"/>
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5.1-1.3A9.9 9.9 0 0 0 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 20.2 12 8.2 8.2 0 0 1 12 20.2z"/>
    </svg>
  `;
  document.body.appendChild(a);
}

function renderBackToTop() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
    </svg>
  `;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(btn);

  const onScroll = () => btn.classList.toggle('visible', window.scrollY > 600);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

const NAV_CATEGORY_SUBGROUPS = {
  shampoo: [
    { label: 'Shampoo Bars', match: (name) => /^(Rosemary Shampoo|Rice Shampoo|Baby Soap)/i.test(name) },
    { label: 'Pods', match: (name) => /^Laundry Pods/i.test(name) },
  ],
};

function renderNavDropdownItems(category, items) {
  const subgroups = NAV_CATEGORY_SUBGROUPS[category] || [];
  const remaining = [...items];
  let html = '';

  subgroups.forEach((group) => {
    const matched = [];
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (group.match(remaining[i].name)) matched.unshift(...remaining.splice(i, 1));
    }
    if (!matched.length) return;
    html += `<span class="nav-dropdown-subhead">${group.label}</span>`;
    html += matched.map((p) => `<a href="/pages/product.html?slug=${encodeURIComponent(p.slug)}" class="nav-dropdown-item" role="menuitem">${p.name}</a>`).join('');
  });

  html += remaining.map((p) => `<a href="/pages/product.html?slug=${encodeURIComponent(p.slug)}" class="nav-dropdown-item" role="menuitem">${p.name}</a>`).join('');
  return html;
}

function initNavCategoryDropdowns() {
  const dropdowns = document.querySelectorAll('.nav-dropdown[data-category]');
  if (!dropdowns.length) return;

  let productsByCategory = null;
  async function loadProductsByCategory() {
    if (productsByCategory) return productsByCategory;
    const products = await apiGet('/products');
    productsByCategory = {};
    products.forEach((p) => {
      (productsByCategory[p.category] || (productsByCategory[p.category] = [])).push(p);
    });
    return productsByCategory;
  }

  const navLinksRow = document.querySelector('.navbar-links-row');

  function closeAll() {
    dropdowns.forEach((li) => {
      li.querySelector('.nav-dropdown-menu')?.classList.remove('is-open');
      li.querySelector('.nav-dropdown-caret')?.setAttribute('aria-expanded', 'false');
    });
    navLinksRow?.classList.remove('has-open-dropdown');
  }

  dropdowns.forEach((li) => {
    const category = li.dataset.category;
    const caret = li.querySelector('.nav-dropdown-caret');
    const menu = li.querySelector('.nav-dropdown-menu');
    if (!caret || !menu) return;

    caret.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wasOpen = menu.classList.contains('is-open');
      closeAll();
      if (wasOpen) return;

      if (!menu.dataset.loaded) {
        menu.innerHTML = '<span class="nav-dropdown-loading">Loading&hellip;</span>';
        menu.classList.add('is-open');
        caret.setAttribute('aria-expanded', 'true');
        navLinksRow?.classList.add('has-open-dropdown');
        try {
          const byCategory = await loadProductsByCategory();
          const items = byCategory[category] || [];
          menu.innerHTML = items.length
            ? renderNavDropdownItems(category, items)
              + `<a href="/pages/shop.html?category=${encodeURIComponent(category)}" class="nav-dropdown-viewall" role="menuitem">View all &rarr;</a>`
            : '<span class="nav-dropdown-empty">No products yet</span>';
          menu.dataset.loaded = 'true';
        } catch {
          menu.innerHTML = '<span class="nav-dropdown-empty">Couldn&rsquo;t load products</span>';
        }
        return;
      }

      menu.classList.add('is-open');
      caret.setAttribute('aria-expanded', 'true');
      navLinksRow?.classList.add('has-open-dropdown');
    });
  });

  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
}

function initNavSearchToggle() {
  const toggle = document.getElementById('nav-search-toggle');
  const row = document.getElementById('navSearchRow');
  if (!toggle || !row) return;
  toggle.addEventListener('click', () => {
    const open = row.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) row.querySelector('#nav-search-input')?.focus();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const navSlot = document.getElementById('navbar-slot');
  const footerSlot = document.getElementById('footer-slot');
  if (navSlot) navSlot.innerHTML = renderNavbar();
  if (footerSlot) footerSlot.innerHTML = renderFooter();
  renderWhatsAppFloat();
  renderBackToTop();
  initNavSearchToggle();
  initNavCategoryDropdowns();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.password-toggle-btn');
  if (!btn) return;
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  btn.classList.toggle('is-active', !showing);
});

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
    msg.textContent = body.emailSent === false
      ? 'You\'re on the list, but the welcome email couldn\'t be sent - check back later.'
      : 'You\'re on the list. Thank you!';
    msg.style.color = 'var(--tea-pink)';
    emailInput.value = '';
  } catch (err) {
    msg.textContent = err.message || 'Something went wrong.';
    msg.style.color = '#e8a5a0';
  }
});
