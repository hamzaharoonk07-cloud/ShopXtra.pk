function renderAnnouncementBar() {
  const items = `
    <span>Cash on Delivery nationwide</span>
    <span class="dot" aria-hidden="true">&#8226;</span>
    <span class="announcement-highlight">Free delivery over Rs 3,000</span>
    <span class="dot" aria-hidden="true">&#8226;</span>
    <span>Imported &amp; authentic — priced better than Amazon</span>
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
          <ul class="navbar-nav mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" href="/pages/shop.html">Shop all</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/bundles.html">Bundles</a></li>
            <li class="nav-item"><a class="nav-link" href="/pages/about.html">About</a></li>
          </ul>
          <div class="d-flex gap-2 align-items-center position-relative ms-lg-auto">
            <div class="nav-search-wrap position-relative">
              <span class="nav-search-icon" aria-hidden="true">&#8981;</span>
              <input type="search" id="nav-search-input" placeholder="Search products"
                aria-label="Search products" autocomplete="off">
              <div id="nav-search-results" class="d-none"></div>
            </div>
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
            <a href="/pages/cart.html" class="nav-bag-btn" aria-label="Cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span id="cart-count-badge">0</span>
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
      <div class="footer-main">
        <div class="footer-brand-col">
          <div class="footer-brand-row">
            <img src="/assets/logo-full.png" alt="ShopXtra" class="logo-img logo-img-footer">
          </div>
          <p>Everyday essentials — imported, authentic and PKR-priced. Look after yourself, every single day.</p>
          <div class="footer-brand-stats">
            <span>&#9733; 4.8 rated</span>
            <span>12,000+ orders</span>
          </div>
        </div>
        <div class="footer-col">
          <h4>Shop</h4>
          <a href="/pages/shop.html?category=electrolytes">Electrolytes</a>
          <a href="/pages/shop.html?category=coffee">Coffee</a>
          <a href="/pages/shop.html?category=shampoo">Shampoo</a>
          <a href="/pages/shop.html?category=soaps">Soaps</a>
          <a href="/pages/shop.html?category=cosmetics">Cosmetics</a>
        </div>
        <div class="footer-col">
          <h4>Help</h4>
          <a href="/pages/track-order.html">Track order</a>
          <a href="/pages/contact.html">Contact us</a>
          <a href="/pages/account.html">Your account</a>
          <a href="/pages/bundles.html">Kits &amp; bundles</a>
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
        <span>&copy; 2026 ShopXtra · Made in Pakistan for Pakistan</span>
        <span>Cash on Delivery · 2–3 day nationwide delivery</span>
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

document.addEventListener('DOMContentLoaded', () => {
  const navSlot = document.getElementById('navbar-slot');
  const footerSlot = document.getElementById('footer-slot');
  if (navSlot) navSlot.innerHTML = renderNavbar();
  if (footerSlot) footerSlot.innerHTML = renderFooter();
  renderWhatsAppFloat();
  renderBackToTop();
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
