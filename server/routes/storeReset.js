// TEMPORARY, one-time-use route: wipes all transactional/customer data
// (orders, reviews, customer accounts, promo codes, banner, newsletter
// signups, view/cart-activity tracking) while leaving the product and
// bundle catalog untouched. Meant to be removed again right after use -
// do not leave this mounted as a standing admin feature.
const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await pool.query(`
      DELETE FROM reviews;
      DELETE FROM orders;
      DELETE FROM promo_codes;
      DELETE FROM site_banners;
      DELETE FROM newsletter_signups;
      DELETE FROM product_views;
      DELETE FROM cart_events;
      DELETE FROM users WHERE role != 'admin';
    `);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
