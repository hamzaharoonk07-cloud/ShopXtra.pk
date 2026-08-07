const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { requireAuth, requireRole, attachUserIfPresent } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const productMedia = upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'video', maxCount: 1 },
]);

router.get('/', productController.list);
router.get('/cart-events', requireAuth, requireRole('admin'), productController.listCartEvents);
router.post('/reset-insights', requireAuth, requireRole('admin'), productController.resetInsights);
router.post('/reviews/seed-testimonials', requireAuth, requireRole('admin'), reviewController.seedAll);
router.get('/:slug/reviews', reviewController.list);
router.post('/:slug/reviews', requireAuth, upload.single('image'), reviewController.create);
router.get('/:slug', productController.getBySlug);
router.post('/:slug/view', attachUserIfPresent, productController.recordView);
router.post('/:slug/cart-add', attachUserIfPresent, productController.recordCartAdd);
router.post('/reprocess-images', requireAuth, requireRole('admin'), productController.reprocessImages);
router.post('/apply-sale', requireAuth, requireRole('admin'), productController.applySale);
router.post('/remove-sale', requireAuth, requireRole('admin'), productController.removeSale);
router.post('/', requireAuth, requireRole('admin'), productMedia, productController.create);
router.put('/:id', requireAuth, requireRole('admin'), productMedia, productController.update);
router.delete('/:id', requireAuth, requireRole('admin'), productController.remove);

router.post('/:id/variants', requireAuth, requireRole('admin'), upload.single('image'), productController.createVariant);
router.put('/:id/variants/:variantId', requireAuth, requireRole('admin'), upload.single('image'), productController.updateVariant);
router.delete('/:id/variants/:variantId', requireAuth, requireRole('admin'), productController.removeVariant);

module.exports = router;
