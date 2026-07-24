require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const pool = require('./db');
const { saveImage } = require('../utils/imageStorage');

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Local paths to the images downloaded from the ShopXtra product Drive folder.
// Update IMAGE_DIR if you've moved the files elsewhere.
const IMAGE_DIR = 'C:\\Users\\LINKTR~1\\AppData\\Local\\Temp\\claude\\C--WINDOWS-system32\\d3cde461-0396-4c65-b15b-5ecac6b126e4\\scratchpad\\product-images';

const products = [
  {
    name: 'Jelly Blush Stick — Waterproof, Long-Lasting',
    category: 'cosmetics',
    price: 1800,
    stock: 50,
    description: 'A jelly-soft blush stick that blends with a fingertip for a natural, dewy flush. Waterproof and long-lasting, in a shade for every skin tone.',
    imageFiles: [
      '19vWdqDNyBWIIifqHda21s4qVsvoqK4sM_01.jpg',
      '1yLQiBP4clZ3IorbY_HIFgYFycWKLn5wC_02.jpg',
      '1ACm3YMcChh7hibKyGQfAj8jAdYD-VXCe_03.jpg',
    ],
  },
  {
    name: 'Air Cushion CC Cream — Brightening, Lightweight',
    category: 'cosmetics',
    price: 1800,
    stock: 50,
    description: 'A lightweight air-cushion CC cream that brightens and evens tone in one tap, with buildable, breathable coverage that lasts all day.',
    imageFiles: [
      '1erhAKXpztDQR6CwEgroiPpOguhj_8hWf_02.jpg',
      '1iSjofKpWtRQ6bGjr0p0NMw9HLBQFuieu_04.jpg',
      '1ZL3FL6t_OOqQqGaGr6IiQhmxZ35V6GfZ_05.jpg',
    ],
  },
  {
    name: 'Velvet Matte Air Lip Mud',
    category: 'cosmetics',
    price: 1800,
    stock: 50,
    description: 'A featherlight matte lip mud with rich, blurred-out colour payoff — no dryness, no stickiness, just a soft-focus matte finish.',
    imageFiles: [
      '1N0_iGsR2MK5gnWmHsYtmzWxxYg7Uf9UQ_LIPSTICK 1.jpg',
      '1NR2bQ9FL4ts3lnosTZryP3_vXVrnWv2N_LIPSTICK 2.jpg',
      '18_7PiTFN8PjTzFuMuIPBoMC6u7Y0kZDn_LIPSTICK 3.jpg',
    ],
  },
  {
    name: 'Long-Wear Concealer — 5 Shades',
    category: 'cosmetics',
    price: 1800,
    stock: 50,
    description: 'A long-wear concealer that covers without creasing, in five shades from Ivory to Mocha to match every skin tone.',
    imageFiles: [
      '1TlZcoS58qkA6id0Idgbhf-WZ77ubLzqn_1.jpg',
      '1Je4_0rQGbDCZxImHMS6m5xNrZhXP4bZo_2.jpg',
      '1s1wfjMFgtqJqoYThc7DxvYuLOIgi3O3b_Ivory Sandy Beige Neutral Tan Caramel Mocha.png',
    ],
  },
];

function mimeTypeFor(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.png' ? 'image/png' : 'image/jpeg';
}

async function run() {
  for (const p of products) {
    console.log(`Uploading images for: ${p.name}`);
    const imageUrls = [];
    for (const filename of p.imageFiles) {
      const filePath = path.join(IMAGE_DIR, filename);
      const buffer = fs.readFileSync(filePath);
      const url = await saveImage({
        originalname: filename,
        buffer,
        mimetype: mimeTypeFor(filename),
      });
      imageUrls.push(url);
    }

    const slug = slugify(p.name);
    await pool.query(
      `INSERT INTO products (name, slug, category, description, price, stock, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET images = EXCLUDED.images`,
      [p.name, slug, p.category, p.description, p.price, p.stock, imageUrls]
    );
    console.log(`  -> saved as /pages/product.html?slug=${slug} with ${imageUrls.length} images`);
  }
  await pool.end();
  console.log('Done. Ingredients were not provided by the supplier — add the real INCI list per product in the admin panel before relying on it for allergy-sensitive customers.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
