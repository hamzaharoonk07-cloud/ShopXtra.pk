const productModel = require('../models/productModel');
const productViewModel = require('../models/productViewModel');
const cartEventModel = require('../models/cartEventModel');
const { saveImage } = require('../utils/imageStorage');
const { reprocessAllProductImages } = require('../utils/reprocessImages');

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
    // Neon closes idle connections aggressively, so every cold request pays a
    // full TLS handshake before the query even runs (~1s, confirmed by direct
    // timing). Short edge caching means repeat browsing/filtering (the common
    // case) skips the database round-trip entirely instead of eating that
    // delay on every click - the real fix is switching DATABASE_URL to Neon's
    // pooled connection string, but that needs a value only the user has.
    res.set('Cache-Control', 'public, max-age=20, stale-while-revalidate=60');
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const product = await productModel.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.set('Cache-Control', 'public, max-age=20, stale-while-revalidate=60');
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function recordView(req, res, next) {
  try {
    const product = await productModel.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await productViewModel.record(product.id, req.user?.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function recordCartAdd(req, res, next) {
  try {
    const product = await productModel.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await cartEventModel.record(product.id, req.user?.id, Number(req.body?.qty) || 1);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function listCartEvents(req, res, next) {
  try {
    res.json(await cartEventModel.findRecent());
  } catch (err) {
    next(err);
  }
}

async function resetInsights(req, res, next) {
  try {
    await productViewModel.clearAll();
    await cartEventModel.clearAll();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, category, description, price, compare_at_price, stock, is_bestseller } = req.body;
    if (!name || !category || price == null || price === '') {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }
    if (!productModel.CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category: ${category}` });
    }
    const imageFiles = (req.files && req.files.images) || [];
    const videoFile = req.files && req.files.video && req.files.video[0];
    const images = imageFiles.length ? await Promise.all(imageFiles.map(saveImage)) : [];
    const video_url = videoFile ? await saveImage(videoFile) : null;
    const product = await productModel.create({
      name,
      slug: slugify(name),
      category,
      description,
      price: Number(price),
      compare_at_price: compare_at_price ? Number(compare_at_price) : null,
      stock: stock ? Number(stock) : 0,
      images,
      video_url,
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
    const imageFiles = (req.files && req.files.images) || [];
    const videoFile = req.files && req.files.video && req.files.video[0];
    const uploaded = imageFiles.length ? await Promise.all(imageFiles.map(saveImage)) : [];
    if (existingImages || uploaded.length) {
      data.images = [...(existingImages || []), ...uploaded];
    }
    if (videoFile) {
      data.video_url = await saveImage(videoFile);
    } else if (data.removeVideo === 'true') {
      data.video_url = null;
    }
    delete data.removeVideo;
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

/* Normalises the target of a sale operation into either null ("every product")
   or an array of ids. Accepts the older single `productId` shape as well as the
   newer `productIds` list, so an admin page cached in someone's browser keeps
   working after this deploys. Returns { error } for the caller to surface. */
function saleTargetIds({ scope, productId, productIds }) {
  if (!['all', 'product', 'products'].includes(scope)) {
    return { error: 'scope must be "all", "product" or "products"' };
  }
  if (scope === 'all') return { ids: null };

  const raw = scope === 'products' ? productIds : [productId];
  const ids = (Array.isArray(raw) ? raw : [raw])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  if (!ids.length) {
    return { error: scope === 'products' ? 'Select at least one product.' : 'productId is required when scope is "product"' };
  }
  return { ids };
}

async function applySale(req, res, next) {
  try {
    const { scope, discountType, discountValue, maxDiscount } = req.body;
    if (!['flat', 'percent', 'percent_capped'].includes(discountType)) {
      return res.status(400).json({ error: 'discountType must be "flat", "percent" or "percent_capped"' });
    }

    const target = saleTargetIds(req.body);
    if (target.error) return res.status(400).json({ error: target.error });

    const value = Number(discountValue);
    if (!value || value <= 0) {
      return res.status(400).json({ error: 'discountValue must be greater than 0' });
    }
    if (discountType !== 'flat' && value >= 100) {
      return res.status(400).json({ error: 'Percent discount must be less than 100' });
    }

    const cap = Number(maxDiscount);
    if (discountType === 'percent_capped' && (!cap || cap <= 0)) {
      return res.status(400).json({ error: 'maxDiscount must be greater than 0 for a capped percent sale' });
    }

    const updated = await productModel.applySale({
      productIds: target.ids,
      discountType,
      discountValue: value,
      maxDiscount: discountType === 'percent_capped' ? cap : null,
    });
    res.json({ updated });
  } catch (err) {
    next(err);
  }
}

async function removeSale(req, res, next) {
  try {
    const target = saleTargetIds(req.body);
    if (target.error) return res.status(400).json({ error: target.error });

    const updated = await productModel.removeSale({ productIds: target.ids });
    res.json({ updated });
  } catch (err) {
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

async function reprocessImages(req, res, next) {
  try {
    const report = await reprocessAllProductImages();
    res.json(report);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getBySlug, recordView, recordCartAdd, listCartEvents, resetInsights, create, update, remove, applySale, removeSale, createVariant, updateVariant, removeVariant, reprocessImages };
