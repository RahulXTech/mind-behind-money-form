// POST /api/create-order
// Body: { plan, name, mobile, email, preferredDate, timeSlot, topic, language }
// Validates, creates a Razorpay order for the plan's price, saves the booking as "created" in MongoDB.
// Returns: { bookingId, orderId, amount, keyId }
import crypto from "node:crypto";
import { bookings } from "../lib/db.js";
import { handleCors, readBody } from "../lib/http.js";
import { PLANS, SLOTS } from "../lib/plans.js";
import { createOrder } from "../lib/razorpay.js";

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const bookingId = (now) =>
  `MBM-${now.toISOString().slice(0, 10).replace(/-/g, "")}-` +
  Array.from(crypto.randomBytes(4), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

function validate(b) {
  if (!Object.hasOwn(PLANS, String(b.plan))) return "Invalid plan";
  if (str(b.name, 80).length < 2) return "Invalid name";
  if (!/^\+\d{1,4} \d{6,14}$/.test(str(b.mobile, 24))) return "Invalid mobile";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(b.email, 120))) return "Invalid email";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(b.preferredDate, 10))) return "Invalid date";
  if (!SLOTS.includes(b.timeSlot)) return "Invalid time slot";
  return "";
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  const b = readBody(req);
  const problem = validate(b);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const plan = PLANS[b.plan];
    const now = new Date();
    const id = bookingId(now);
    const order = await createOrder({ amount: plan.amount, receipt: id, notes: { bookingId: id, plan: b.plan } });

    await (await bookings()).insertOne({
      _id: id,
      id,
      createdAt: now,
      plan: b.plan,
      minutes: plan.minutes,
      amount: plan.amount,
      currency: "INR",
      name: str(b.name, 80),
      mobile: str(b.mobile, 24),
      email: str(b.email, 120).toLowerCase(),
      preferredDate: str(b.preferredDate, 10),
      timeSlot: b.timeSlot,
      topic: str(b.topic, 300),
      language: str(b.language, 10),
      payment: { status: "created", provider: "razorpay", orderId: order.id },
    });

    res.status(200).json({ bookingId: id, orderId: order.id, amount: plan.amount, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start the payment" });
  }
}
