const express = require('express');
const wishlistModel = require('../models/wishlistModel');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await wishlistModel.findByUserId(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: 'slug is required' });
    const added = await wishlistModel.add(req.user.id, slug);
    if (!added) return res.status(404).json({ error: 'Product not found' });
    res.status(201).json({ message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:slug', requireAuth, async (req, res, next) => {
  try {
    await wishlistModel.remove(req.user.id, req.params.slug);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
