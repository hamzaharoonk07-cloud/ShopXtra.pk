const express = require('express');
const addressModel = require('../models/addressModel');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await addressModel.findByUserId(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { line1, city, postal_code, is_default } = req.body;
    if (!line1 || !city) return res.status(400).json({ error: 'line1 and city are required' });
    const address = await addressModel.create(req.user.id, { line1, city, postal_code, is_default });
    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await addressModel.remove(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Address not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/default', async (req, res, next) => {
  try {
    const address = await addressModel.setDefault(req.user.id, req.params.id);
    if (!address) return res.status(404).json({ error: 'Address not found' });
    res.json(address);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
