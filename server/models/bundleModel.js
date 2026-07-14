const pool = require('../config/db');

async function attachItems(bundles) {
  for (const bundle of bundles) {
    const { rows: items } = await pool.query(
      `SELECT p.* FROM bundle_items bi
       JOIN products p ON p.id = bi.product_id
       WHERE bi.bundle_id = $1`,
      [bundle.id]
    );
    bundle.items = items;
    bundle.original_total = items.reduce((sum, p) => sum + Number(p.price), 0);
    bundle.bundle_price = Number((bundle.original_total * (1 - bundle.discount_percent / 100)).toFixed(2));
  }
  return bundles;
}

async function findAll() {
  const { rows } = await pool.query(`
    SELECT * FROM bundles
    ORDER BY CASE ritual_time WHEN 'morning' THEN 1 WHEN 'midday' THEN 2 WHEN 'evening' THEN 3 END
  `);
  return attachItems(rows);
}

async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM bundles WHERE slug = $1', [slug]);
  if (!rows[0]) return null;
  const [bundle] = await attachItems(rows);
  return bundle;
}

module.exports = { findAll, findBySlug };
