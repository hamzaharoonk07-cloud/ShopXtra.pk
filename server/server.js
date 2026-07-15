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

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(sitemapRoutes);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'client')));

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
