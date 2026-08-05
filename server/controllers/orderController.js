const orderModel = require('../models/orderModel');
const { sendMail } = require('../config/mailer');
const { orderConfirmationEmail, orderStatusEmail } = require('../emails/templates');

async function create(req, res, next) {
  try {
    const { items, shipping, paymentMethod, promoCode, email, notes } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Cart items are required' });
    }
    if (!shipping || !shipping.name || !shipping.phone || !shipping.address || !shipping.city || !shipping.postalCode) {
      return res.status(400).json({ error: 'Full shipping details, including postal code, are required' });
    }
    if (!req.user?.email && !email) {
      return res.status(400).json({ error: 'Email is required' });
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
      notes,
    });

    if (order.email) {
      const fullOrder = await orderModel.findById(order.id);
      await Promise.all([
        sendMail({
          to: order.email,
          subject: `Order Confirmed #${order.id} | ShopXtra`,
          html: orderConfirmationEmail(fullOrder),
        }),
        sendMail({
          to: 'shopxtra9@gmail.com',
          subject: `New order #${order.id} placed | ShopXtra`,
          html: orderConfirmationEmail(fullOrder),
        }),
      ]);
    }

    res.status(201).json(order);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // This is hit publicly right after checkout (order-confirmation page) and
    // from the track-order page, so it can't require login - but without some
    // check anyone could enumerate sequential order IDs and read every
    // customer's name, phone and address. Require either being the logged-in
    // owner or knowing the order's phone number, same as /track.
    const isOwner = req.user && order.user_id === req.user.id;
    const isAdmin = req.user?.role === 'admin';
    const phone = req.query.phone;
    const phoneMatches = phone && order.shipping_phone.replace(/\D/g, '') === String(phone).replace(/\D/g, '');
    if (!isOwner && !isAdmin && !phoneMatches) {
      return res.status(404).json({ error: 'Order not found' });
    }

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

    if (order.email && ['shipped', 'delivered', 'processing', 'cancelled'].includes(order.status)) {
      await sendMail({
        to: order.email,
        subject: `Order #${order.id} update: ${order.status[0].toUpperCase() + order.status.slice(1)} | ShopXtra`,
        html: orderStatusEmail(order, order.status, req.body.cancelReason),
      });
    }

    res.json(order);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await orderModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.status(204).end();
  } catch (err) {
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

module.exports = { create, getById, listMine, listAll, updateStatus, remove, overview, track };
