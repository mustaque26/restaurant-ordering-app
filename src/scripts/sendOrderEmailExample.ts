import { sendOrderEmail, Order, isValidEmail } from '../services/emailService';

/**
 * Validate customerEmail and send order email.
 * Intended to be called from the cart UI (e.g. cartPanel.jsx) after user enters their email.
 * Throws if email is invalid or sending fails.
 */
export async function sendOrderEmailFromCart(order: Order, customerEmail: string) {
  if (!customerEmail || !isValidEmail(customerEmail)) {
    throw new Error('A valid customer email must be provided.');
  }

  // ensure order has the email for templates and delivery details
  order.customerEmail = customerEmail;
  order.deliveryDetails = order.deliveryDetails || {};
  order.deliveryDetails.emailID = customerEmail; // populate new field

  // call the existing service (toEmail provided dynamically)
  return sendOrderEmail(order, customerEmail);
}

// Example usage in React (do not include here; put in cartPanel.jsx):
// try {
//   await sendOrderEmailFromCart(orderObject, enteredEmail);
//   // show success to user
// } catch (err) {
//   // show error to user
// }
