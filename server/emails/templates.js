const SITE_URL = process.env.SITE_URL || 'http://localhost:4000';

function formatPKR(value) {
  return `Rs ${Number(value).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function formatOrderDate(value) {
  return new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
}

function layout(bodyHtml) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body, table, td, a { font-family: 'Montserrat', Arial, sans-serif; }
        </style>
      </head>
      <body style="margin:0;">
        <div style="background-color:#F5F0E6; padding: 32px 16px; font-family: 'Montserrat', Arial, sans-serif;">
          <div style="max-width: 560px; margin: 0 auto; background: #FDFBF7; border-radius: 16px; overflow: hidden;">
            <div style="background-color:#000000; padding: 20px 32px; text-align: center;">
              <img src="${SITE_URL}/assets/logo.png" alt="ShopXtra" width="120" style="width: 120px; max-width: 100%; height: auto; display: inline-block;">
            </div>
            <div style="padding: 32px; font-family: 'Montserrat', Arial, sans-serif;">
              ${bodyHtml}
            </div>
            <div style="background-color:#1C231D; padding: 16px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-family: 'Montserrat', Arial, sans-serif; font-size: 12px;">
                <a href="${SITE_URL}/index.html" style="color:#D9D3C7; text-decoration:none;">ShopXtra</a>
                <span style="color:#5A5348;"> &middot; </span>
                <a href="${SITE_URL}/pages/shop.html" style="color:#D9D3C7; text-decoration:none;">Shop</a>
                <span style="color:#5A5348;"> &middot; </span>
                <a href="${SITE_URL}/pages/why-shopxtra.html" style="color:#D9D3C7; text-decoration:none;">FAQs</a>
              </p>
              <span style="color:#8A8378; font-size: 11px; font-family: 'Montserrat', Arial, sans-serif;">&copy; ShopXtra &mdash; Shop Smart. Live Xtra.</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function itemsTableHtml(items) {
  return items.filter((item) => Number(item.price_at_purchase) > 0).map((item) => {
    const image = (item.images && item.images[0]) || `${SITE_URL}/assets/logo.png`;
    return `
    <tr>
      <td style="padding: 12px 10px 12px 0; width: 56px; vertical-align: top;">
        <img src="${image}" alt="${item.name}" width="48" height="48" style="width:48px; height:48px; object-fit:cover; border-radius:8px; display:block; border:1px solid #EFEADE;">
      </td>
      <td style="padding: 12px 0; color:#1C231D; vertical-align: top;">
        ${item.name}
        ${item.variant_name ? `<br><span style="color:#7A7266; font-size: 12px;">Variant: ${item.variant_name}</span>` : ''}
      </td>
      <td style="padding: 12px 0; text-align: center; color:#7A7266; vertical-align: top;">&times;${item.qty}</td>
      <td style="padding: 12px 0; text-align: right; color:#1C231D; font-weight: bold; vertical-align: top;">${formatPKR(item.price_at_purchase * item.qty)}</td>
    </tr>
  `;
  }).join('');
}

// Free-gift order_items (added when a promo like SHOP100 has a gift_product_id)
// are stored at price_at_purchase = 0 - showing them as a normal "Rs 0" line
// item reads as a mistake, so they get their own labeled section instead.
function giftItemsHtml(items) {
  const giftItems = items.filter((item) => Number(item.price_at_purchase) === 0);
  if (!giftItems.length) return '';
  return `
    <div style="background-color:#F1F6EE; border:1px solid #CFE0C6; border-radius: 12px; padding: 14px 18px; margin: 16px 0;">
      <p style="color:#2E5C3B; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 10px;">&#127873; Free gift with your order</p>
      ${giftItems.map((item) => {
        const image = (item.images && item.images[0]) || `${SITE_URL}/assets/logo.png`;
        return `
        <div style="display:flex; align-items:center;">
          <img src="${image}" alt="${item.name}" width="40" height="40" style="width:40px; height:40px; object-fit:cover; border-radius:8px; border:1px solid #EFEADE; margin-right:10px;">
          <span style="color:#1C231D; font-size: 14px;">${item.name}${item.qty > 1 ? ` &times;${item.qty}` : ''}</span>
        </div>
      `;
      }).join('')}
    </div>
  `;
}

function orderConfirmationEmail(order) {
  const firstName = order.shipping_name.split(' ')[0];
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin: 0 0 16px; text-align:center; font-family: 'Montserrat', Arial, sans-serif; font-weight: 700; letter-spacing: -0.01em;">Order confirmed &mdash; Cash on Delivery</h1>
    <p style="color:#5A5348; margin-top: 0;">Hi ${firstName},</p>
    <p style="color:#5A5348;">Thank you for your order! We&rsquo;ve received it and are getting it packed for shipment.</p>

    <div style="background-color:#FBF3E3; border:1px solid #E8D2A0; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
      <p style="color:#8A5A16; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px;">Important COD notice</p>
      <p style="color:#5A5348; font-size: 13px; margin: 0 0 10px;">Please have the exact amount ready in cash when your package arrives &mdash; you&rsquo;ll pay the rider directly upon delivery.</p>
      <p style="color:#1C231D; font-size: 15px; font-weight: bold; margin: 0;">Amount to pay on delivery: ${formatPKR(order.total)}</p>
    </div>

    <div style="text-align:center; margin: 24px 0;">
      <a href="${SITE_URL}/pages/track-order.html" style="display:inline-block; background-color:#1C231D; color:#F5F0E6; text-decoration:none; border-radius:999px; padding: 12px 32px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: bold;">View order status</a>
    </div>

    <p style="color:#1C231D; font-weight: bold; border-top: 1px solid #EFEADE; padding-top: 20px; margin-bottom: 0;">Order summary &mdash; #${order.id}</p>
    <p style="color:#7A7266; font-size: 13px; margin-top: 2px;">Placed on ${formatOrderDate(order.created_at)} &middot; Payment method: Cash on Delivery (COD)</p>
    <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px;">
      <tr>
        <td style="padding-bottom: 6px; border-bottom: 1px solid #EFEADE;"></td>
        <td style="padding-bottom: 6px; border-bottom: 1px solid #EFEADE; color:#7A7266; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">Item</td>
        <td style="padding-bottom: 6px; border-bottom: 1px solid #EFEADE; color:#7A7266; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; text-align:center;">Qty</td>
        <td style="padding-bottom: 6px; border-bottom: 1px solid #EFEADE; color:#7A7266; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; text-align:right;">Price</td>
      </tr>
      ${itemsTableHtml(order.items || [])}
      <tr>
        <td colspan="3" style="padding-top: 10px; color:#5A5348;">Subtotal</td>
        <td style="padding-top: 10px; text-align: right; color:#5A5348;">${formatPKR(Number(order.total) + Number(order.discount_total || 0) - Number(order.shipping_fee || 0))}</td>
      </tr>
      ${order.discount_total > 0 ? `
      <tr>
        <td colspan="3" style="color:#5A5348;">Discount${order.promo_code ? ` (${order.promo_code})` : ''}</td>
        <td style="text-align: right; color:#5A5348;">&minus;${formatPKR(order.discount_total)}</td>
      </tr>` : ''}
      <tr>
        <td colspan="3" style="color:#5A5348;">Shipping fee</td>
        <td style="text-align: right; color:#5A5348;">${Number(order.shipping_fee) > 0 ? formatPKR(order.shipping_fee) : 'Free'}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding-top: 8px; border-top: 1px solid #EFEADE; font-weight: bold; color:#1C231D;">Total cash due at delivery</td>
        <td style="padding-top: 8px; border-top: 1px solid #EFEADE; text-align: right; font-weight: bold; color:#1C231D;">${formatPKR(order.total)}</td>
      </tr>
    </table>
    ${giftItemsHtml(order.items || [])}

    <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #EFEADE; padding-top: 4px; margin-top: 4px;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-top: 16px;">
          <p style="color:#1C231D; font-weight: bold; margin: 0 0 4px;">Delivery address</p>
          <p style="color:#5A5348; margin: 0; font-size: 13px; line-height: 1.5;">${order.shipping_name}<br>${order.shipping_phone}${order.email ? `<br>${order.email}` : ''}<br>${order.shipping_address}, ${order.shipping_city}${order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ''}</p>
        </td>
        <td style="width: 50%; vertical-align: top; padding-top: 16px;">
          <p style="color:#1C231D; font-weight: bold; margin: 0 0 4px;">Estimated delivery</p>
          <p style="color:#5A5348; margin: 0; font-size: 13px; line-height: 1.5;">5&ndash;7 business days<br>Ships within 24 hours</p>
        </td>
      </tr>
    </table>
    ${order.notes ? `
    <div style="border-top: 1px solid #EFEADE; margin-top: 16px; padding-top: 12px;">
      <p style="color:#1C231D; font-weight: bold; margin: 0 0 4px;">Shade / colour notes</p>
      <p style="color:#5A5348; margin: 0; font-size: 13px; line-height: 1.5;">${order.notes}</p>
    </div>` : ''}
    <p style="color:#7A7266; font-size: 12px; font-style: italic; margin-top: 10px;">Please make sure someone is available at this address with the cash payment during delivery hours.</p>

    <div style="border-top: 1px solid #EFEADE; margin-top: 24px; padding-top: 16px;">
      <p style="color:#1C231D; font-weight: bold; margin: 0 0 4px;">Need to cancel or modify your order?</p>
      <p style="color:#5A5348; font-size: 13px; margin: 0;">If you need to change your address or cancel before we ship, reply to this email immediately or WhatsApp us at <a href="https://wa.me/923272255447" style="color:#1C231D;">0327 2255447</a>.</p>
    </div>
  `);
}

