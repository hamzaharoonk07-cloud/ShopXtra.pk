const pool = require('../config/db');

async function findByProductSlug(slug) {
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at, r.verified_purchase, u.name AS user_name
     FROM reviews r
     JOIN products p ON p.id = r.product_id
     JOIN users u ON u.id = r.user_id
     WHERE p.slug = $1
     ORDER BY r.created_at DESC`,
    [slug]
  );
  const { rows: statsRows } = await pool.query(
    `SELECT ROUND(AVG(r.rating)::numeric, 1) AS average, COUNT(*)::int AS count
     FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE p.slug = $1`,
    [slug]
  );
  return { reviews: rows, average: statsRows[0].average, count: statsRows[0].count };
}

async function create({ slug, userId, rating, comment, imageUrl }) {
  const { rows: productRows } = await pool.query('SELECT id FROM products WHERE slug = $1', [slug]);
  const product = productRows[0];
  if (!product) return null;

  // "Verified buyer" should only ever mean the reviewer actually has a
  // delivered order containing this product - never assumed by default.
  const { rows: purchaseRows } = await pool.query(
    `SELECT 1 FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
     LIMIT 1`,
    [userId, product.id]
  );
  const verifiedPurchase = purchaseRows.length > 0;

  const { rows } = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment, verified_purchase, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [product.id, userId, rating, comment || null, verifiedPurchase, imageUrl || null]
  );
  return rows[0];
}

module.exports = { findByProductSlug, create };
