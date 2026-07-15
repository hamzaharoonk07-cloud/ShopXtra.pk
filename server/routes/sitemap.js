const express = require('express');
const productModel = require('../models/productModel');

const router = express.Router();
const SITE_URL = process.env.SITE_URL || 'https://shop-xtra-pk.vercel.app';
const CATEGORIES = ['electrolytes', 'coffee', 'shampoo', 'soaps', 'cosmetics'];

router.get('/sitemap.xml', async (req, res) => {
  const staticUrls = [
    { loc: '/index.html', priority: '1.0', freq: 'daily' },
    { loc: '/pages/shop.html', priority: '0.9', freq: 'daily' },
    ...CATEGORIES.map((c) => ({ loc: `/pages/shop.html?category=${c}`, priority: '0.8', freq: 'daily' })),
    { loc: '/pages/bundles.html', priority: '0.7', freq: 'weekly' },
    { loc: '/pages/about.html', priority: '0.5', freq: 'monthly' },
    { loc: '/pages/contact.html', priority: '0.5', freq: 'monthly' },
    { loc: '/pages/track-order.html', priority: '0.3', freq: 'monthly' },
  ];

  let productUrls = [];
  try {
    const products = await productModel.findAll({});
    productUrls = products.map((p) => ({
      loc: `/pages/product.html?slug=${p.slug}`,
      priority: '0.6',
      freq: 'weekly',
    }));
  } catch {
    // DB unavailable — sitemap still returns the static pages.
  }

  const urls = [...staticUrls, ...productUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_URL}${u.loc}</loc><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

module.exports = router;
