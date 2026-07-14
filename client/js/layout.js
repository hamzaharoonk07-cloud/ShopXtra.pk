function renderAnnouncementBar() {
  const items = `
    <span>Free COD on every order</span>
    <span class="dot" aria-hidden="true">&#8226;</span>
    <span>Use <strong>RITUAL10</strong> for 10% off any Ritual Bundle</span>
    <span class="dot" aria-hidden="true">&#8226;</span>
    <span>Nationwide delivery across Pakistan</span>
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

function renderNavbar(activePath = '') {
  return `
    ${renderAnnouncementBar()}
    <nav class="navbar navbar-expand-lg navbar-shopxtra">
      <div class="container">
        <a class="navbar-brand" href="/index.html">
          <img src="/assets/logo-full.png" alt="ShopXtra" class="logo-img">
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain"
          aria-controls="navMain" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMain">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" href="/pages/shop.html">Shop</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/bundles.html">Bundles</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/shop.html?category=electrolytes">Electrolytes</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/shop.html?category=coffee">Coffee</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/shop.html?category=shampoo">Shampoo</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/shop.html?category=soaps">Soaps</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/shop.html?category=cosmetics">Cosmetics</a></li>
          </ul>
          <div class="d-flex gap-3 align-items-center position-relative">
            <div class="position-relative">
              <input type="search" id="nav-search-input" class="form-control form-control-sm" placeholder="Search…"
                style="width: 180px; border-radius: 999px;" aria-label="Search products" autocomplete="off">
              <div id="nav-search-results" class="d-none"></div>
            </div>
            <a href="/pages/track-order.html" class="icon-link" aria-label="Track order">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="1" y="6" width="14" height="11" rx="1.5"/><path d="M15 10h4l3 3.5V17h-7z"/><circle cx="6.5" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/>
              </svg>
            </a>
            <a href="/pages/account.html" class="icon-link" aria-label="Account">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5"/>
              </svg>
            </a>
            <a href="/pages/cart.html" class="icon-link position-relative" aria-label="Cart">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 8V6a6 6 0 0 1 12 0v2"/>
                <rect x="3.5" y="8" width="17" height="13" rx="2.5"/>
              </svg>
              <span id="cart-count-badge" class="badge rounded-pill" style="background-color: var(--tea-pink); color: var(--plum); font-size: 0.65rem; vertical-align: top;">0</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-newsletter-row">
          <div class="footer-newsletter-copy">
            <h3>Join the list</h3>
            <p>Early access to new drops and kit discounts. No spam.</p>
          </div>
          <div>
            <form id="newsletter-form" class="footer-newsletter-form" novalidate>
              <input type="email" id="newsletter-email" placeholder="Your email address" required aria-label="Email address">
              <button type="submit">Subscribe</button>
            </form>
            <p id="newsletter-msg" role="status" style="margin: 0.5rem 0 0; font-size: 0.8rem;"></p>
          </div>
        </div>

        <div class="footer-link-grid">
          <div>
            <img src="/assets/logo-full.png" alt="ShopXtra" class="logo-img logo-img-footer mb-2">
            <p style="max-width: 30ch; color: #b8b0a4; font-size: 0.85rem;">Authentic everyday essentials, delivered across Pakistan with Cash on Delivery.</p>
          </div>
          <div>
            <span class="footer-col-title">Shop</span>
            <a href="/pages/shop.html?category=electrolytes">Electrolytes</a>
            <a href="/pages/shop.html?category=coffee">Coffee</a>
            <a href="/pages/shop.html?category=shampoo">Shampoo</a>
            <a href="/pages/shop.html?category=soaps">Soaps</a>
            <a href="/pages/shop.html?category=cosmetics">Cosmetics</a>
            <a href="/pages/bundles.html">Kits &amp; bundles</a>
          </div>
          <div>
            <span class="footer-col-title">Help</span>
            <a href="/pages/track-order.html">Track your order</a>
            <a href="/pages/contact.html">Contact us</a>
            <a href="/pages/account.html">Your account</a>
          </div>
          <div>
            <span class="footer-col-title">Company</span>
            <a href="/pages/about.html">About ShopXtra</a>
          </div>
        </div>

        <div class="footer-bottom-bar">
          <span>&copy; 2026 ShopXtra. All prices in PKR.</span>
          <span>Made in Pakistan</span>
        </div>
      </div>
    </footer>
  `;
}

function renderWhatsAppFloat() {
  const a = document.createElement('a');
  a.href = 'https://wa.me/923001234567';
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

document.addEventListener('DOMContentLoaded', () => {
  const navSlot = document.getElementById('navbar-slot');
  const footerSlot = document.getElementById('footer-slot');
  if (navSlot) navSlot.innerHTML = renderNavbar();
  if (footerSlot) footerSlot.innerHTML = renderFooter();
  renderWhatsAppFloat();
  renderBackToTop();
});
