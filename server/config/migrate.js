const pool = require('./db');

async function runMigrations() {
  await pool.query(`
    ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS color_name VARCHAR(60),
      ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7),
      ADD COLUMN IF NOT EXISTS image_url TEXT
  `);
  await pool.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS video_url TEXT
  `);
  await pool.query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20)
  `);
  await pool.query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0
  `);
  await pool.query(`
    ALTER TABLE promo_codes
      ADD COLUMN IF NOT EXISTS gift_product_id INTEGER REFERENCES products(id)
  `);
  await pool.query(`ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_type_check`);
  await pool.query(`
    ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_discount_type_check
      CHECK (discount_type IN ('percent', 'flat', 'free_gift'))
  `);

  // NOTE: this migration file has no version tracking, so every statement
  // here re-runs on every cold start - each one MUST be safe to repeat
  // indefinitely (IF NOT EXISTS / IF EXISTS / idempotent UPDATE). A previous
  // migration here discontinued the shampoo category by moving shampoo
  // products to soaps and deleting the rest; that was a one-time data
  // transform, not idempotent (re-running it after shampoo was reinstated
  // below would delete any new shampoo product with no order history), so
  // it has been removed now that it has already served its purpose.

  // Reinstate shampoo as the category name (a later decision reversed the
  // discontinuation above): rename every existing 'soaps' product to
  // 'shampoo' and update the allowed category list to match. Safe to
  // re-run - once no rows are 'soaps', the UPDATE is a no-op.
  await pool.query(`UPDATE products SET category = 'shampoo' WHERE category = 'soaps'`);
  await pool.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check`);
  await pool.query(`
    ALTER TABLE products ADD CONSTRAINT products_category_check
      CHECK (category IN ('electrolytes', 'shampoo', 'coffee', 'cosmetics'))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_views (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON product_views(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id)`);
}

module.exports = { runMigrations };
