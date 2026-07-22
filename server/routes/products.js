const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const productMedia = upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'video', maxCount: 1 },
]);

router.get('/', productController.list);
router.get('/:slug/reviews', reviewController.list);
router.post('/:slug/reviews', requireAuth, reviewController.create);
router.get('/:slug', productController.getBySlug);
router.post('/', requireAuth, requireRole('admin'), productMedia, productController.create);
router.put('/:id', requireAuth, requireRole('admin'), productMedia, productController.update);
router.delete('/:id', requireAuth, requireRole('admin'), productController.remove);

router.post('/:id/variants', requireAuth, requireRole('admin'), upload.single('image'), productController.createVariant);
router.put('/:id/variants/:variantId', requireAuth, requireRole('admin'), upload.single('image'), productController.updateVariant);
router.delete('/:id/variants/:variantId', requireAuth, requireRole('admin'), productController.removeVariant);

module.exports = router;