function orderStatusEmail(order, status, cancelReason) {
  const messages = {
    shipped: 'Your order is on its way!',
    delivered: 'Your order has been delivered.',
    processing: 'Your order is being processed.',
    cancelled: 'Your order has been cancelled.',
  };
  const addressLabel = status === 'delivered' ? 'Delivered'
    : status === 'cancelled' ? 'Was to be delivered'
    : 'Delivering';
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 700; letter-spacing: -0.01em;">${messages[status] || 'Order update'}</h1>
    <p style="color:#5A5348;">Order <strong>#${order.id}</strong> status is now: <strong style="color:#C9A24D; text-transform: uppercase;">${status}</strong></p>
    ${status === 'cancelled' && cancelReason ? `
      <div style="background-color:#FBF3E3; border:1px solid #E8D2A0; border-radius: 12px; padding: 14px 18px; margin: 16px 0;">
        <p style="color:#8A5A16; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px;">Reason for cancellation</p>
        <p style="color:#5A5348; font-size: 14px; margin: 0;">${cancelReason}</p>
      </div>
    ` : ''}
    <p style="color:#5A5348;">Total: ${formatPKR(order.total)}<br>${addressLabel} to: ${order.shipping_address}, ${order.shipping_city}</p>
    <p style="color:#5A5348;">You can track this order any time from your ShopXtra account dashboard.</p>
  `);
}

function newsletterWelcomeEmail(products = []) {
  const images = products.filter((p) => p.images && p.images[0]).slice(0, 4).map((p) => p.images[0]);
  const collage = images.length ? `
    <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
      <tr>
        ${images.map((img) => `
          <td style="width:${Math.floor(100 / images.length)}%; padding:4px; vertical-align:top;">
            <img src="${img}" alt="" style="width:100%; height:110px; object-fit:cover; border-radius:10px; display:block; border:1px solid #EFEADE;">
          </td>
        `).join('')}
      </tr>
    </table>
  ` : '';
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 700; letter-spacing: -0.01em;">Welcome to the family.</h1>
    <p style="color:#5A5348; margin-top: 0;">We're genuinely glad you're here. From your morning electrolytes to your evening skincare, ShopXtra is built around the small rituals that make your day feel a little better.</p>
    ${collage}
    <p style="color:#5A5348;">You'll be the first to hear about new drops, bundle offers, and upcoming sales, straight from us, whenever there's something worth telling you about.</p>
    <p style="color:#7A7266; font-size: 13px;">No spam, ever. Just the occasional email that's actually worth opening.</p>
  `);
}

