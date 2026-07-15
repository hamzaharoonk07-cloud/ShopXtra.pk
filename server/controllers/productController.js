const productModel = require('../models/productModel');
const { saveImage } = require('../utils/imageStorage');

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function list(req, res, next) {
  try {
    const { category, minPrice, maxPrice, sort, search, sale } = req.query;
    if (category && !productModel.CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category: ${category}` });
    }
    const products = await productModel.findAll({
      category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
      search,
      onSale: sale === 'true',
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const product = await productModel.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, category, description, price, compare_at_price, stock, ingredients, is_bestseller } = req.body;
    if (!name || !category || price == null || price === '') {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }
    if (!productModel.CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category: ${category}` });
    }
    const uploaded = req.files && req.files.length ? await Promise.all(req.files.map(saveImage)) : [];
    const images = uploaded;
    const product = await productModel.create({
      name,
      slug: slugify(name),
      category,
      description,
      price: Number(price),
      compare_at_price: compare_at_price ? Number(compare_at_price) : null,
      stock: stock ? Number(stock) : 0,
      images,
      ingredients,
      is_bestseller: is_bestseller === 'true' || is_bestseller === true,
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A product with this name already exists' });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    const existingImages = data.existingImages ? JSON.parse(data.existingImages) : undefined;
    delete data.existingImages;
    const uploaded = req.files && req.files.length ? await Promise.all(req.files.map(saveImage)) : [];
    if (existingImages || uploaded.length) {
      data.images = [...(existingImages || []), ...uploaded];
    }
    if (data.price != null && data.price !== '') data.price = Number(data.price);
    if (data.compare_at_price === '') data.compare_at_price = null;
    else if (data.compare_at_price != null) data.compare_at_price = Number(data.compare_at_price);
    if (data.stock != null && data.stock !== '') data.stock = Number(data.stock);
    if (data.is_bestseller != null) data.is_bestseller = data.is_bestseller === 'true' || data.is_bestseller === true;

    const product = await productModel.update(req.params.id, data);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await productModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'This product has existing orders and cannot be deleted. Set its stock to 0 to stop selling it instead.',
      });
    }
    next(err);
  }
}

async function createVariant(req, res, next) {
  try {
    const { variant_name, color_name, color_hex, price_modifier, stock } = req.body;
    if (!variant_name) return res.status(400).json({ error: 'variant_name is required' });

    const image_url = req.file ? await saveImage(req.file) : (req.body.image_url || null);

    const variant = await productModel.createVariant(req.params.id, {
      variant_name,
      color_name,
      color_hex,
      price_modifier: price_modifier ? Number(price_modifier) : 0,
      stock: stock ? Number(stock) : 0,
      image_url,
    });
    res.status(201).json(variant);
  } catch (err) {
    next(err);
  }
}

async function updateVariant(req, res, next) {
  try {
    const data = { ...req.body };
    if (req.file) data.image_url = await saveImage(req.file);
    if (data.price_modifier != null && data.price_modifier !== '') data.price_modifier = Number(data.price_modifier);
    if (data.stock != null && data.stock !== '') data.stock = Number(data.stock);

    const variant = await productModel.updateVariant(req.params.variantId, data);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    res.json(variant);
  } catch (err) {
    next(err);
  }
}

async function removeVariant(req, res, next) {
  try {
    const deleted = await productModel.removeVariant(req.params.variantId);
    if (!deleted) return res.status(404).json({ error: 'Variant not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getBySlug, create, update, remove, createVariant, updateVariant, removeVariant };
