const express = require('express');
const bundleModel = require('../models/bundleModel');
const { requireAuth, requireRole } = require('../middleware/auth');

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

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description, ritualTime, discountPercent, productIds } = req.body;
    if (!name || !ritualTime || !Array.isArray(productIds) || !productIds.length) {
      return res.status(400).json({ error: 'A name, ritual time, and at least one product are required' });
    }
    const bundle = await bundleModel.create({
      name,
      slug: slugify(name),
      description,
      ritualTime,
      discountPercent: discountPercent != null ? Number(discountPercent) : 10,
      productIds: productIds.map(Number),
    });
    res.status(201).json(bundle);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A bundle with a similar name already exists' });
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description, ritualTime, discountPercent, productIds } = req.body;
    const bundle = await bundleModel.update(req.params.id, {
      name,
      slug: name ? slugify(name) : undefined,
      description,
      ritualTime,
      discountPercent: discountPercent != null ? Number(discountPercent) : undefined,
      productIds: Array.isArray(productIds) ? productIds.map(Number) : undefined,
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
