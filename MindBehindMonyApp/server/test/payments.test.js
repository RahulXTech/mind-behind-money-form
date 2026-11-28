// Payment rules: run with `npm test` inside server/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRazorpay } from "../lib/razorpay.js";
import { makeBookingService } from "../lib/payments.js";
import { fakeBookings, fakeRazorpayApi, quietLog, VALID_DETAILS } from "./fakes.js";

function setup({ timeoutMs = 200, captureChecks = 2, captureDelayMs = 5 } = {}) {
  const api = fakeRazorpayApi();
  const rzp = createRazorpay({ keyId: api.keyId, keySecret: api.keySecret, fetchImpl: api.fetchImpl, timeoutMs });
  const col = fakeBookings();
  const log = quietLog();
  const service = makeBookingService({ getRazorpay: () => rzp, getBookings: async () => col, captureChecks, captureDelayMs, log });
  return { api, rzp, col, log, service };
}

async function startPayment(ctx, details = VALID_DETAILS) {
  const r = await ctx.service.createOrder(details);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}

// ---------------- create-order ----------------

test("create-order: server sets the amount, stores details on the order, writes nothing to MongoDB", async () => {
  const ctx = setup();
  for (const [plan, paise, rupees] of [["15min", 49900, 499], ["45min", 99900, 999]]) {
    const r = await ctx.service.createOrder({ ...VALID_DETAILS, plan, amount: 1 });
    assert.equal(r.status, 200);
    assert.equal(r.json.amount, rupees);
    assert.equal(r.json.keyId, "rzp_test_FAKEKEY");
    assert.ok(!JSON.stringify(r.json).includes(ctx.api.keySecret), "secret must never be returned");
    const order = ctx.api.orders.get(r.json.orderId);
    assert.equal(order.amount, paise);
    assert.equal(order.currency, "INR");
    assert.equal(order.receipt, r.json.bookingId);
    assert.equal(order.notes.bookingId, r.json.bookingId);
    assert.equal(order.notes.email, "test@example.com");
  }
  assert.equal(ctx.col.docs.length, 0);
});

test("create-order: rejects invalid input", async () => {
  const ctx = setup();
  for (const bad of [
    { plan: "1min" }, { plan: "toString" }, { timeSlot: "midnight" }, { email: "x" },
    { mobile: "123" }, { preferredDate: "tomorrow" }, { name: "A" },
  ]) {
    const r = await ctx.service.createOrder({ ...VALID_DETAILS, ...bad });
    assert.equal(r.status, 400, JSON.stringify(bad));
  }
  assert.equal(ctx.api.orders.size, 0);
});

test("create-order: a 300-character Hindi topic survives the round trip through order notes", async () => {
  const ctx = setup();
  const topic = "मेरे कैफ़े की प्राइसिंग ".repeat(20).slice(0, 300);
  const { orderId } = await startPayment(ctx, { ...VALID_DETAILS, topic });
  for (const v of Object.values(ctx.api.orders.get(orderId).notes)) assert.ok(String(v).length <= 256);
  const r = await ctx.service.verifyCheckout(ctx.api.pay(orderId));
  assert.equal(r.status, 200);
  assert.equal(r.json.booking.topic, topic.trim());
});

test("create-order: Razorpay down → 502, nothing stored", async () => {
  const ctx = setup();
  ctx.api.state.mode = "error500";
  const r = await ctx.service.createOrder(VALID_DETAILS);
  assert.equal(r.status, 502);
  assert.equal(ctx.col.docs.length, 0);
});

// ---------------- verify / confirm ----------------

test("successful captured payment creates exactly one paid booking", async () => {
  const ctx = setup();
  const { orderId, bookingId } = await startPayment(ctx);
  const checkout = ctx.api.pay(orderId);
  const r = await ctx.service.verifyCheckout(checkout);
  assert.equal(r.status, 200);
  const b = r.json.booking;
  assert.equal(b.id, bookingId);
  assert.equal(b.amount, 499);
  assert.equal(b.minutes, 15);
  assert.equal(b.email, "test@example.com");
  assert.equal(b.timeSlot, "शाम");
  assert.deepEqual(
    { status: b.payment.status, orderId: b.payment.orderId, paymentId: b.payment.paymentId },
    { status: "paid", orderId, paymentId: checkout.razorpay_payment_id },
  );
  assert.equal(typeof b.createdAt, "string");
  assert.equal(typeof b.payment.paidAt, "string");
  assert.ok(!("_id" in b));
  assert.equal(ctx.col.docs.length, 1);
  assert.ok(ctx.api.state.calls.includes(`GET /payments/${checkout.razorpay_payment_id}`), "payment must be fetched from Razorpay");
});

