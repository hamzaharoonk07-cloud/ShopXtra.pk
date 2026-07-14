const express = require('express');
const orderController = require('../controllers/orderController');
const { requireAuth, requireRole, attachUserIfPresent } = require('../middleware/auth');

const router = express.Router();

router.post('/', attachUserIfPresent, orderController.create);
router.post('/track', orderController.track);
router.get('/mine', requireAuth, orderController.listMine);
router.get('/overview', requireAuth, requireRole('admin'), orderController.overview);
router.get('/', requireAuth, requireRole('admin'), orderController.listAll);
router.patch('/:id/status', requireAuth, requireRole('admin'), orderController.updateStatus);
router.get('/:id', orderController.getById);

module.exports = router;
