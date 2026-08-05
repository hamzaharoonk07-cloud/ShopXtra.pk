const express = require('express');
const bundleModel = require('../models/bundleModel');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { saveImage } = require('../utils/imageStorage');

const router = express.Router();

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

router.post('/', requireAuth, requireRole('admin'), upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, price } = req.body;
    if (!name || price == null || price === '' || Number.isNaN(Number(price))) {
      return res.status(400).json({ error: 'A name and price are required' });
    }
    const imageUrl = req.file ? await saveImage(req.file) : null;
    const bundle = await bundleModel.create({
      name,
      slug: slugify(name),
      description,
      price: Number(price),
      imageUrl,
    });
    res.status(201).json(bundle);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A bundle with a similar name already exists' });
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin'), upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, price } = req.body;
    const imageUrl = req.file ? await saveImage(req.file) : undefined;
    const bundle = await bundleModel.update(req.params.id, {
      name,
      slug: name ? slugify(name) : undefined,
      description,
      price: price != null && price !== '' ? Number(price) : undefined,
      imageUrl,
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