test("forged signature is rejected without calling Razorpay or storing anything", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const checkout = ctx.api.pay(orderId);
  const sig = checkout.razorpay_signature;
  const callsBefore = ctx.api.state.calls.length;
  const r = await ctx.service.verifyCheckout({ ...checkout, razorpay_signature: (sig[0] === "0" ? "1" : "0") + sig.slice(1) });
  assert.equal(r.status, 400);
  assert.equal(ctx.api.state.calls.length, callsBefore);
  assert.equal(ctx.col.docs.length, 0);
});

test("malformed or missing fields are rejected", async () => {
  const ctx = setup();
  for (const body of [{}, { razorpay_order_id: "order_x" }, { razorpay_order_id: "x", razorpay_payment_id: "y", razorpay_signature: "z" }, undefined]) {
    assert.equal((await ctx.service.verifyCheckout(body)).status, 400);
  }
});

test("wrong order id: signature of one order cannot confirm another", async () => {
  const ctx = setup();
  const a = await startPayment(ctx);
  const b = await startPayment(ctx);
  const checkout = ctx.api.pay(a.orderId);
  const r = await ctx.service.verifyCheckout({ ...checkout, razorpay_order_id: b.orderId });
  assert.equal(r.status, 400);
  assert.equal(ctx.col.docs.length, 0);
});

test("wrong order id: payment that Razorpay reports for a different order is rejected", async () => {
  const ctx = setup();
  const a = await startPayment(ctx);
  const b = await startPayment(ctx);
  const checkout = ctx.api.pay(a.orderId, { paymentOrderId: b.orderId });
  const r = await ctx.service.verifyCheckout(checkout);
  assert.equal(r.status, 400);
  assert.match(r.json.error, /does not belong/);
  assert.equal(ctx.col.docs.length, 0);
});

test("unknown order (not in Razorpay) → 400, nothing stored", async () => {
  const ctx = setup();
  const paymentId = "pay_ABCDEF123456";
  const orderId = "order_ABCDEF123456";
  const r = await ctx.service.verifyCheckout({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: ctx.api.sign(orderId, paymentId) });
  assert.equal(r.status, 400);
  assert.equal(ctx.col.docs.length, 0);
});

test("order not created by this site (no booking notes) → 400", async () => {
  const ctx = setup();
  const order = await ctx.rzp.createOrder({ amountPaise: 49900, receipt: "manual" });
  const r = await ctx.service.verifyCheckout(ctx.api.pay(order.id));
  assert.equal(r.status, 400);
  assert.equal(ctx.col.docs.length, 0);
});

test("wrong amount on the payment → 400, nothing stored", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const r = await ctx.service.verifyCheckout(ctx.api.pay(orderId, { amount: 100 }));
  assert.equal(r.status, 400);
  assert.match(r.json.error, /amount/);
  assert.equal(ctx.col.docs.length, 0);
});

test("wrong amount on the order (e.g. changed outside this site) → 400", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  ctx.api.orders.get(orderId).amount = 100;
  const r = await ctx.service.verifyCheckout(ctx.api.pay(orderId, { amount: 100 }));
  assert.equal(r.status, 400);
  assert.equal(ctx.col.docs.length, 0);
});

test("45-minute plan cannot be confirmed with the 15-minute price", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx, { ...VALID_DETAILS, plan: "45min" });
  const r = await ctx.service.verifyCheckout(ctx.api.pay(orderId, { amount: 49900 }));
  assert.equal(r.status, 400);
  assert.equal(ctx.col.docs.length, 0);
});

test("wrong currency → 400, nothing stored", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const r = await ctx.service.verifyCheckout(ctx.api.pay(orderId, { currency: "USD" }));
  assert.equal(r.status, 400);
  assert.match(r.json.error, /currency/);
  assert.equal(ctx.col.docs.length, 0);
});

test("failed payment status → 400, nothing stored", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const r = await ctx.service.verifyCheckout(ctx.api.pay(orderId, { status: "failed" }));
  assert.equal(r.status, 400);
  assert.equal(ctx.col.docs.length, 0);
});

test("authorized but not captured → 202 pending, no booking; captured later → booking created", async () => {
  const ctx = setup({ captureChecks: 2, captureDelayMs: 5 });
  const { orderId } = await startPayment(ctx);
  const checkout = ctx.api.pay(orderId, { status: "authorized" });
  const r = await ctx.service.verifyCheckout(checkout);
  assert.equal(r.status, 202);
  assert.equal(r.json.status, "pending");
  assert.equal(ctx.col.docs.length, 0, "MongoDB must stay empty until the payment is captured");
  const paymentFetches = ctx.api.state.calls.filter((c) => c === `GET /payments/${checkout.razorpay_payment_id}`).length;
  assert.equal(paymentFetches, 3, "1 fetch + 2 re-checks");

  ctx.api.payments.get(checkout.razorpay_payment_id).status = "captured";
  const again = await ctx.service.verifyCheckout(checkout);
  assert.equal(again.status, 200);
  assert.equal(ctx.col.docs.length, 1);
});

