const promoModel = require('../models/promoModel');

async function validate(req, res, next) {
  try {
    const { code, subtotal } = req.body;
    if (!code || subtotal == null) {
      return res.status(400).json({ error: 'code and subtotal are required' });
    }
    const promo = await promoModel.findByCode(code);
    if (!promo) {
      return res.status(404).json({ error: 'Invalid or expired promo code' });
    }
    const discount = promoModel.computeDiscount(promo, Number(subtotal));
    res.json({
      code: promo.code,
      discountType: promo.discount_type,
      discountValue: Number(promo.discount_value),
      discountAmount: discount,
      finalTotal: Number(subtotal) - discount,
      giftProduct: promo.discount_type === 'free_gift' ? {
        name: promo.gift_product_name,
        slug: promo.gift_product_slug,
        image: (promo.gift_product_images && promo.gift_product_images[0]) || null,
      } : null,
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await promoModel.findAll());
  } catch (err) {
    next(err);
  }
}

async function publicOffers(req, res, next) {
  try {
    res.json(await promoModel.findPublicOffers());
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { code, discountType, discountValue, isPublicOffer, giftProductId } = req.body;
    if (!code || !['percent', 'flat', 'free_gift'].includes(discountType)) {
      return res.status(400).json({ error: 'code and discountType (percent|flat|free_gift) are required' });
    }
    if (discountType === 'free_gift') {
      if (!giftProductId) {
        return res.status(400).json({ error: 'giftProductId is required for a free-gift promo code' });
      }
    } else if (!(discountValue > 0)) {
      return res.status(400).json({ error: 'A positive discountValue is required' });
    }
    const promo = await promoModel.create({
      code,
      discountType,
      discountValue: discountType === 'free_gift' ? 0 : discountValue,
      isPublicOffer,
      giftProductId: discountType === 'free_gift' ? giftProductId : null,
    });
    res.status(201).json(promo);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A promo code with this name already exists' });
    next(err);
  }
}

async function setActive(req, res, next) {
  try {
    const { active } = req.body;
    const promo = await promoModel.setActive(req.params.id, !!active);
    if (!promo) return res.status(404).json({ error: 'Promo code not found' });
    res.json(promo);
  } catch (err) {
    next(err);
  }
}

module.exports = { validate, list, publicOffers, create, setActive };
