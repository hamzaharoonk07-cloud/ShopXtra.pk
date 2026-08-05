require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { notFound, errorHandler } = require('./middleware/errorHandler');
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
