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
router.delete('/:id', requireAuth, requireRole('admin'), orderController.remove);
// Declared before '/:id' would matter for GETs; kept here with the other admin
// POSTs since 'reset' is not a valid :id for this verb anyway.
router.post('/reset', requireAuth, requireRole('admin'), orderController.resetAll);
router.get('/:id', attachUserIfPresent, orderController.getById);

module.exports = router;
