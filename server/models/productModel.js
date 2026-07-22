const pool = require('../config/db');

const CATEGORIES = ['electrolytes', 'shampoo', 'soaps', 'coffee', 'cosmetics'];
const SORT_COLUMNS = {
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  newest: 'p.created_at DESC',
  bestseller: 'p.is_bestseller DESC, p.created_at DESC',
};

async function findAll({ category, minPrice, maxPrice, sort, search, onSale } = {}) {
  const clauses = [];
  const values = [];

  if (category) {
    values.push(category);
    clauses.push(`category = $${values.length}`);
  }
  if (minPrice != null) {
    values.push(minPrice);
    clauses.push(`price >= $${values.length}`);
  }
  if (maxPrice != null) {
    values.push(maxPrice);
    clauses.push(`price <= $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`name ILIKE $${values.length}`);
  }
  if (onSale) {
    clauses.push(`compare_at_price IS NOT NULL AND compare_at_price > price`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orderBy = SORT_COLUMNS[sort] || SORT_COLUMNS.newest;

  const { rows } = await pool.query(
    `SELECT p.*,
            ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
            COUNT(r.id)::int AS review_count
     FROM products p
     LEFT JOIN reviews r ON r.product_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY ${orderBy}`,
    values
  );
  return rows;
}

async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM products WHERE slug = $1', [slug]);
  if (!rows[0]) return null;

  const { rows: variants } = await pool.query(
    'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id',
    [rows[0].id]
  );
  return { ...rows[0], variants };
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(data) {
  const { name, slug, category, description, price, compare_at_price, stock, images, video_url, ingredients, is_bestseller } = data;
  const { rows } = await pool.query(
    `INSERT INTO products (name, slug, category, description, price, compare_at_price, stock, images, video_url, ingredients, is_bestseller)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [name, slug, category, description, price, compare_at_price || null, stock || 0, images || [], video_url || null, ingredients, is_bestseller || false]
  );
  return rows[0];
}

const UPDATABLE_FIELDS = ['name', 'category', 'description', 'price', 'compare_at_price', 'stock', 'images', 'video_url', 'ingredients', 'is_bestseller'];

async function update(id, data) {
  const fields = UPDATABLE_FIELDS.filter((key) => Object.prototype.hasOwnProperty.call(data, key));
  if (!fields.length) return findById(id);

  const setClauses = fields.map((key, i) => `${key} = $${i + 2}`);
  const values = fields.map((key) => data[key]);

  const { rows } = await pool.query(
    `UPDATE products SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

async function createVariant(productId, data) {
  const { variant_name, price_modifier, stock, color_name, color_hex, image_url } = data;
  const { rows } = await pool.query(
    `INSERT INTO product_variants (product_id, variant_name, price_modifier, stock, color_name, color_hex, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [productId, variant_name, price_modifier || 0, stock || 0, color_name || null, color_hex || null, image_url || null]
  );
  return rows[0];
}

const VARIANT_UPDATABLE_FIELDS = ['variant_name', 'price_modifier', 'stock', 'color_name', 'color_hex', 'image_url'];

async function updateVariant(id, data) {
  const fields = VARIANT_UPDATABLE_FIELDS.filter((key) => Object.prototype.hasOwnProperty.call(data, key));
  if (!fields.length) return null;

  const setClauses = fields.map((key, i) => `${key} = $${i + 2}`);
  const values = fields.map((key) => data[key]);

  const { rows } = await pool.query(
    `UPDATE product_variants SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
}

async function removeVariant(id) {
  const { rowCount } = await pool.query('DELETE FROM product_variants WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = {
  CATEGORIES,
  findAll,
  findBySlug,
  findById,
  create,
  update,
  remove,
  createVariant,
  updateVariant,
  removeVariant,
};
