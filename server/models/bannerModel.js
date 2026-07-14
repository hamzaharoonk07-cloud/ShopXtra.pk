const pool = require('../config/db');

async function findActive() {
  const { rows } = await pool.query(
    'SELECT * FROM site_banners WHERE active = true ORDER BY created_at DESC LIMIT 1'
  );
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM site_banners ORDER BY created_at DESC');
  return rows;
}

async function create({ imageUrl, title, message, linkUrl, active }) {
  if (active) {
    await pool.query('UPDATE site_banners SET active = false WHERE active = true');
  }
  const { rows } = await pool.query(
    `INSERT INTO site_banners (image_url, title, message, link_url, active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [imageUrl, title, message, linkUrl, !!active]
  );
  return rows[0];
}

async function setActive(id) {
  await pool.query('UPDATE site_banners SET active = false WHERE active = true');
  const { rows } = await pool.query(
    'UPDATE site_banners SET active = true WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

async function deactivate(id) {
  const { rows } = await pool.query(
    'UPDATE site_banners SET active = false WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM site_banners WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findActive, findAll, create, setActive, deactivate, remove };
