const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;
const THUMB_MAX_DIMENSION = 480;
const THUMB_WEBP_QUALITY = 72;
const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function randomFilename(ext) {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

async function compressImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

// Grid/listing views only ever display a few hundred CSS px per image, so
// shipping the full 1600px master there wastes most of the download - this
// smaller sibling is what productCardHtml() etc. actually render, with the
// full-size master reserved for the product detail page's zoomed view.
async function compressThumbnail(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: THUMB_MAX_DIMENSION, height: THUMB_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_WEBP_QUALITY })
    .toBuffer();
}

async function storeBuffer(buffer, filename, contentType) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = require('@vercel/blob');
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

async function saveImage(file) {
  let buffer = file.buffer;
  let contentType = file.mimetype;
  let ext = path.extname(file.originalname).toLowerCase();
  const isCompressible = COMPRESSIBLE_TYPES.includes(file.mimetype);

  if (isCompressible) {
    buffer = await compressImage(file.buffer);
    contentType = 'image/webp';
    ext = '.webp';
  }

  const filename = randomFilename(ext);
  const url = await storeBuffer(buffer, filename, contentType);

  if (isCompressible) {
    const thumbBuffer = await compressThumbnail(file.buffer);
    await storeBuffer(thumbBuffer, filename.replace(/\.webp$/, '-thumb.webp'), 'image/webp');
  }

  return url;
}

module.exports = { saveImage, compressImage, compressThumbnail, COMPRESSIBLE_TYPES };
