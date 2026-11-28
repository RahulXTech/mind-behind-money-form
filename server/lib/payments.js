// Booking + payment rules. Every function returns { status, json } and never throws for expected failures.
//
//   createOrder(body)        → Razorpay order for the plan's price; booking details stored on the order (notes).
//                              Nothing is written to MongoDB here.
//   verifyCheckout(fields)   → checks the Checkout signature, then confirmPayment().
//   confirmPayment(ids)      → asks Razorpay for the order + payment and, only if the payment is captured for the
//                              right order, amount and currency, inserts the booking. Safe to call repeatedly and
//                              concurrently. A future Razorpay webhook (payment.captured) can call this directly
//                              after checking the webhook signature.
import { PLANS } from "./plans.js";
import { RazorpayError } from "./razorpay.js";
import { amountPaise, fromOrderNotes, newBookingId, toOrderNotes, validateDetails } from "./booking.js";
import { toClient } from "./http.js";

export const ORDER_ID = /^order_[A-Za-z0-9]{6,40}$/;
export const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,40}$/;
const SIGNATURE = /^[a-f0-9]{64}$/;

const reply = (status, json) => ({ status, json });
const isDuplicateKey = (err) => err?.code === 11000;

/**
 * @param {object} deps
 * @param {() => object} deps.getRazorpay       client from createRazorpay()
 * @param {() => Promise<object>} deps.getBookings  MongoDB collection (insertOne, findOne)
 * @param {number} [deps.captureChecks=3]       how many times to re-check an "authorized" payment
 * @param {number} [deps.captureDelayMs=1500]   wait between those checks (auto-capture usually takes seconds)
 */
export function makeBookingService({ getRazorpay, getBookings, now = () => new Date(), captureChecks = 3, captureDelayMs = 1500, log = console }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function createOrder(body) {
    const { details, error } = validateDetails(body);
    if (error) return reply(400, { error });
    const bookingId = newBookingId(now());
    try {
      const rzp = getRazorpay();
      const order = await rzp.createOrder({ amountPaise: amountPaise(details.plan), receipt: bookingId, notes: toOrderNotes(bookingId, details) });
      return reply(200, { bookingId, orderId: order.id, amount: PLANS[details.plan].amount, keyId: rzp.keyId });
    } catch (err) {
      log.error("[create-order]", err);
      return reply(err instanceof RazorpayError ? 502 : 500, { error: "Could not start the payment" });
    }
  }

  async function verifyCheckout({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = {}) {
    if (!ORDER_ID.test(String(orderId)) || !PAYMENT_ID.test(String(paymentId)) || !SIGNATURE.test(String(signature))) {
      return reply(400, { error: "Missing or invalid payment details" });
    }
    let valid;
    try { valid = getRazorpay().isValidSignature(orderId, paymentId, signature); } catch (err) { log.error("[verify]", err); return reply(500, { error: "Server not configured" }); }
    if (!valid) return reply(400, { error: "Invalid payment signature" });
    return confirmPayment({ orderId, paymentId });
  }

  // Returns the existing booking for this order: same payment → 200, different payment → 409. null if none.
  async function existingResult(col, orderId, paymentId) {
    const existing = await col.findOne({ "payment.orderId": orderId });
    if (!existing) return null;
    if (existing.payment.paymentId === paymentId) return reply(200, { booking: toClient(existing) });
    log.error(`[confirm] ALERT: order ${orderId} is already paid by ${existing.payment.paymentId}; second payment ${paymentId} was NOT recorded — refund it in the Razorpay dashboard.`);
    return reply(409, { error: "This booking is already paid with a different payment", code: "already_paid" });
  }

  async function confirmPayment({ orderId, paymentId }) {
    try {
      const col = await getBookings();
      const done = await existingResult(col, orderId, paymentId);
      if (done) return done;

      const rzp = getRazorpay();
      const order = await rzp.fetchOrder(orderId);
      let payment = await rzp.fetchPayment(paymentId);
      for (let i = 0; payment.status === "authorized" && i < captureChecks; i++) {
        await sleep(captureDelayMs);
        payment = await rzp.fetchPayment(paymentId);
      }

      const booking = fromOrderNotes(order.notes);
      if (order.id !== orderId || !booking) return reply(400, { error: "Unknown order" });
      if (payment.id !== paymentId || payment.order_id !== orderId) return reply(400, { error: "Payment does not belong to this order" });
      const expected = amountPaise(booking.plan);
      if (order.amount !== expected || payment.amount !== expected) {
        log.error(`[confirm] amount mismatch for ${orderId}: expected ${expected}, order ${order.amount}, payment ${payment.amount}`);
        return reply(400, { error: "Payment amount does not match the session price" });
      }
      if (order.currency !== "INR" || payment.currency !== "INR") return reply(400, { error: "Payment currency does not match" });
      if (payment.status === "authorized") {
        // Money is reserved but not captured (auto-capture off or delayed). Not a confirmed booking yet;
        // capture it in the Razorpay dashboard (or let the future webhook confirm it).
        log.error(`[confirm] payment ${paymentId} for ${orderId} is authorized but not captured`);
        return reply(202, { status: "pending", error: "Payment is authorized but not captured yet" });
      }
      if (payment.status !== "captured") return reply(400, { error: `Payment is ${payment.status || "not complete"}` });

      const at = now();
      const { bookingId, ...details } = booking;
      const doc = {
        _id: bookingId,
        id: bookingId,
        createdAt: at,
        ...details,
        minutes: PLANS[booking.plan].minutes,
        amount: PLANS[booking.plan].amount,
        currency: "INR",
        payment: { status: "paid", provider: "razorpay", orderId, paymentId, method: payment.method || "", paidAt: at },
      };
      try {
        await col.insertOne(doc);
      } catch (err) {
        // Another request confirmed this order at the same moment: report what was stored
        if (isDuplicateKey(err)) return (await existingResult(col, orderId, paymentId)) ?? reply(409, { error: "Payment already recorded", code: "already_paid" });
        throw err;
      }
      return reply(200, { booking: toClient(doc) });
    } catch (err) {
      log.error("[confirm]", err);
      if (err instanceof RazorpayError) {
        if (err.status === 400 || err.status === 404) return reply(400, { error: "Unknown order or payment" });
        return reply(502, { error: "Could not confirm the payment with Razorpay. Please try again." });
      }
      return reply(500, { error: "Could not confirm the payment" });
    }
  }

  return { createOrder, verifyCheckout, confirmPayment };
}
