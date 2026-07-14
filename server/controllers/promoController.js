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
    const { code, discountType, discountValue, isPublicOffer } = req.body;
    if (!code || !['percent', 'flat'].includes(discountType) || !(discountValue > 0)) {
      return res.status(400).json({ error: 'code, discountType (percent|flat), and a positive discountValue are required' });
    }
    const promo = await promoModel.create({ code, discountType, discountValue, isPublicOffer });
    res.status(201).json(promo);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A promo code with this name already exists' });
    next(err);
  }
}

module.exports = { validate, list, publicOffers, create };
