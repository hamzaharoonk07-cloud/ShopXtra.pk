const pool = require('../config/db');

/* admin_reply/admin_replied_at are added by migrate.js, which sends its whole
   batch as one statement - so if any single statement in that batch fails,
   none of it applies and these columns silently do not exist. Selecting them
   unconditionally took the customer-facing reviews list down with a 500 when
   exactly that happened. The reply is an admin nicety; the reviews themselves
   are not, so a missing column degrades to "no replies" instead of no reviews.
   The flag is cached after the first check, so this costs one extra query per
   cold start at most. */
let reviewsHaveReplyColumn = null;

async function hasReplyColumn() {
  if (reviewsHaveReplyColumn !== null) return reviewsHaveReplyColumn;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'reviews' AND column_name = 'admin_reply'`
    );
    reviewsHaveReplyColumn = rows.length > 0;
  } catch {
    reviewsHaveReplyColumn = false;
  }
  return reviewsHaveReplyColumn;
}

async function findByProductSlug(slug) {
  const replyCols = (await hasReplyColumn())
    ? 'r.admin_reply, r.admin_replied_at,'
    : 'NULL AS admin_reply, NULL AS admin_replied_at,';

  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at, r.verified_purchase,
            ${replyCols} u.name AS user_name
     FROM reviews r
     JOIN products p ON p.id = r.product_id
     JOIN users u ON u.id = r.user_id
     WHERE p.slug = $1
     ORDER BY r.created_at DESC`,
    [slug]
  );
  const { rows: statsRows } = await pool.query(
    `SELECT ROUND(AVG(r.rating)::numeric, 1) AS average, COUNT(*)::int AS count
     FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE p.slug = $1`,
    [slug]
  );
  return { reviews: rows, average: statsRows[0].average, count: statsRows[0].count };
}

async function create({ slug, userId, rating, comment, imageUrl }) {
  const { rows: productRows } = await pool.query('SELECT id FROM products WHERE slug = $1', [slug]);
  const product = productRows[0];
  if (!product) return null;

  // "Verified buyer" should only ever mean the reviewer actually has a
  // delivered order containing this product - never assumed by default.
  const { rows: purchaseRows } = await pool.query(
    `SELECT 1 FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
     LIMIT 1`,
    [userId, product.id]
  );
  const verifiedPurchase = purchaseRows.length > 0;

  const { rows } = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment, verified_purchase, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [product.id, userId, rating, comment || null, verifiedPurchase, imageUrl || null]
  );
  return rows[0];
}

/* Admin moderation: every review across the catalogue, newest first, with
   enough product context to know what is being replied to or removed. */
async function findAllForAdmin() {
  const replyCols = (await hasReplyColumn())
    ? 'r.admin_reply, r.admin_replied_at,'
    : 'NULL AS admin_reply, NULL AS admin_replied_at,';
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at,
            r.verified_purchase, ${replyCols}
            u.name AS user_name, p.name AS product_name, p.slug AS product_slug
     FROM reviews r
     JOIN products p ON p.id = r.product_id
     JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC`
  );
  return rows;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
  return rowCount > 0;
}

/* An empty or whitespace-only reply clears it rather than storing a blank
   bubble under the review, so the admin can undo a reply by emptying the box. */
async function setAdminReply(id, reply) {
  const trimmed = (reply || '').trim();
  const { rows } = await pool.query(
    `UPDATE reviews
     SET admin_reply = $2,
         admin_replied_at = CASE WHEN $2::text IS NULL THEN NULL ELSE NOW() END
     WHERE id = $1
     RETURNING id, admin_reply, admin_replied_at`,
    [id, trimmed || null]
  );
  return rows[0] || null;
}

module.exports = { findByProductSlug, create, findAllForAdmin, remove, setAdminReply };
