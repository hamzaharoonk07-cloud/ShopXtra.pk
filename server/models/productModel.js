const pool = require('../config/db');

const CATEGORIES = ['electrolytes', 'shampoo', 'soaps', 'coffee', 'cosmetics'];
const SORT_COLUMNS = {
  price_asc: 'price ASC',
  price_desc: 'price DESC',
  newest: 'created_at DESC',
  bestseller: 'is_bestseller DESC, created_at DESC',
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
    `SELECT * FROM products ${where} ORDER BY ${orderBy}`,
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
  const { name, slug, category, description, price, compare_at_price, stock, images, ingredients, is_bestseller } = data;
  const { rows } = await pool.query(
    `INSERT INTO products (name, slug, category, description, price, compare_at_price, stock, images, ingredients, is_bestseller)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [name, slug, category, description, price, compare_at_price || null, stock || 0, images || [], ingredients, is_bestseller || false]
  );
  return rows[0];
}

const UPDATABLE_FIELDS = ['name', 'category', 'description', 'price', 'compare_at_price', 'stock', 'images', 'ingredients', 'is_bestseller'];

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

module.exports = { CATEGORIES, findAll, findBySlug, findById, create, update, remove };
