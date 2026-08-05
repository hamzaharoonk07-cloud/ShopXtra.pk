const pool = require('../config/db');
const { compressImage, compressThumbnail, COMPRESSIBLE_TYPES } = require('./imageStorage');

async function uploadThumb(original, filename) {
  const thumb = await compressThumbnail(original);
  const { put } = require('@vercel/blob');
  await put(filename.replace(/\.webp$/, '-thumb.webp'), thumb, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

async function reprocessUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const contentType = res.headers.get('content-type');
  if (!COMPRESSIBLE_TYPES.includes(contentType)) {
    return { skipped: true, reason: contentType };
  }
  const original = Buffer.from(await res.arrayBuffer());
  const compressed = await compressImage(original);
  if (compressed.length >= original.length) {
    // Already compressed by a prior pass - still worth generating the
    // thumbnail sibling if this run predates the thumbnail feature.
    const filename = url.split('/').pop().split('?')[0];
    await uploadThumb(original, filename);
    return { skipped: true, reason: 'already smaller', originalBytes: original.length };
  }

  const { put } = require('@vercel/blob');
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}.webp`;
  const blob = await put(filename, compressed, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  await uploadThumb(original, filename);

  return { newUrl: blob.url, originalBytes: original.length, compressedBytes: compressed.length };
}

async function reprocessAllProductImages() {
  const { rows: products } = await pool.query(
    'SELECT id, name, images FROM products WHERE images IS NOT NULL AND array_length(images, 1) > 0'
  );

  const report = { totalBefore: 0, totalAfter: 0, processed: 0, products: [] };

  for (const product of products) {
    const newImages = [];
    let changed = false;
    const entries = [];

    for (const url of product.images) {
      try {
        const result = await reprocessUrl(url);
        if (result.skipped) {
          newImages.push(url);
          entries.push({ url, skipped: true, reason: result.reason });
          continue;
        }
        newImages.push(result.newUrl);
        changed = true;
        report.totalBefore += result.originalBytes;
        report.totalAfter += result.compressedBytes;
        report.processed++;
        entries.push({ originalBytes: result.originalBytes, compressedBytes: result.compressedBytes });
      } catch (err) {
        newImages.push(url);
        entries.push({ url, error: err.message });
      }
    }

    if (changed) {
      await pool.query('UPDATE products SET images = $1 WHERE id = $2', [newImages, product.id]);
    }
    report.products.push({ id: product.id, name: product.name, entries });
  }

  return report;
}

module.exports = { reprocessAllProductImages };
