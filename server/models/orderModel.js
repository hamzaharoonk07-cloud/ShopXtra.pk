const pool = require('../config/db');
const promoModel = require('./promoModel');
const productViewModel = require('./productViewModel');
const wishlistModel = require('./wishlistModel');

const FREE_SHIPPING_THRESHOLD = 3000;
const KARACHI_SHIPPING_FEE = 200;
const STANDARD_SHIPPING_FEE = 250;

function computeShippingFee(city, subtotal) {
  if (Number(subtotal) >= FREE_SHIPPING_THRESHOLD) return 0;
  return String(city || '').trim().toLowerCase() === 'karachi' ? KARACHI_SHIPPING_FEE : STANDARD_SHIPPING_FEE;
}

async function createOrder({ userId, email, items, shipping, paymentMethod, promoCode, notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      // Cart items for a chosen variant carry a compound slug
      // ("base-slug::variantId") so each variant lines up separately in
      // the cart - split it back apart before looking up the product.
      const [baseSlug, variantIdRaw] = String(item.slug).split('::');
      const variantId = variantIdRaw ? Number(variantIdRaw) : null;

      const { rows } = await client.query(
        'SELECT id, name, price, stock FROM products WHERE slug = $1 FOR UPDATE',
        [baseSlug]
      );
      const product = rows[0];
      if (!product) {
        throw Object.assign(new Error(`Product not found: ${baseSlug}`), { status: 400 });
      }

      let price = Number(product.price);
      if (variantId) {
        const { rows: variantRows } = await client.query(
          'SELECT id, variant_name, price_modifier, stock FROM product_variants WHERE id = $1 AND product_id = $2 FOR UPDATE',
          [variantId, product.id]
        );
        const variant = variantRows[0];
        if (!variant) {
          throw Object.assign(new Error(`Variant not found for ${product.name}`), { status: 400 });
        }
        if (variant.stock < item.qty) {
          throw Object.assign(new Error(`Not enough stock for ${product.name} (${variant.variant_name})`), { status: 409 });
        }
        price += Number(variant.price_modifier);
        await client.query('UPDATE product_variants SET stock = stock - $1 WHERE id = $2', [item.qty, variantId]);
      } else {
        if (product.stock < item.qty) {
          throw Object.assign(new Error(`Not enough stock for ${product.name}`), { status: 409 });
        }
        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.qty, product.id]);
      }

      const lineTotal = price * item.qty;
      total += lineTotal;
      resolvedItems.push({ productId: product.id, variantId, qty: item.qty, price });
    }

    let discount = 0;
    let appliedCode = null;
    let giftProductId = null;
    if (promoCode) {
      const promo = await promoModel.findByCode(promoCode);
      if (!promo) {
        throw Object.assign(new Error(`Invalid promo code: ${promoCode}`), { status: 400 });
      }
      discount = promoModel.computeDiscount(promo, total);
      appliedCode = promo.code;
      if (promo.discount_type === 'free_gift' && promo.gift_product_id) {
        const { rows: giftRows } = await client.query(
          'SELECT id, stock FROM products WHERE id = $1 FOR UPDATE',
          [promo.gift_product_id]
        );
        const giftProduct = giftRows[0];
        if (giftProduct && giftProduct.stock > 0) {
          giftProductId = giftProduct.id;
          await client.query('UPDATE products SET stock = stock - 1 WHERE id = $1', [giftProductId]);
        }
      }
    }
    const shippingFee = computeShippingFee(shipping.city, total);
    const finalTotal = total - discount + shippingFee;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, email, status, total, discount_total, shipping_fee, promo_code, payment_method, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_postal_code, notes)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [userId || null, email || null, finalTotal, discount, shippingFee, appliedCode, paymentMethod, shipping.name, shipping.phone, shipping.address, shipping.city, shipping.postalCode || null, notes || null]
    );
    const order = orderRows[0];

    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, qty, price_at_purchase)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.productId, item.variantId, item.qty, item.price]
      );
    }

    if (giftProductId) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, qty, price_at_purchase)
         VALUES ($1, $2, 1, 0)`,
        [order.id, giftProductId]
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
    `SELECT oi.qty, oi.price_at_purchase, p.name, p.slug, p.category, p.images, v.variant_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN product_variants v ON v.id = oi.variant_id
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

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [id]);
  return rowCount > 0;
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
  const mostViewed = await productViewModel.mostViewed(5);
  const mostWishlisted = await wishlistModel.mostWishlisted(5);
  return { ...totals[0], byStatus, topProducts, mostViewed, mostWishlisted };
}

/* Clears the store's transactional and customer data, restarting numbering so
   the next order placed is #1 again. A plain DELETE would leave the SERIAL
   sequence at its old high-water mark and the next order would carry on from
   there, which is the opposite of a reset.

   Kept deliberately: promo codes, products, bundles, variants, site banners
   and admin accounts.

   Deleting non-admin users cascades to their addresses, wishlists and reviews
   (see the ON DELETE CASCADE in schema.sql), so those are not named here -
   but they are counted first so the confirmation reports what actually went.
   Admins are matched by role, so an admin's own order history goes with the
   orders table while their login survives. */
async function resetStoreData() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM orders) AS orders,
       (SELECT COUNT(*)::int FROM order_items) AS order_items,
       (SELECT COUNT(*)::int FROM users WHERE role != 'admin') AS customers,
       (SELECT COUNT(*)::int FROM wishlists) AS wishlists,
       (SELECT COUNT(*)::int FROM reviews) AS reviews,
       (SELECT COUNT(*)::int FROM addresses) AS addresses,
       (SELECT COUNT(*)::int FROM newsletter_signups) AS subscribers`
  );

  await pool.query(`
    TRUNCATE order_items, orders RESTART IDENTITY;
    TRUNCATE newsletter_signups RESTART IDENTITY;
    TRUNCATE product_views, cart_events RESTART IDENTITY;
    DELETE FROM users WHERE role != 'admin';
  `);

  return rows[0];
}

module.exports = {
  createOrder,
  resetStoreData,
  computeShippingFee,
  FREE_SHIPPING_THRESHOLD,
  KARACHI_SHIPPING_FEE,
  STANDARD_SHIPPING_FEE,
  findById,
  findByUserId,
  findAll,
  updateStatus,
  remove,
  getOverview,
  VALID_STATUSES,
};
