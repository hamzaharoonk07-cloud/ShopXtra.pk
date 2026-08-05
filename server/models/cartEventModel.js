const pool = require('../config/db');

async function record(productId, userId, qty) {
  await pool.query(
    'INSERT INTO cart_events (user_id, product_id, qty) VALUES ($1, $2, $3)',
    [userId || null, productId, qty || 1]
  );
}

async function findRecent(limit = 100) {
  const { rows } = await pool.query(
    `SELECT ce.id, ce.qty, ce.created_at, p.id AS product_id, p.name AS product_name, p.slug AS product_slug, p.images,
            u.name AS user_name, u.email AS user_email
     FROM cart_events ce
     JOIN products p ON p.id = ce.product_id
     LEFT JOIN users u ON u.id = ce.user_id
     ORDER BY ce.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { record, findRecent };
