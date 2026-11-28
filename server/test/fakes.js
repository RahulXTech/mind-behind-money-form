// Test doubles: a fake Razorpay REST API (plugged in as `fetch`, so the real client code runs)
// and an in-memory MongoDB collection with the same unique keys as production.
import crypto from "node:crypto";

const rand = () => crypto.randomBytes(7).toString("hex");

export function fakeRazorpayApi({ keyId = "rzp_test_FAKEKEY", keySecret = "fake_secret_for_tests" } = {}) {
  const orders = new Map();
  const payments = new Map();
  const state = { mode: "ok", calls: [] }; // mode: ok | error500 | timeout | network
  const expectedAuth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const notFound = () => json(400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } });

  async function fetchImpl(url, { method = "GET", headers = {}, body, signal } = {}) {
    const path = new URL(url).pathname.replace(/^\/v1/, "");
    state.calls.push(`${method} ${path}`);
    if (state.mode === "network") throw new TypeError("fetch failed");
    if (state.mode === "timeout") {
      return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    }
    if (state.mode === "error500") return json(500, { error: { code: "SERVER_ERROR", description: "Internal error" } });
    if (headers.Authorization !== expectedAuth) return json(401, { error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } });

    if (method === "POST" && path === "/orders") {
      const b = JSON.parse(body);
      const order = { id: "order_" + rand(), entity: "order", amount: b.amount, amount_paid: 0, currency: b.currency, receipt: b.receipt, notes: b.notes ?? [], status: "created" };
      orders.set(order.id, order);
      return json(200, order);
    }
    let m;
    if (method === "GET" && (m = path.match(/^\/orders\/([^/]+)$/))) {
      const o = orders.get(decodeURIComponent(m[1]));
      return o ? json(200, o) : notFound();
    }
    if (method === "GET" && (m = path.match(/^\/payments\/([^/]+)$/))) {
      const p = payments.get(decodeURIComponent(m[1]));
      return p ? json(200, p) : notFound();
    }
    return json(404, { error: { description: "Unknown endpoint" } });
  }

  const sign = (orderId, paymentId) => crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");

  /** Simulates the visitor paying in Razorpay Checkout; returns what Checkout hands to the website. */
  function pay(orderId, { status = "captured", amount, currency = "INR", method = "upi", paymentOrderId } = {}) {
    const order = orders.get(orderId);
    const id = "pay_" + rand();
    payments.set(id, { id, entity: "payment", order_id: paymentOrderId ?? orderId, amount: amount ?? order.amount, currency, status, method });
    return { razorpay_order_id: orderId, razorpay_payment_id: id, razorpay_signature: sign(orderId, id) };
  }

  return { keyId, keySecret, fetchImpl, orders, payments, state, sign, pay };
}

/** In-memory stand-in for the MongoDB "bookings" collection (unique: _id, payment.orderId, payment.paymentId). */
export function fakeBookings() {
  const docs = [];
  const get = (obj, path) => path.split(".").reduce((v, k) => v?.[k], obj);
  const unique = ["_id", "payment.orderId", "payment.paymentId"];
  const tick = () => new Promise((r) => setImmediate(r)); // lets concurrent requests interleave like real I/O
  return {
    docs,
    async findOne(query) {
      await tick();
      const d = docs.find((doc) => Object.entries(query).every(([k, v]) => get(doc, k) === v));
      return d ? structuredClone(d) : null;
    },
    async insertOne(doc) {
      await tick();
      for (const key of unique) {
        const v = get(doc, key);
        if (v !== undefined && docs.some((d) => get(d, key) === v)) {
          throw Object.assign(new Error(`E11000 duplicate key error (${key})`), { code: 11000 });
        }
      }
      docs.push(structuredClone(doc));
      return { insertedId: doc._id };
    },
  };
}

/** Collects log.error calls instead of printing them. */
export function quietLog() {
  const errors = [];
  return { errors, error: (...args) => errors.push(args.map(String).join(" ")) };
}

export const VALID_DETAILS = Object.freeze({
  plan: "15min",
  name: "Test Customer",
  mobile: "+91 9876543210",
  email: "Test@Example.com",
  preferredDate: "2026-12-10",
  timeSlot: "शाम",
  topic: "Pricing for my cafe",
  language: "en",
});
