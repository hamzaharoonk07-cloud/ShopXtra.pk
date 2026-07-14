const express = require('express');
const bundleModel = require('../models/bundleModel');

const router = express.Router();

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

module.exports = router;
