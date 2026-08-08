const reviewModel = require('../models/reviewModel');
const { saveImage } = require('../utils/imageStorage');

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
    const imageUrl = req.file ? await saveImage(req.file) : null;
    const review = await reviewModel.create({
      slug: req.params.slug,
      userId: req.user.id,
      rating: ratingNum,
      comment,
      imageUrl,
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

async function listRecent(req, res, next) {
  try {
    res.json(await reviewModel.findRecent(3));
  } catch (err) {
    next(err);
  }
}

async function listAllForAdmin(req, res, next) {
  try {
    res.json(await reviewModel.findAllForAdmin());
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await reviewModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Review not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function reply(req, res, next) {
  try {
    const updated = await reviewModel.setAdminReply(req.params.id, req.body?.reply);
    if (!updated) return res.status(404).json({ error: 'Review not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, listRecent, listAllForAdmin, remove, reply };