function saleAnnouncementEmail({ subject, message, imageUrl }) {
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 700; letter-spacing: -0.01em;">${subject}</h1>
    ${imageUrl ? `<img src="${imageUrl}" alt="" style="width:100%; height:auto; border-radius:12px; margin: 12px 0; display:block; border:1px solid #EFEADE;">` : ''}
    <p style="color:#5A5348; white-space: pre-line;">${message}</p>
    <div style="text-align:center; margin-top: 24px;">
      <a href="${SITE_URL}/pages/sale.html" style="display:inline-block; background-color:#1C231D; color:#F5F0E6; text-decoration:none; border-radius:999px; padding: 12px 28px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px;">Shop the sale</a>
    </div>
  `);
}

function passwordResetEmail(resetUrl) {
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 700; letter-spacing: -0.01em;">Reset your password</h1>
    <p style="color:#5A5348; margin-top: 0;">We received a request to reset the password on your ShopXtra account. Click below to choose a new one - this link expires in 1 hour.</p>
    <div style="text-align:center; margin: 24px 0;">
      <a href="${resetUrl}" style="display:inline-block; background-color:#1C231D; color:#F5F0E6; text-decoration:none; border-radius:999px; padding: 12px 32px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: bold;">Reset password</a>
    </div>
    <p style="color:#7A7266; font-size: 13px;">If you didn't request this, you can safely ignore this email - your password won't change.</p>
  `);
}

module.exports = { orderConfirmationEmail, orderStatusEmail, newsletterWelcomeEmail, saleAnnouncementEmail, passwordResetEmail };
