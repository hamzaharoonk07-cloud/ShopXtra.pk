const pool = require('./db');

async function runMigrations() {
  await pool.query(`
    ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS color_name VARCHAR(60),
      ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7),
      ADD COLUMN IF NOT EXISTS image_url TEXT
  `);
}

module.exports = { runMigrations };
