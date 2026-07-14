const express = require('express');
const userModel = require('../models/userModel');
const orderModel = require('../models/orderModel');
const addressModel = require('../models/addressModel');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res, next) => {
  try {
    res.json(await userModel.findAll());
  } catch (err) {
    next(err);
  }
});

router.get('/:id/detail', async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [orders, addresses] = await Promise.all([
      orderModel.findByUserId(req.params.id),
      addressModel.findByUserId(req.params.id),
    ]);
    res.json({ user, orders, addresses });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be customer or admin' });
    }
    const user = await userModel.setRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
