const pool = require('../config/db');

async function findByProductSlug(slug) {
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
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

async function create({ slug, userId, rating, comment }) {
  const { rows: productRows } = await pool.query('SELECT id FROM products WHERE slug = $1', [slug]);
  const product = productRows[0];
  if (!product) return null;

  const { rows } = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [product.id, userId, rating, comment || null]
  );
  return rows[0];
}

module.exports = { findByProductSlug, create };
