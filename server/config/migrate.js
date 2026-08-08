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
// Do not add parameterized ($1-style) statements here - the simple query
// protocol used for the batch doesn't support bind parameters.

/* Splits a batch into single statements. Comment lines go first so a `--`
   containing a semicolon can't cut a statement in half. */
function splitStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/* Sends the batch as one round-trip first: 20-odd separate awaits against Neon
   add roughly a second to every cold start, and the batch is a single
   simple-query message.

   But Postgres rolls the whole batch back if any statement in it fails, so one
   bad line silently reverts every unrelated migration behind it. That bit
   twice - a category constraint frozen with a stale value list threw once a
   newer category existed, which also stopped the reviews columns being
   created, and that only surfaced days later as a 500 on a different endpoint.

   So on failure it retries statement by statement: the sound ones still apply,
   and the log names the exact statement that broke instead of leaving it to be
   inferred from symptoms. */
async function runBatch(sql, label) {
  try {
    await pool.query(sql);
    return;
  } catch (err) {
    console.error('[migrate] ' + label + ': batch failed (' + err.message + ') - retrying statement by statement');
  }

  const statements = splitStatements(sql);
  let failed = 0;
  for (let i = 0; i < statements.length; i++) {
    try {
      await pool.query(statements[i]);
    } catch (err) {
      failed++;
      const preview = statements[i].replace(/\s+/g, ' ').slice(0, 90);
      console.error('[migrate] ' + label + ': statement ' + (i + 1) + '/' + statements.length
        + ' failed: ' + err.message + '\n  -> ' + preview);
    }
  }
  console.error('[migrate] ' + label + ': ' + (statements.length - failed) + '/' + statements.length + ' statements applied');
}

