const pool = require('../config/db');

async function findByCode(code) {
  const { rows } = await pool.query(
    'SELECT * FROM promo_codes WHERE code = $1 AND active = true',
    [code.toUpperCase()]
  );
  return rows[0] || null;
}

function computeDiscount(promo, subtotal) {
  if (!promo) return 0;
  const raw = promo.discount_type === 'percent'
    ? (subtotal * Number(promo.discount_value)) / 100
    : Number(promo.discount_value);
  return Math.min(raw, subtotal);
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
  return rows;
}

async function findPublicOffers() {
  const { rows } = await pool.query(
    'SELECT code, discount_type, discount_value FROM promo_codes WHERE active = true AND is_public_offer = true ORDER BY id'
  );
  return rows;
}

async function create({ code, discountType, discountValue, isPublicOffer }) {
  const { rows } = await pool.query(
    `INSERT INTO promo_codes (code, discount_type, discount_value, is_public_offer)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [code.toUpperCase(), discountType, discountValue, !!isPublicOffer]
  );
  return rows[0];
}

module.exports = { findByCode, computeDiscount, findAll, findPublicOffers, create };
