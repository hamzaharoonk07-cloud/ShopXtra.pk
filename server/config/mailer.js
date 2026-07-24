const nodemailer = require('nodemailer');

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      })
    );
    return transporterPromise;
  }

  // No real SMTP configured: use a disposable Ethereal test inbox so emails
  // can still be sent and inspected (via a preview URL) during development.
  transporterPromise = nodemailer.createTestAccount().then((account) => {
    console.log(`[mailer] No SMTP_HOST set — using Ethereal test inbox (${account.user})`);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    });
  });
  return transporterPromise;
}

async function sendMail({ to, subject, html }) {
  if (!to) return null;
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"ShopXtra" <shopxtra9@gmail.com>',
      to,
      subject,
      html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`[mailer] Preview: ${previewUrl}`);
    return info;
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    return null;
  }
}

module.exports = { sendMail };
