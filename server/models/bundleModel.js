const pool = require('../config/db');

// Cart/checkout/stock/order-emails are all built around the products table,
// so rather than rework that whole pipeline, every bundle gets a mirrored
// row there that behaves exactly like a real product to it. "bundle-" keeps
// its slug from ever colliding with an actual product's slug.
function mirrorSlug(bundleSlug) {
  return `bundle-${bundleSlug}`;
}

async function syncMirrorProduct(bundle) {
  await pool.query(
    `INSERT INTO products (name, slug, category, description, price, stock, images, video_url, is_bundle)
     VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, true)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       price = EXCLUDED.price,
       stock = EXCLUDED.stock,
       images = EXCLUDED.images,
       video_url = EXCLUDED.video_url`,
    [bundle.name, mirrorSlug(bundle.slug), bundle.description || null, bundle.price, bundle.stock || 0, bundle.images || [], bundle.video_url || null]
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

async function create({ name, slug, description, price, stock, images, videoUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO bundles (name, slug, description, price, stock, images, video_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, slug, description || null, price, stock || 0, images || [], videoUrl || null]
  );
  const bundle = rows[0];
  await syncMirrorProduct(bundle);
  return bundle;
}

async function update(id, { name, slug, description, price, stock, images, videoUrl }) {
  const existing = await findById(id);
  if (!existing) return null;

  const { rows } = await pool.query(
    `UPDATE bundles SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       description = COALESCE($4, description),
       price = COALESCE($5, price),
       stock = COALESCE($6, stock),
       images = COALESCE($7, images),
       video_url = COALESCE($8, video_url)
     WHERE id = $1
     RETURNING *`,
    [id, name, slug, description, price, stock, images, videoUrl]
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
