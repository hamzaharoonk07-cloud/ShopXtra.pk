const pool = require('../config/db');

async function record(productId, userId) {
  await pool.query(
    'INSERT INTO product_views (user_id, product_id) VALUES ($1, $2)',
    [userId || null, productId]
  );
}

async function findByUserId(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.slug, p.images, MAX(pv.created_at) AS last_viewed
     FROM product_views pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.user_id = $1
     GROUP BY p.id, p.name, p.slug, p.images
     ORDER BY last_viewed DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function mostViewed(limit = 5) {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.slug, COUNT(*)::int AS view_count
     FROM product_views pv
     JOIN products p ON p.id = pv.product_id
     GROUP BY p.id, p.name, p.slug
     ORDER BY view_count DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function clearAll() {
  await pool.query('DELETE FROM product_views');
}

module.exports = { record, findByUserId, mostViewed, clearAll };
