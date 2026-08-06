require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const productModel = require('./models/productModel');
const healthRoutes = require('./routes/health');
const productRoutes = require('./routes/products');
const newsletterRoutes = require('./routes/newsletter');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const promoRoutes = require('./routes/promo');
const wishlistRoutes = require('./routes/wishlist');
const bundleRoutes = require('./routes/bundles');
const addressRoutes = require('./routes/addresses');
const userRoutes = require('./routes/users');
const bannerRoutes = require('./routes/banner');
const sitemapRoutes = require('./routes/sitemap');
const { runMigrations } = require('./config/migrate');

const app = express();

// The site is fully live and indexable at both the custom domain and
// Vercel's default *.vercel.app one, which duplicates every page under two
// hosts (bad for SEO, confusing for anyone who lands on the raw vercel.app
// link). Only the VERCEL env var (set automatically by Vercel's runtime,
// never in local dev) gates this, so `npm run dev` / `vercel dev` keep
// working against localhost untouched.
const CANONICAL_HOST = 'www.shopxtra.store';
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    if (req.headers.host && req.headers.host !== CANONICAL_HOST) {
      return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
    }
    next();
  });
}

// Fire-and-forget from the process's perspective, but every request below
// waits on this same promise before reaching any route - otherwise a cold
// start can serve a request (e.g. hitting a brand-new table) before the
// migration that creates it has actually finished running.
const migrationsReady = runMigrations().catch((err) => {
  console.error('Migration error:', err.message);
});

// Static files (JS/CSS/images/uploads) never touch the database, so they're
// served before the migration gate below - otherwise a cold start makes
// every single asset on every page wait on unrelated schema migrations,
// which is what was making pages feel like they hung on load.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Some crawlers (including Google's favicon fetcher) and older browsers
// request /favicon.ico directly regardless of the <link rel="icon"> tag -
// without this it 404s even though the real icon works fine everywhere else.
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'assets', 'favicon.png')));

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// The real product name/description/image only get set client-side after
// product.js fetches the product - fine for Google (it renders JS before
// indexing) but link-preview crawlers (WhatsApp, Facebook) don't run JS, so
// a shared product link would otherwise always show the generic ShopXtra
// title/logo instead of the actual product. Rewriting the static file's
// meta tags server-side, only when a known slug is present, fixes that
// without turning this into a templated/SSR page for every other route.
app.get('/pages/product.html', async (req, res, next) => {
  try {
    const slug = req.query.slug;
    if (!slug) return next();
    await migrationsReady;
    const product = await productModel.findBySlug(slug);
    if (!product) return next();

    const filePath = path.join(__dirname, '..', 'client', 'pages', 'product.html');
    let html = fs.readFileSync(filePath, 'utf8');
    const title = escapeHtml(`${product.name} | ShopXtra`);
    const description = escapeHtml(
      (product.description || '').slice(0, 160) ||
      `${product.name}: authentic, PKR-priced, delivered nationwide across Pakistan with Cash on Delivery.`
    );
    const url = `https://www.shopxtra.store/pages/product.html?slug=${encodeURIComponent(slug)}`;
    const image = (product.images && product.images[0]) || 'https://www.shopxtra.store/assets/logo-full.png';

    html = html
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
      .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
      .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`);

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

app.use(express.static(path.join(__dirname, '..', 'client')));

app.use((req, res, next) => {
  migrationsReady.then(() => next()).catch(next);
});

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(sitemapRoutes);

app.use('/api/health', healthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/banner', bannerRoutes);

app.use(notFound);
app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`ShopXtra API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
