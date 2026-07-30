const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;
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

async function saveImage(file) {
  let buffer = file.buffer;
  let contentType = file.mimetype;
  let ext = path.extname(file.originalname).toLowerCase();

  if (COMPRESSIBLE_TYPES.includes(file.mimetype)) {
    buffer = await compressImage(file.buffer);
    contentType = 'image/webp';
    ext = '.webp';
  }

  const filename = randomFilename(ext);

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

module.exports = { saveImage, compressImage, COMPRESSIBLE_TYPES };
