function formatPKR(value) {
  return `Rs ${Number(value).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function layout(bodyHtml) {
  return `
    <div style="background-color:#F5F0E6; padding: 32px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div style="max-width: 560px; margin: 0 auto; background: #FDFBF7; border-radius: 16px; overflow: hidden;">
        <div style="background-color:#1C231D; padding: 24px 32px; text-align: center;">
          <span style="color:#F5F0E6; font-size: 22px; font-style: italic; letter-spacing: 0.5px;">ShopXtra</span>
        </div>
        <div style="padding: 32px; font-family: Arial, sans-serif;">
          ${bodyHtml}
        </div>
        <div style="background-color:#1C231D; padding: 16px 32px; text-align: center;">
          <span style="color:#D9D3C7; font-size: 12px; font-family: Arial, sans-serif;">&copy; ShopXtra &mdash; Shop Smart. Live Xtra.</span>
        </div>
      </div>
    </div>
  `;
}

function itemsTableHtml(items) {
  return items.map((item) => `
    <tr>
      <td style="padding: 8px 0; color:#1C231D;">${item.name} <span style="color:#7A7266;">&times;${item.qty}</span></td>
      <td style="padding: 8px 0; text-align: right; color:#1C231D; font-weight: bold;">${formatPKR(item.price_at_purchase * item.qty)}</td>
    </tr>
  `).join('');
}

function orderConfirmationEmail(order) {
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: Georgia, serif; font-style: italic; font-weight: normal;">Thank you, ${order.shipping_name.split(' ')[0]}!</h1>
    <p style="color:#5A5348; margin-top: 0;">Your order <strong>#${order.id}</strong> has been placed and will be paid via Cash on Delivery.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      ${itemsTableHtml(order.items || [])}
      <tr>
        <td style="padding-top: 12px; border-top: 1px solid #EFEADE; font-weight: bold; color:#1C231D;">Total</td>
        <td style="padding-top: 12px; border-top: 1px solid #EFEADE; text-align: right; font-weight: bold; color:#1C231D;">${formatPKR(order.total)}</td>
      </tr>
    </table>
    <p style="color:#5A5348; margin-bottom: 4px;"><strong>Delivery address</strong></p>
    <p style="color:#5A5348; margin-top: 0;">${order.shipping_address}, ${order.shipping_city}<br>${order.shipping_phone}</p>
    <div style="background-color:#EAF3E3; border:1px solid #B8D9A3; border-radius: 12px; padding: 12px 16px; margin-top: 20px;">
      <span style="color:#2C4A1E; font-size: 13px;">Cash on Delivery &middot; Have the total ready for the rider when your order arrives.</span>
    </div>
  `);
}

function orderStatusEmail(order, status) {
  const messages = {
    shipped: 'Your order is on its way!',
    delivered: 'Your order has been delivered.',
    processing: 'Your order is being processed.',
    cancelled: 'Your order has been cancelled.',
  };
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: Georgia, serif; font-style: italic; font-weight: normal;">${messages[status] || 'Order update'}</h1>
    <p style="color:#5A5348;">Order <strong>#${order.id}</strong> status is now: <strong style="color:#C9A24D; text-transform: uppercase;">${status}</strong></p>
    <p style="color:#5A5348;">Total: ${formatPKR(order.total)}<br>Delivering to: ${order.shipping_address}, ${order.shipping_city}</p>
    <p style="color:#5A5348;">You can track this order any time from your ShopXtra account dashboard.</p>
  `);
}

function newsletterWelcomeEmail() {
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: Georgia, serif; font-style: italic; font-weight: normal;">You're on the list.</h1>
    <p style="color:#5A5348; margin-top: 0;">Thanks for joining the ShopXtra newsletter — you'll be the first to hear about new drops, ritual bundle discounts, and upcoming sales.</p>
    <p style="color:#5A5348;">In the meantime, here's 10% off any Ritual Bundle with the code:</p>
    <div style="background-color:#EAF3E3; border:1px dashed #B8D9A3; border-radius: 12px; padding: 14px 16px; text-align:center; margin: 16px 0;">
      <span style="color:#1C231D; font-size: 16px; font-weight: bold; letter-spacing: 1px;">RITUAL10</span>
    </div>
    <p style="color:#7A7266; font-size: 13px;">No spam, ever — just the occasional email when there's something worth telling you about.</p>
  `);
}

function saleAnnouncementEmail({ subject, message }) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:4000';
  return layout(`
    <h1 style="color:#1C231D; font-size: 22px; margin-bottom: 4px; font-family: Georgia, serif; font-style: italic; font-weight: normal;">${subject}</h1>
    <p style="color:#5A5348; white-space: pre-line;">${message}</p>
    <div style="text-align:center; margin-top: 24px;">
      <a href="${siteUrl}/pages/sale.html" style="display:inline-block; background-color:#1C231D; color:#F5F0E6; text-decoration:none; border-radius:999px; padding: 12px 28px; font-family: Arial, sans-serif; font-size: 14px;">Shop the sale</a>
    </div>
  `);
}

module.exports = { orderConfirmationEmail, orderStatusEmail, newsletterWelcomeEmail, saleAnnouncementEmail };
