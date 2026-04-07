import nodemailer from 'nodemailer';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number; // per-item price
}

// Add deliveryDetails with emailID
export interface DeliveryDetails {
  address?: string;
  phone?: string;
  emailID?: string; // new field requested
}

export interface Order {
  id: string | number;
  customerName: string;
  customerEmail: string;
  deliveryDetails?: DeliveryDetails; // new optional field
  items: OrderItem[];
  total: number;
  createdAt?: string | Date;
}

// Build simple HTML summary for the order
function buildOrderHtml(order: Order) {
  const rows = order.items
    .map(
      (it) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${it.name}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${it.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">$${(it.price).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">$${(it.price * it.quantity).toFixed(2)}</td>
    </tr>`
    )
    .join('');

  // include delivery emailID when present
  const deliveryEmail = order.deliveryDetails?.emailID || order.customerEmail || '';

  return `
    <div style="font-family:Arial,sans-serif;color:#333">
      <h2>Thank you for your order, ${order.customerName}!</h2>
      <p>Order ID: <strong>${order.id}</strong></p>

      <!-- Ask customer to provide their email at checkout and show which email will receive the order -->
      <p style="background:#f9f9f9;padding:8px;border-left:4px solid #ccc">
        Please provide your email address at checkout so we can send order details to:
        <strong>${deliveryEmail}</strong>
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Item</th>
            <th style="padding:8px;border:1px solid #ddd">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Price</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right"><strong>Total</strong></td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right"><strong>$${order.total.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
      <p style="margin-top:16px">If you have any questions, reply to this email.</p>
    </div>
  `;
}

function buildOrderText(order: Order) {
  const lines = order.items
    .map((it) => `- ${it.name} x${it.quantity} @ $${it.price.toFixed(2)} = $${(it.price * it.quantity).toFixed(2)}`)
    .join('\n');

  const deliveryEmailLine = order.deliveryDetails?.emailID || order.customerEmail || '';

  return `Thank you for your order, ${order.customerName}!
Order ID: ${order.id}

Customer Email: ${order.customerEmail}
Delivery EmailID: ${deliveryEmailLine}

Items:
${lines}

Total: $${order.total.toFixed(2)}

If you have any questions, reply to this email.
`;
}

export function isValidEmail(email: string) {
  // simple validation; use a stronger check if needed
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendOrderEmail(order: Order, toEmail?: string) {
  // Environment variables: MAIL_USER, MAIL_PASS. Fallback sender is franzzo057@gmail.com
  const user = process.env.MAIL_USER || 'franzzo057@gmail.com';
  const pass = process.env.MAIL_PASS || ''; // instruct to set an app password or OAuth token
  const from = process.env.MAIL_FROM || 'franzzo057@gmail.com';

  if (!pass) {
    throw new Error('MAIL_PASS is not set. Provide an app password or OAuth2 credentials in MAIL_PASS.');
  }

  // Determine recipient dynamically: explicit arg -> order field -> deliveryDetails.emailID -> env fallback
  const recipient = toEmail || order.customerEmail || order.deliveryDetails?.emailID || process.env.MAIL_TO;
  if (!recipient) {
    throw new Error('No recipient email provided. Supply toEmail, order.customerEmail, deliveryDetails.emailID, or set MAIL_TO.');
  }

  // Create SMTP transporter for Gmail
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });

  const html = buildOrderHtml(order);
  const text = buildOrderText(order);

  const mailOptions = {
    from: `"Mustalam Restaurant" <${from}>`,
    to: recipient, // <-- dynamic recipient (now includes deliveryDetails.emailID)
    subject: `Your Order #${order.id} - Total $${order.total.toFixed(2)}`,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info; // caller can log info.messageId or envelope
}
