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
    const { name, description, discountPercent } = req.body;
    const productIds = req.body.productIds ? JSON.parse(req.body.productIds) : [];
    if (!name || !Array.isArray(productIds) || !productIds.length) {
      return res.status(400).json({ error: 'A name and at least one product are required' });
    }
    const imageUrl = req.file ? await saveImage(req.file) : null;
    const bundle = await bundleModel.create({
      name,
      slug: slugify(name),
      description,
      discountPercent: discountPercent != null ? Number(discountPercent) : 10,
      productIds: productIds.map(Number),
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
    const { name, description, discountPercent } = req.body;
    const productIds = req.body.productIds ? JSON.parse(req.body.productIds) : undefined;
    const imageUrl = req.file ? await saveImage(req.file) : undefined;
    const bundle = await bundleModel.update(req.params.id, {
      name,
      slug: name ? slugify(name) : undefined,
      description,
      discountPercent: discountPercent != null ? Number(discountPercent) : undefined,
      productIds: Array.isArray(productIds) ? productIds.map(Number) : undefined,
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
    next(err);
  }
});

module.exports = router;
