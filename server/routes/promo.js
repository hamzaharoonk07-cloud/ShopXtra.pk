const express = require('express');
const promoController = require('../controllers/promoController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/validate', promoController.validate);
router.get('/public', promoController.publicOffers);
router.get('/', requireAuth, requireRole('admin'), promoController.list);
router.post('/', requireAuth, requireRole('admin'), promoController.create);

module.exports = router;
