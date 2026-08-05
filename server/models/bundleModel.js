const pool = require('../config/db');

// Cart/checkout/stock/order-emails are all built around the products table,
// so rather than rework that whole pipeline, every bundle gets a mirrored
// row there that behaves exactly like a real product to it. "bundle-" keeps
// its slug from ever colliding with an actual product's slug. Stock is set
// high since bundles aren't tracked per-unit the way real inventory is.
const MIRROR_STOCK = 999999;

function mirrorSlug(bundleSlug) {
  return `bundle-${bundleSlug}`;
}

async function syncMirrorProduct(bundle) {
  await pool.query(
    `INSERT INTO products (name, slug, category, description, price, stock, images, is_bundle)
     VALUES ($1, $2, NULL, $3, $4, $5, $6, true)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       price = EXCLUDED.price,
       images = EXCLUDED.images,
       stock = $5`,
    [bundle.name, mirrorSlug(bundle.slug), bundle.description || null, bundle.price, MIRROR_STOCK, bundle.image_url ? [bundle.image_url] : []]
  );
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM bundles ORDER BY created_at DESC');
  return rows;
}

async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM bundles WHERE slug = $1', [slug]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM bundles WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ name, slug, description, price, imageUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO bundles (name, slug, description, price, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, slug, description || null, price, imageUrl || null]
  );
  const bundle = rows[0];
  await syncMirrorProduct(bundle);
  return bundle;
}

async function update(id, { name, slug, description, price, imageUrl }) {
  const existing = await findById(id);
  if (!existing) return null;

  const { rows } = await pool.query(
    `UPDATE bundles SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       description = COALESCE($4, description),
       price = COALESCE($5, price),
       image_url = COALESCE($6, image_url)
     WHERE id = $1
     RETURNING *`,
    [id, name, slug, description, price, imageUrl]
  );
  const bundle = rows[0];
  if (!bundle) return null;

  // The upsert below targets the new slug, so a renamed bundle would
  // otherwise leave its old mirror row behind as an orphan.
  if (existing.slug !== bundle.slug) {
    await pool.query('DELETE FROM products WHERE slug = $1 AND is_bundle = true', [mirrorSlug(existing.slug)]);
  }
  await syncMirrorProduct(bundle);
  return bundle;
}

async function remove(id) {
  const bundle = await findById(id);
  if (!bundle) return false;
  await pool.query('DELETE FROM products WHERE slug = $1 AND is_bundle = true', [mirrorSlug(bundle.slug)]);
  const { rowCount } = await pool.query('DELETE FROM bundles WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findBySlug, findById, create, update, remove, mirrorSlug };
