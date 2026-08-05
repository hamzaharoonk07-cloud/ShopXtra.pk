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
  const { rows } = await pool.query('SELECT * FROM bundles ORDER BY created_at DESC');
  return attachItems(rows);
}

async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM bundles WHERE slug = $1', [slug]);
  if (!rows[0]) return null;
  const [bundle] = await attachItems(rows);
  return bundle;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM bundles WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const [bundle] = await attachItems(rows);
  return bundle;
}

async function setItems(bundleId, productIds) {
  await pool.query('DELETE FROM bundle_items WHERE bundle_id = $1', [bundleId]);
  for (const productId of productIds) {
    await pool.query('INSERT INTO bundle_items (bundle_id, product_id) VALUES ($1, $2)', [bundleId, productId]);
  }
}

async function create({ name, slug, description, discountPercent, productIds, imageUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO bundles (name, slug, description, discount_percent, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, slug, description || null, discountPercent, imageUrl || null]
  );
  const bundle = rows[0];
  await setItems(bundle.id, productIds || []);
  return findById(bundle.id);
}

async function update(id, { name, slug, description, discountPercent, productIds, imageUrl }) {
  const { rows } = await pool.query(
    `UPDATE bundles SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       description = COALESCE($4, description),
       discount_percent = COALESCE($5, discount_percent),
       image_url = COALESCE($6, image_url)
     WHERE id = $1
     RETURNING *`,
    [id, name, slug, description, discountPercent, imageUrl]
  );
  if (!rows[0]) return null;
  if (productIds) await setItems(id, productIds);
  return findById(id);
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM bundles WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findBySlug, findById, create, update, remove };
