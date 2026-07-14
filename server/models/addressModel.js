const pool = require('../config/db');

async function findByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC',
    [userId]
  );
  return rows;
}

async function create(userId, { line1, city, postal_code, is_default }) {
  if (is_default) {
    await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
  }
  const { rows } = await pool.query(
    `INSERT INTO addresses (user_id, line1, city, postal_code, is_default)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, line1, city, postal_code || null, !!is_default]
  );
  return rows[0];
}

async function remove(userId, id) {
  const { rowCount } = await pool.query(
    'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCount > 0;
}

async function setDefault(userId, id) {
  await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
  const { rows } = await pool.query(
    'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return rows[0] || null;
}

module.exports = { findByUserId, create, remove, setDefault };
