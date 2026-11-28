// Vercel function: POST /api/verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Checks the signature, fetches the order + payment from Razorpay, and only when the payment is captured for the
// right order, amount and currency creates the booking in MongoDB.
// Returns: 200 { booking } · 202 { status: "pending" } (authorized, not captured) · 400/409/502 { error }
import { defaultHandlers } from "../lib/handlers.js";

export default function handler(req, res) {
  return defaultHandlers().verifyPayment(req, res);
}
