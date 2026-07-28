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

  // Discontinue the shampoo category: keep any shampoo product that has real
  // order history by moving it into soaps (order_items has no ON DELETE
  // CASCADE on product_id, so it can't be deleted outright), then remove the
  // rest and drop shampoo from the allowed category list.
  await pool.query(`
    UPDATE products SET category = 'soaps'
    WHERE category = 'shampoo' AND id IN (SELECT DISTINCT product_id FROM order_items)
  `);
  await pool.query(`DELETE FROM products WHERE category = 'shampoo'`);
  await pool.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check`);
  await pool.query(`
    ALTER TABLE products ADD CONSTRAINT products_category_check
      CHECK (category IN ('electrolytes', 'soaps', 'coffee', 'cosmetics'))
  `);
}

module.exports = { runMigrations };
