const express = require('express');
const bundleModel = require('../models/bundleModel');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { saveImage } = require('../utils/imageStorage');

const router = express.Router();

const bundleMedia = upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'video', maxCount: 1 },
]);

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await bundleModel.findAll());
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const bundle = await bundleModel.findBySlug(req.params.slug);
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json(bundle);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('admin'), bundleMedia, async (req, res, next) => {
  try {
    const { name, description, price, stock } = req.body;
    if (!name || price == null || price === '' || Number.isNaN(Number(price))) {
      return res.status(400).json({ error: 'A name and price are required' });
    }
    const imageFiles = (req.files && req.files.images) || [];
    const videoFile = req.files && req.files.video && req.files.video[0];
    const images = imageFiles.length ? await Promise.all(imageFiles.map(saveImage)) : [];
    const videoUrl = videoFile ? await saveImage(videoFile) : null;
    const bundle = await bundleModel.create({
      name,
      slug: slugify(name),
      description,
      price: Number(price),
      stock: stock ? Number(stock) : 0,
      images,
      videoUrl,
    });
    res.status(201).json(bundle);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A bundle with a similar name already exists' });
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin'), bundleMedia, async (req, res, next) => {
  try {
    const data = { ...req.body };
    const existingImages = data.existingImages ? JSON.parse(data.existingImages) : undefined;
    delete data.existingImages;
    const imageFiles = (req.files && req.files.images) || [];
    const videoFile = req.files && req.files.video && req.files.video[0];
    const uploaded = imageFiles.length ? await Promise.all(imageFiles.map(saveImage)) : [];
    const images = existingImages || uploaded.length ? [...(existingImages || []), ...uploaded] : undefined;
    let videoUrl;
    if (videoFile) videoUrl = await saveImage(videoFile);
    else if (data.removeVideo === 'true') videoUrl = null;

    const bundle = await bundleModel.update(req.params.id, {
      name: data.name,
      slug: data.name ? slugify(data.name) : undefined,
      description: data.description,
      price: data.price != null && data.price !== '' ? Number(data.price) : undefined,
      stock: data.stock != null && data.stock !== '' ? Number(data.stock) : undefined,
      images,
      videoUrl,
    });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json(bundle);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const deleted = await bundleModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Bundle not found' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'This bundle has existing orders and cannot be deleted. Remove it from the storefront by other means instead.',
      });
    }
    next(err);
  }
});

module.exports = router;
