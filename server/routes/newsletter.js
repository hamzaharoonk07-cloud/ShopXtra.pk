const express = require('express');
const pool = require('../config/db');
const { sendMail } = require('../config/mailer');
const { newsletterWelcomeEmail, saleAnnouncementEmail } = require('../emails/templates');
const { requireAuth, requireRole } = require('../middleware/auth');

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
    res.status(201).json({ message: 'Subscribed' });

    if (rowCount > 0) {
      sendMail({
        to: email,
        subject: 'Welcome to the ShopXtra list',
        html: newsletterWelcomeEmail(),
      });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/broadcast', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'A subject and message are required' });
    }

    const { rows } = await pool.query('SELECT email FROM newsletter_signups');
    res.json({ message: `Sending to ${rows.length} subscriber${rows.length === 1 ? '' : 's'}.` });

    const html = saleAnnouncementEmail({ subject, message });
    for (const { email } of rows) {
      sendMail({ to: email, subject, html });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
