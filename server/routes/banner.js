const express = require('express');
const bannerController = require('../controllers/bannerController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/active', bannerController.getActive);
router.get('/', requireAuth, requireRole('admin'), bannerController.list);
router.post('/', requireAuth, requireRole('admin'), upload.single('image'), bannerController.create);
router.patch('/:id/activate', requireAuth, requireRole('admin'), bannerController.activate);
router.patch('/:id/deactivate', requireAuth, requireRole('admin'), bannerController.deactivate);
router.delete('/:id', requireAuth, requireRole('admin'), bannerController.remove);

module.exports = router;
