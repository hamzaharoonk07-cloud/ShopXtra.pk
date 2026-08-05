const pool = require('./db');

// NOTE: this migration file has no version tracking, so every statement here
// re-runs on every cold start - each one MUST be safe to repeat indefinitely
// (IF NOT EXISTS / IF EXISTS / idempotent UPDATE). A previous migration here
// discontinued the shampoo category by moving shampoo products to soaps and
// deleting the rest; that was a one-time data transform, not idempotent
// (re-running it after shampoo was reinstated below would delete any new
// shampoo product with no order history), so it has been removed now that
// it has already served its purpose.
//
// All statements are sent as a single multi-statement query instead of one
// await per statement - 14 separate round-trips to Neon were adding roughly
// a second to every cold start (confirmed by direct timing), on top of the
// connection handshake itself. Postgres runs a semicolon-separated batch
// like this as one simple-query message, so this is one round-trip instead
// of 14. Do not add parameterized ($1-style) statements to this batch - the
// simple query protocol used here doesn't support bind parameters.
async function runMigrations() {
  await pool.query(`
    ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS color_name VARCHAR(60),
      ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7),
      ADD COLUMN IF NOT EXISTS image_url TEXT;

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS video_url TEXT;

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20);

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS notes TEXT;

    ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE promo_codes
      ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC(10, 2);

    ALTER TABLE promo_codes
      ADD COLUMN IF NOT EXISTS gift_product_id INTEGER REFERENCES products(id);

    ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_type_check;

    ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_discount_type_check
      CHECK (discount_type IN ('percent', 'flat', 'free_gift'));

    -- Reinstate shampoo as the category name (a later decision reversed an
    -- earlier discontinuation): rename every existing 'soaps' product to
    -- 'shampoo' and update the allowed category list to match. Safe to
    -- re-run - once no rows are 'soaps', the UPDATE is a no-op.
    --
    -- The constraint must allow BOTH values while the UPDATE runs - the old
    -- constraint (only 'soaps') would reject the UPDATE's new 'shampoo'
    -- value, and a constraint that only allows 'shampoo' would reject the
    -- ADD CONSTRAINT itself (it validates existing rows, which are still
    -- 'soaps' at that point).
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

    ALTER TABLE products ADD CONSTRAINT products_category_check
      CHECK (category IN ('electrolytes', 'soaps', 'shampoo', 'coffee', 'cosmetics'));

    UPDATE products SET category = 'shampoo' WHERE category = 'soaps';

    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

    ALTER TABLE products ADD CONSTRAINT products_category_check
      CHECK (category IN ('electrolytes', 'shampoo', 'coffee', 'cosmetics'));

    CREATE TABLE IF NOT EXISTS product_views (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON product_views(user_id);
    CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);

    CREATE TABLE IF NOT EXISTS cart_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      qty INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_cart_events_product_id ON cart_events(product_id);
    CREATE INDEX IF NOT EXISTS idx_cart_events_created_at ON cart_events(created_at);

    ALTER TABLE bundles
      ADD COLUMN IF NOT EXISTS image_url TEXT;

    -- "Ritual" (morning/midday/evening) naming has been dropped from the
    -- bundle admin UI and customer-facing copy - the column stays (existing
    -- rows keep their value, nothing reads it anymore) but is no longer
    -- required so new bundles can be created without it.
    ALTER TABLE bundles ALTER COLUMN ritual_time DROP NOT NULL;

    -- Bundles are no longer built from specific products - admin sets a
    -- price directly, and the customer notes their flavour/variant
    -- preference at checkout instead. price is nullable here only so old
    -- rows (created back when price was computed from items) don't fail
    -- this migration; the API requires it for every new create/update.
    ALTER TABLE bundles
      ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);

    -- Bundles still need to flow through the existing cart/checkout/stock
    -- pipeline, which is built entirely around products - rather than
    -- rework that pipeline, each bundle gets a mirrored row in products
    -- (slug prefixed "bundle-" so it can never collide with a real
    -- product's slug) that cart/checkout treat exactly like any other
    -- product. is_bundle marks it so the storefront's own product
    -- listings can filter it back out. category has to be nullable since
    -- these mirror rows don't belong to a real category.
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE products ALTER COLUMN category DROP NOT NULL;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
  `);
}

module.exports = { runMigrations };
