const bannerModel = require('../models/bannerModel');
const { saveImage } = require('../utils/imageStorage');

async function getActive(req, res, next) {
  try {
    const banner = await bannerModel.findActive();
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const banners = await bannerModel.findAll();
    res.json(banners);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, message, linkUrl, active } = req.body;
    if (!title) return res.status(400).json({ error: 'A title is required' });
    const imageUrl = req.file ? await saveImage(req.file) : null;
    const banner = await bannerModel.create({
      imageUrl,
      title,
      message,
      linkUrl,
      active: active === 'true' || active === true,
    });
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
}

async function activate(req, res, next) {
  try {
    const banner = await bannerModel.setActive(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const banner = await bannerModel.deactivate(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await bannerModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Banner not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { getActive, list, create, activate, deactivate, remove };
