// Vercel function: POST /api/create-order
// Body: { plan, name, mobile, email, preferredDate, timeSlot, topic, language }  (any amount sent is ignored)
// Creates a Razorpay order for the plan's price with the booking details stored on the order. No database write.
// Returns: { bookingId, orderId, amount, keyId }
import { defaultHandlers } from "../lib/handlers.js";

export default function handler(req, res) {
  return defaultHandlers().createOrder(req, res);
}
