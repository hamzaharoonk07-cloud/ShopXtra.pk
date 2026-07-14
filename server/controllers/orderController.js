const orderModel = require('../models/orderModel');
const { sendMail } = require('../config/mailer');
const { orderConfirmationEmail, orderStatusEmail } = require('../emails/templates');

async function create(req, res, next) {
  try {
    const { items, shipping, paymentMethod, promoCode, email } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Cart items are required' });
    }
    if (!shipping || !shipping.name || !shipping.phone || !shipping.address || !shipping.city) {
      return res.status(400).json({ error: 'Full shipping details are required' });
    }
    for (const item of items) {
      if (!item.slug || !Number.isInteger(item.qty) || item.qty < 1) {
        return res.status(400).json({ error: 'Each item needs a slug and a positive integer qty' });
      }
    }

    const order = await orderModel.createOrder({
      userId: req.user?.id,
      email: req.user?.email || email,
      items,
      shipping,
      paymentMethod: paymentMethod === 'cod' ? 'cod' : 'cod',
      promoCode,
    });
    res.status(201).json(order);

    if (order.email) {
      const fullOrder = await orderModel.findById(order.id);
      sendMail({
        to: order.email,
        subject: `Order Confirmed #${order.id} — ShopXtra`,
        html: orderConfirmationEmail(fullOrder),
      });
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const orders = await orderModel.findByUserId(req.user.id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

async function listAll(req, res, next) {
  try {
    const orders = await orderModel.findAll();
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const order = await orderModel.updateStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);

    if (order.email && ['shipped', 'delivered', 'processing', 'cancelled'].includes(order.status)) {
      sendMail({
        to: order.email,
        subject: `Order #${order.id} update — ${order.status[0].toUpperCase() + order.status.slice(1)} — ShopXtra`,
        html: orderStatusEmail(order, order.status),
      });
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function track(req, res, next) {
  try {
    const { orderId, phone } = req.body;
    if (!orderId || !phone || !/^\d+$/.test(String(orderId))) {
      return res.status(400).json({ error: 'A valid orderId and phone are required' });
    }
    const order = await orderModel.findById(orderId);
    if (!order || order.shipping_phone.replace(/\D/g, '') !== String(phone).replace(/\D/g, '')) {
      return res.status(404).json({ error: 'No order found matching that order ID and phone number' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function overview(req, res, next) {
  try {
    const data = await orderModel.getOverview();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById, listMine, listAll, updateStatus, overview, track };
