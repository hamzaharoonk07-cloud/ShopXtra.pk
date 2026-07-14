const pool = require('../config/db');

async function findByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT p.* FROM wishlists w
     JOIN products p ON p.id = w.product_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
}

async function add(userId, slug) {
  const { rows: productRows } = await pool.query('SELECT id FROM products WHERE slug = $1', [slug]);
  if (!productRows[0]) return null;

  await pool.query(
    `INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [userId, productRows[0].id]
  );
  return true;
}

async function remove(userId, slug) {
  const { rowCount } = await pool.query(
    `DELETE FROM wishlists WHERE user_id = $1
     AND product_id = (SELECT id FROM products WHERE slug = $2)`,
    [userId, slug]
  );
  return rowCount > 0;
}

module.exports = { findByUserId, add, remove };
