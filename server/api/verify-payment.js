// POST /api/verify-payment
// Body: { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Checks Razorpay's signature, marks the booking "paid" in MongoDB, returns { booking }.
import { bookings } from "../lib/db.js";
import { handleCors, readBody, toClient } from "../lib/http.js";
import { isValidSignature } from "../lib/razorpay.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  const { bookingId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = readBody(req);
  if (!bookingId || !orderId || !paymentId || !signature) return res.status(400).json({ error: "Missing payment details" });

  try {
    const col = await bookings();
    const doc = await col.findOne({ _id: String(bookingId) });
    if (!doc || doc.payment?.orderId !== orderId) return res.status(400).json({ error: "Unknown booking" });
    if (!isValidSignature(orderId, paymentId, signature)) return res.status(400).json({ error: "Invalid payment signature" });

    // Already confirmed (e.g. the visitor retried): return it as is
    if (doc.payment.status === "paid" && doc.payment.paymentId === paymentId) return res.status(200).json({ booking: toClient(doc) });

    const payment = { status: "paid", provider: "razorpay", orderId, paymentId, signature, paidAt: new Date() };
    await col.updateOne({ _id: doc._id }, { $set: { payment } });
    res.status(200).json({ booking: toClient({ ...doc, payment }) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not confirm the payment" });
  }
}