test("authorized payment that gets auto-captured during the re-checks is confirmed", async () => {
  const ctx = setup({ captureChecks: 3, captureDelayMs: 20 });
  const { orderId } = await startPayment(ctx);
  const checkout = ctx.api.pay(orderId, { status: "authorized" });
  setTimeout(() => { ctx.api.payments.get(checkout.razorpay_payment_id).status = "captured"; }, 5);
  const r = await ctx.service.verifyCheckout(checkout);
  assert.equal(r.status, 200);
  assert.equal(ctx.col.docs.length, 1);
});

test("duplicate verification of the same payment returns the same booking (idempotent)", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const checkout = ctx.api.pay(orderId);
  const first = await ctx.service.verifyCheckout(checkout);
  const callsAfterFirst = ctx.api.state.calls.length;
  const second = await ctx.service.verifyCheckout(checkout);
  assert.equal(second.status, 200);
  assert.deepEqual(second.json, first.json);
  assert.equal(ctx.api.state.calls.length, callsAfterFirst, "already-confirmed payment needs no Razorpay calls");
  assert.equal(ctx.col.docs.length, 1);
});

test("a second, different payment for an already-paid booking is rejected and never overwrites the first", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const p1 = ctx.api.pay(orderId);
  const p2 = ctx.api.pay(orderId);
  assert.equal((await ctx.service.verifyCheckout(p1)).status, 200);
  const r = await ctx.service.verifyCheckout(p2);
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "already_paid");
  assert.equal(ctx.col.docs.length, 1);
  assert.equal(ctx.col.docs[0].payment.paymentId, p1.razorpay_payment_id);
  assert.ok(ctx.log.errors.some((e) => e.includes("ALERT") && e.includes(p2.razorpay_payment_id)), "owner is alerted to refund");
});

test("concurrent verification of the same payment creates one booking and all requests succeed", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const checkout = ctx.api.pay(orderId);
  const results = await Promise.all(Array.from({ length: 8 }, () => ctx.service.verifyCheckout(checkout)));
  assert.deepEqual(results.map((r) => r.status), Array(8).fill(200));
  assert.equal(new Set(results.map((r) => r.json.booking.id)).size, 1);
  assert.equal(ctx.col.docs.length, 1);
});

test("concurrent verification of two different payments: one wins, the other gets 409", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  const p1 = ctx.api.pay(orderId);
  const p2 = ctx.api.pay(orderId);
  const [r1, r2] = await Promise.all([ctx.service.verifyCheckout(p1), ctx.service.verifyCheckout(p2)]);
  assert.deepEqual([r1.status, r2.status].sort(), [200, 409]);
  assert.equal(ctx.col.docs.length, 1);
  const winner = r1.status === 200 ? p1 : p2;
  assert.equal(ctx.col.docs[0].payment.paymentId, winner.razorpay_payment_id);
});

test("MongoDB gets a booking only after a captured payment", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  assert.equal(ctx.col.docs.length, 0, "after create-order");
  await ctx.service.verifyCheckout(ctx.api.pay(orderId, { status: "authorized" }));
  assert.equal(ctx.col.docs.length, 0, "after authorized payment");
  await ctx.service.verifyCheckout(ctx.api.pay(orderId, { status: "failed" }));
  assert.equal(ctx.col.docs.length, 0, "after failed payment");
  await ctx.service.verifyCheckout(ctx.api.pay(orderId));
  assert.equal(ctx.col.docs.length, 1, "after captured payment");
});

for (const [mode, label] of [["error500", "Razorpay API error"], ["network", "network failure"], ["timeout", "timeout"]]) {
  test(`${label} while confirming → 502, nothing stored, retry succeeds later`, async () => {
    const ctx = setup({ timeoutMs: 50 });
    const { orderId } = await startPayment(ctx);
    const checkout = ctx.api.pay(orderId);
    ctx.api.state.mode = mode;
    const started = Date.now();
    const r = await ctx.service.verifyCheckout(checkout);
    assert.equal(r.status, 502);
    assert.ok(Date.now() - started < 2000, "must not hang");
    assert.equal(ctx.col.docs.length, 0);
    ctx.api.state.mode = "ok";
    assert.equal((await ctx.service.verifyCheckout(checkout)).status, 200);
    assert.equal(ctx.col.docs.length, 1);
  });
}

test("database failure while confirming → 500, nothing reported as paid", async () => {
  const ctx = setup();
  const { orderId } = await startPayment(ctx);
  ctx.col.insertOne = async () => { throw new Error("connection reset"); };
  const r = await ctx.service.verifyCheckout(ctx.api.pay(orderId));
  assert.equal(r.status, 500);
  assert.ok(!r.json.booking);
});