async function runMigrations() {
  await runBatch(`
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

    -- Category renames, historical and current. Each is a plain UPDATE run
    -- while NO check constraint is in force, and the final constraint is added
    -- once at the end.
    --
    -- This used to re-add an intermediate constraint between the renames, with
    -- the value list frozen at whatever the categories were that day. Once a
    -- row existed carrying a newer category, ADD CONSTRAINT - which validates
    -- existing rows - rejected it and threw. Everything in this file is sent as
    -- one batched statement, so that single failure silently rolled back every
    -- other migration behind it, including unrelated column additions. Dropping
    -- first and adding once at the end cannot go stale that way.
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

    UPDATE products SET category = 'shampoo' WHERE category = 'soaps';

    -- Laundry products were filed under shampoo, which is where the nav sent
    -- anyone looking for hair care.
    UPDATE products SET category = 'home-care'
      WHERE category = 'shampoo' AND name ILIKE '%laundry%';

    -- 'detergents' only described the laundry pods; renamed so the category
    -- also covers mosquito repellent and anything else for the home.
    UPDATE products SET category = 'home-care' WHERE category = 'detergents';

    ALTER TABLE products ADD CONSTRAINT products_category_check
      CHECK (category IN ('electrolytes', 'shampoo', 'home-care', 'coffee', 'cosmetics'));

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

    ALTER TABLE bundles
      ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS video_url TEXT,
      ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

    -- Bundles moved from a single image_url to a products-style images[]
    -- array (multiple photos + a video, same as regular products) - carry
    -- any existing single image over so it isn't lost.
    UPDATE bundles SET images = ARRAY[image_url]
      WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL);

    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image_url TEXT;

    -- How many numbered shades the shade picker offers for this product.
    -- Null means the picker's own default; cosmetics differ (some have 3,
    -- some 5), so it can't be one number for the whole category.
    ALTER TABLE products ADD COLUMN IF NOT EXISTS shade_count INTEGER;

    -- Caps how many orders a code can be redeemed on (e.g. "first 100
    -- orders") - null means unlimited. Usage is counted live from
    -- orders.promo_code rather than a separate counter column, so it
    -- can never drift out of sync with what actually got redeemed.
    ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER;



    -- Three catalogue rows have never had a photo, so the storefront filters
    -- them out and they cannot be bought - one of them was sitting on 200
    -- units of unsellable stock. Removing them here rather than by hand
    -- because the admin panel is the only other way in.
    --
    -- Deliberately narrow, because this file re-runs on every cold start:
    -- matched by exact name, only while the row still has no image, and only
    -- when nothing references it from an order. So re-uploading a product
    -- under the same name with a photo is safe, and a row with order history
    -- is left alone instead of failing the statement on a foreign key.
    DELETE FROM products p
     WHERE p.name IN (
             'Blush Clay Cleansing Bar',
             'Sandalwood Scalp Renewal Shampoo',
             'Plum Roast Whole Bean Coffee'
           )
       AND (p.images IS NULL OR array_length(p.images, 1) IS NULL)
       AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);

    -- Anything in that list that does have order history can't be deleted, so
    -- take it out of circulation instead - this is what the admin panel tells
    -- you to do in the same situation.
    UPDATE products SET stock = 0
     WHERE name IN (
             'Blush Clay Cleansing Bar',
             'Sandalwood Scalp Renewal Shampoo',
             'Plum Roast Whole Bean Coffee'
           )
       AND (images IS NULL OR array_length(images, 1) IS NULL)
       AND stock > 0;

    -- Numbered shade variants were added to every cosmetic and then reverted.
    -- This clears them out again; the storefront ignores cosmetics variants
    -- anyway, so leaving them would just be dead rows behind the admin UI.
    -- Skips any an order references, so purchase history is never orphaned.
    DELETE FROM product_variants v
     USING products p
     WHERE v.product_id = p.id
       AND p.category = 'cosmetics'
       AND v.variant_name IN ('Shade 1', 'Shade 2', 'Shade 3',
                              'Shade 4', 'Shade 5', 'Shade 6')
       AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.variant_id = v.id);

    -- Shade counts, taken from the "Colour 1..N" variants that were configured
    -- on each of these before variants were dropped - the shop's own numbers
    -- rather than anything inferred from a product photo, which shows how many
    -- units were styled for the shot and not how many shades are stocked.
    -- Hydrating Lip Gloss is 3 per the shop owner, overriding its 5 variants.
    --
    -- Matched on trimmed name because several rows carry stray leading spaces.
    -- Only fills rows still unset, so editing a count in admin sticks instead
    -- of being overwritten on the next cold start.
    UPDATE products p
       SET shade_count = v.count
      FROM (VALUES
             ('Tinted Lip Gloss', 3),
             ('Silver Lip Sticks', 2),
             ('Rabbit Lipstick Pen', 3),
             ('Hydrating Lip Gloss Colorless Makeup', 3),
             ('Lip and Cheek Cream Blush', 3),
             ('Matte Lip Gloss', 3),
             ('Mirror Moisturising 6 Color Lip', 6),
             ('Korean Tint', 2),
             ('Slim Pencil Eyeliner', 3),
             ('Lip Liquid Velvet Liquid Pigment', 4),
             ('Gloss Lipstick', 4),
             ('Cushion Blush', 1),
             ('Colorful Sweet Blush Cream', 3),
             ('Liquid Concealer Cream', 4),
             ('Long Lasting BB Cream', 3),
             ('Brightening Vegan Cheek Face Makeup', 4),
             ('Lip and Cheek Matte Powder', 3),
             ('Pigmented Face Cheek Lip Cream', 4),
             ('Concealers', 3),
             ('Bow Powder Blushes', 3),
             ('Blish Stick', 5),
             ('Cushion Cream', 4),
             ('Jelly Blusher Cream', 4),
             ('Lip Gloss Vegan Soft Matte', 3),
             ('Air Cushion Blush', 4),
             ('Velvet Fog Lip and Cheek (pod)', 3)
           ) AS v(name, count)
     WHERE btrim(p.name) = v.name
       AND p.category = 'cosmetics'
       AND p.shade_count IS NULL;

    -- Seeded as 3 from its old colour variants, but the product is a six
    -- colour lip and offers six. Guarded on the exact value the seed wrote so
    -- it corrects once; setting any other number in admin is left alone.
    UPDATE products SET shade_count = 6
     WHERE btrim(name) = 'Mirror Moisturising 6 Color Lip'
       AND shade_count = 3;

  `, 'core');

  /* Kept out of the core batch: these are the columns that went missing the
     last time one bad statement rolled everything back, while the storefront
     query selecting them shipped in the same release. */
  await runBatch(`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_replied_at TIMESTAMPTZ;
  `, 'reviews-reply');
}

module.exports = { runMigrations };
