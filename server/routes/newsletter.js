const express = require('express');
const pool = require('../config/db');
const { sendMail } = require('../config/mailer');
const { newsletterWelcomeEmail, saleAnnouncementEmail } = require('../emails/templates');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { saveImage } = require('../utils/imageStorage');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    const { rowCount } = await pool.query(
      'INSERT INTO newsletter_signups (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );

    let emailSent = true;
    if (rowCount > 0) {
      /* One photo, picked fresh on every send, so two people signing up minutes
         apart don't get an identical email. random() shuffles the whole
         eligible pool rather than rotating a fixed shortlist. Bundles and
         sold-out items are excluded - there is no point leading a welcome
         email with something nobody can buy. */
      const { rows: products } = await pool.query(
        `SELECT images
         FROM products
         WHERE images IS NOT NULL
           AND array_length(images, 1) > 0
           AND is_bundle = false
           AND stock > 0
         ORDER BY random()
         LIMIT 1`
      );
      const info = await sendMail({
        to: email,
        subject: 'Welcome to the ShopXtra list',
        html: newsletterWelcomeEmail(products),
      });
      emailSent = info !== null;

      await sendMail({
        to: 'shopxtra9@gmail.com',
        subject: 'New newsletter subscriber',
        html: `<p>New newsletter signup: <strong>${email}</strong></p>`,
      });
    }

    res.status(201).json({ message: 'Subscribed', emailSent });
  } catch (err) {
    next(err);
  }
});

router.get('/subscribers', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT email, created_at FROM newsletter_signups ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/broadcast', requireAuth, requireRole('admin'), upload.single('image'), async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'A subject and message are required' });
    }

    const imageUrl = req.file ? await saveImage(req.file) : null;
    const { rows } = await pool.query('SELECT email FROM newsletter_signups');

    const html = saleAnnouncementEmail({ subject, message, imageUrl });
    await Promise.all(rows.map(({ email }) => sendMail({ to: email, subject, html })));

    res.json({ message: `Sending to ${rows.length} subscriber${rows.length === 1 ? '' : 's'}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
