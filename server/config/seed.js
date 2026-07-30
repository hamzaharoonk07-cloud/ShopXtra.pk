require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('./db');

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const products = [
  // Electrolytes (morning)
  { name: 'Citrus Sunrise Electrolyte Mix', category: 'electrolytes', price: 950, stock: 120, is_bestseller: true,
    description: 'A bright citrus electrolyte blend to start your morning ritual hydrated and energized.' },
  { name: 'Rose Hibiscus Hydration Sachets', category: 'electrolytes', price: 1050, stock: 80,
    description: 'Floral hibiscus electrolytes with a delicate rose note, box of 14 sachets.' },
  // Coffee (morning)
  { name: 'Plum Roast Whole Bean Coffee', category: 'coffee', price: 1650, stock: 60, is_bestseller: true,
    description: 'Medium-dark roast whole beans with notes of stone fruit and cocoa.' },
  { name: 'Gold Dust Instant Coffee Sachets', category: 'coffee', price: 890, stock: 150,
    description: 'Smooth instant coffee for a quick, premium morning cup, box of 10.' },
  // Shampoo (midday)
  { name: 'Blush Clay Cleansing Bar', category: 'shampoo', price: 650, stock: 200,
    description: 'A gentle pink clay soap bar that cleanses without stripping natural oils.' },
  { name: 'Gold Honey Oat Soap', category: 'shampoo', price: 700, stock: 140, is_bestseller: true,
    description: 'Nourishing honey and oat soap bar for soft, calm skin.' },
  // Cosmetics (evening)
  { name: 'Plum Velvet Matte Lipstick', category: 'cosmetics', price: 1250, stock: 100,
    description: 'A rich plum-toned matte lipstick for an elegant evening look.' },
  { name: 'Dusty Rose Cream Blush', category: 'cosmetics', price: 1150, stock: 85,
    description: 'A soft, buildable cream blush that gives a natural evening flush.' },
];

async function seed() {
  console.log('Seeding products...');
  for (const p of products) {
    const slug = slugify(p.name);
    await pool.query(
      `INSERT INTO products (name, slug, category, description, price, stock, is_bestseller)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING`,
      [p.name, slug, p.category, p.description, p.price, p.stock, p.is_bestseller || false]
    );
  }
  const { rows } = await pool.query('SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY category');
  console.table(rows);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
