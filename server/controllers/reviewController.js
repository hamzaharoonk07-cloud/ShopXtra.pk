const reviewModel = require('../models/reviewModel');

async function list(req, res, next) {
  try {
    const data = await reviewModel.findByProductSlug(req.params.slug);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { rating, comment } = req.body;
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    const review = await reviewModel.create({
      slug: req.params.slug,
      userId: req.user.id,
      rating: ratingNum,
      comment,
    });
    if (!review) return res.status(404).json({ error: 'Product not found' });
    res.status(201).json(review);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }
    next(err);
  }
}

module.exports = { list, create };
