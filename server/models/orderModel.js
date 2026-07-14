const pool = require('../config/db');
const promoModel = require('./promoModel');

async function createOrder({ userId, email, items, shipping, paymentMethod, promoCode }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const { rows } = await client.query(
        'SELECT id, name, price, stock FROM products WHERE slug = $1 FOR UPDATE',
        [item.slug]
      );
      const product = rows[0];
      if (!product) {
        throw Object.assign(new Error(`Product not found: ${item.slug}`), { status: 400 });
      }
      if (product.stock < item.qty) {
        throw Object.assign(new Error(`Not enough stock for ${product.name}`), { status: 409 });
      }
      const lineTotal = Number(product.price) * item.qty;
      total += lineTotal;
      resolvedItems.push({ productId: product.id, qty: item.qty, price: product.price });

      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.qty, product.id]);
    }

    let discount = 0;
    let appliedCode = null;
    if (promoCode) {
      const promo = await promoModel.findByCode(promoCode);
      if (!promo) {
        throw Object.assign(new Error(`Invalid promo code: ${promoCode}`), { status: 400 });
      }
      discount = promoModel.computeDiscount(promo, total);
      appliedCode = promo.code;
    }
    const finalTotal = total - discount;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, email, status, total, discount_total, promo_code, payment_method, shipping_name, shipping_phone, shipping_address, shipping_city)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId || null, email || null, finalTotal, discount, appliedCode, paymentMethod, shipping.name, shipping.phone, shipping.address, shipping.city]
    );
    const order = orderRows[0];

    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, qty, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.productId, item.qty, item.price]
      );
    }

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!rows[0]) return null;

  const { rows: items } = await pool.query(
    `SELECT oi.qty, oi.price_at_purchase, p.name, p.slug, p.category
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [id]
  );
  return { ...rows[0], items };
}

async function findByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  return rows;
}

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

async function updateStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error(`Invalid status: ${status}`), { status: 400 });
  }
  const { rows } = await pool.query(
    'UPDATE orders SET status = $2 WHERE id = $1 RETURNING *',
    [id, status]
  );
  return rows[0] || null;
}

async function getOverview() {
  const { rows: totals } = await pool.query(
    `SELECT COUNT(*)::int AS order_count, COALESCE(SUM(total), 0) AS revenue
     FROM orders WHERE status != 'cancelled'`
  );
  const { rows: byStatus } = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`
  );
  const { rows: topProducts } = await pool.query(
    `SELECT p.name, p.slug, SUM(oi.qty)::int AS units_sold
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status != 'cancelled'
     GROUP BY p.id, p.name, p.slug
     ORDER BY units_sold DESC
     LIMIT 5`
  );
  return { ...totals[0], byStatus, topProducts };
}

module.exports = {
  createOrder,
  findById,
  findByUserId,
  findAll,
  updateStatus,
  getOverview,
  VALID_STATUSES,
};
