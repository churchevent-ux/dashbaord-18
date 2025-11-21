// EmailJS integration helper
// Add your EmailJS user ID, service ID, and template ID below
import emailjs from 'emailjs-com';

// EmailJS configuration
const SERVICE_ID = 'service_6bswnv8';
const TEMPLATE_ID = 'template_xdahdd8';
const USER_ID = 'a8_hcbsJ06oPYRp5F'; // Public Key from your dashboard

export function sendPaymentEmail({ toEmail, toName, amount, receipt_id, date }) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: toEmail,
      to_name: toName,
      amount: amount,
      receipt_id: receipt_id,
      date: date,
    },
    USER_ID
  );
}
