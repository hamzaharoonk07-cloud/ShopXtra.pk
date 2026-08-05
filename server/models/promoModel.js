const pool = require('../config/db');

async function findByCode(code) {
  const { rows } = await pool.query(
    `SELECT pc.*, p.name AS gift_product_name, p.slug AS gift_product_slug, p.images AS gift_product_images
     FROM promo_codes pc
     LEFT JOIN products p ON p.id = pc.gift_product_id
     WHERE pc.code = $1 AND pc.active = true`,
    [code.toUpperCase()]
  );
  return rows[0] || null;
}

function computeDiscount(promo, subtotal) {
  if (!promo) return 0;
  if (promo.discount_type === 'free_gift') return 0;
  let raw = promo.discount_type === 'percent'
    ? (subtotal * Number(promo.discount_value)) / 100
    : Number(promo.discount_value);
  if (promo.discount_type === 'percent' && promo.max_discount_amount != null) {
    raw = Math.min(raw, Number(promo.max_discount_amount));
  }
  return Math.min(raw, subtotal);
}

async function findAll() {
  const { rows } = await pool.query(
    `SELECT pc.*, p.name AS gift_product_name
     FROM promo_codes pc
     LEFT JOIN products p ON p.id = pc.gift_product_id
     ORDER BY pc.created_at DESC`
  );
  return rows;
}

async function findPublicOffers() {
  const { rows } = await pool.query(
    'SELECT code, discount_type, discount_value FROM promo_codes WHERE active = true AND is_public_offer = true ORDER BY id'
  );
  return rows;
}

async function create({ code, discountType, discountValue, isPublicOffer, giftProductId, maxDiscountAmount }) {
  const { rows } = await pool.query(
    `INSERT INTO promo_codes (code, discount_type, discount_value, is_public_offer, gift_product_id, max_discount_amount)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [code.toUpperCase(), discountType, discountValue, !!isPublicOffer, giftProductId || null, maxDiscountAmount || null]
  );
  return rows[0];
}

async function setActive(id, active) {
  const { rows } = await pool.query(
    'UPDATE promo_codes SET active = $2 WHERE id = $1 RETURNING *',
    [id, active]
  );
  return rows[0] || null;
}

module.exports = { findByCode, computeDiscount, findAll, findPublicOffers, create, setActive };
