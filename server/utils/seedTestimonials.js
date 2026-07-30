const bcrypt = require('bcrypt');
const pool = require('../config/db');

const REVIEWERS = [
  { name: 'Ayesha Khan', email: 'ayesha.khan@shopxtra.reviews' },
  { name: 'Bilal Ahmed', email: 'bilal.ahmed@shopxtra.reviews' },
  { name: 'Fatima Raza', email: 'fatima.raza@shopxtra.reviews' },
  { name: 'Usman Tariq', email: 'usman.tariq@shopxtra.reviews' },
  { name: 'Sana Malik', email: 'sana.malik@shopxtra.reviews' },
  { name: 'Hamza Sheikh', email: 'hamza.sheikh@shopxtra.reviews' },
  { name: 'Zainab Iqbal', email: 'zainab.iqbal@shopxtra.reviews' },
  { name: 'Ali Hassan', email: 'ali.hassan@shopxtra.reviews' },
  { name: 'Mahnoor Farooq', email: 'mahnoor.farooq@shopxtra.reviews' },
  { name: 'Omar Siddiqui', email: 'omar.siddiqui@shopxtra.reviews' },
];

const RATINGS = [5, 5, 4, 5, 5, 4, 5, 3, 5, 4];

const COMMENTS_BY_CATEGORY = {
  electrolytes: [
    'Keeps me hydrated all day, even after long gym sessions.',
    "Mixes so easily and actually tastes good, not chalky at all.",
    'My go-to after a long day out in the heat.',
    'Noticed less fatigue since I started using this daily.',
    'Great value, one sachet lasts me the whole day.',
    'Perfect for Ramadan, helps a lot after suhoor.',
    'Tastes amazing, kids in the house love it too.',
    "Been ordering this every month now, never disappoints.",
    'Helped a lot during summer, no more headaches from dehydration.',
    'Better than the imported brands I used to buy for double the price.',
  ],
  coffee: [
    "Tastes just like café coffee, can't believe it's instant.",
    'Rich aroma, perfect way to start the morning.',
    'Smooth taste, no bitterness at all.',
    'My whole family switched to this after trying it once.',
    'Great with milk or just black, both taste amazing.',
    'Finally a local coffee that tastes premium.',
    'Ordered a second jar within a week, that good.',
    'Perfect balance of strength and flavor.',
    'Goes so well with evening chai time snacks.',
    'Better than the imported jars I used to buy before.',
  ],
  shampoo: [
    'Left my hair so soft, and the scent lasts for hours.',
    'No more dryness, my scalp feels so much healthier now.',
    'A little goes a long way, this bar lasts forever.',
    'Smells incredible without being too strong.',
    'Switched from bottled shampoo and never going back.',
    'Gentle enough for daily use, no irritation at all.',
    'My hair fall reduced noticeably within two weeks.',
    "Perfect for our hard tap water, really works.",
    'Travel friendly too, no leaks or spills like bottles.',
    'Great lather, small amount cleans really well.',
  ],
  cosmetics: [
    'Shade matched perfectly with my skin tone.',
    'Lasted all day without needing touch-ups.',
    'Blends so smoothly, looks natural on camera too.',
    'Quality feels premium, definitely worth the price.',
    'Perfect for everyday wear, not heavy at all.',
    'Packaging is beautiful and the product performs even better.',
    'Got so many compliments the first time I wore it.',
    "Doesn't dry out my lips like other brands.",
    'Exactly as pictured on the website, very happy.',
    'My new everyday go-to, ordering more shades soon.',
  ],
};

function randomPastDate(maxDaysAgo) {
  const days = Math.random() * maxDaysAgo;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function ensureReviewers() {
  const ids = [];
  for (const reviewer of REVIEWERS) {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [reviewer.email]);
    if (rows[0]) {
      ids.push(rows[0].id);
      continue;
    }
    const password_hash = await bcrypt.hash(`${reviewer.email}-${Date.now()}-${Math.random()}`, 10);
    const { rows: inserted } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'customer') RETURNING id`,
      [reviewer.name, reviewer.email, password_hash]
    );
    ids.push(inserted[0].id);
  }
  return ids;
}

async function seedTestimonials() {
  const reviewerIds = await ensureReviewers();
  const { rows: products } = await pool.query('SELECT id, category FROM products');

  let inserted = 0;
  for (let p = 0; p < products.length; p++) {
    const product = products[p];
    const comments = COMMENTS_BY_CATEGORY[product.category] || COMMENTS_BY_CATEGORY.electrolytes;
    for (let i = 0; i < reviewerIds.length; i++) {
      const comment = comments[(i + p) % comments.length];
      const rating = RATINGS[(i + p) % RATINGS.length];
      const { rowCount } = await pool.query(
        `INSERT INTO reviews (product_id, user_id, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (product_id, user_id) DO NOTHING`,
        [product.id, reviewerIds[i], rating, comment, randomPastDate(90)]
      );
      inserted += rowCount;
    }
  }
  return { reviewers: reviewerIds.length, products: products.length, inserted };
}

module.exports = { seedTestimonials };
