// Razorpay REST calls (no SDK needed) and payment signature check.
import crypto from "node:crypto";

function keys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set");
  return { id, secret };
}

/** Creates an order. amount is in rupees. */
export async function createOrder({ amount, receipt, notes }) {
  const { id, secret } = keys();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt, notes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${data?.error?.description || "unknown error"}`);
  return data; // { id: "order_...", amount, currency, status, ... }
}

/** True when Razorpay really signed this order + payment (HMAC-SHA256 with the Key Secret). */
export function isValidSignature(orderId, paymentId, signature) {
  const expected = crypto.createHmac("sha256", keys().secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
