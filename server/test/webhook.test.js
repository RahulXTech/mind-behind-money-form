// Razorpay webhook recovery: run with `npm test` inside server/.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { createApp } from "../app.js";
import { makeHandlers } from "../lib/handlers.js";
import { makeBookingService } from "../lib/payments.js";
import { createRazorpay } from "../lib/razorpay.js";
import { isValidWebhookSignature, makeWebhookProcessor } from "../lib/webhook.js";
import { fakeBookings, fakeRazorpayApi, quietLog, VALID_DETAILS } from "./fakes.js";

const WEBHOOK_SECRET = "whsec_separate_webhook_secret";

function setup({ webhookSecret = WEBHOOK_SECRET, captureChecks = 0, timeoutMs = 100 } = {}) {
  const api = fakeRazorpayApi();
  const rzp = createRazorpay({ keyId: api.keyId, keySecret: api.keySecret, fetchImpl: api.fetchImpl, timeoutMs });
  const col = fakeBookings();
  const log = quietLog();
  const service = makeBookingService({ getRazorpay: () => rzp, getBookings: async () => col, captureChecks, captureDelayMs: 5, log });
  const processWebhook = makeWebhookProcessor({ service, getSecrets: () => ({ webhookSecret, keySecret: api.keySecret }), log });
  return { api, col, log, service, processWebhook };
}

async function paidOrder(ctx, opts) {
  const r = await ctx.service.createOrder(VALID_DETAILS);
  assert.equal(r.status, 200);
  return { ...r.json, checkout: ctx.api.pay(r.json.orderId, opts) };
}

/** Builds a Razorpay-style event for a payment in the fake API, signed with the given secret. */
function webhook(ctx, paymentId, { event = "payment.captured", secret = WEBHOOK_SECRET, status } = {}) {
  const p = ctx.api.payments.get(paymentId);
  const notes = ctx.api.orders.get(p.order_id)?.notes ?? {};
  const body = {
    entity: "event",
    account_id: "acc_TEST",
    event,
    contains: ["payment"],
    payload: { payment: { entity: { ...p, status: status ?? (event === "payment.captured" ? "captured" : p.status), notes } } },
    created_at: Math.floor(Date.now() / 1000),
  };
  const rawBody = Buffer.from(JSON.stringify(body), "utf8");
  return { rawBody, signature: crypto.createHmac("sha256", secret).update(rawBody).digest("hex"), eventId: "evt_" + crypto.randomBytes(6).toString("hex") };
}

// ---------------- valid / invalid ----------------

test("valid payment.captured webhook creates the booking when the website never verified (tab closed)", async () => {
  const ctx = setup();
  const { bookingId, checkout } = await paidOrder(ctx);
  const r = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id));
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { status: "confirmed", bookingId });
  assert.equal(ctx.col.docs.length, 1);
  assert.equal(ctx.col.docs[0].payment.paymentId, checkout.razorpay_payment_id);
  assert.equal(ctx.col.docs[0].timeSlot, "शाम");
  assert.ok(ctx.api.state.calls.includes(`GET /payments/${checkout.razorpay_payment_id}`), "status/amount re-checked with Razorpay's API");
});

test("invalid signatures are rejected before anything else happens", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  const good = webhook(ctx, checkout.razorpay_payment_id);
  const callsBefore = ctx.api.state.calls.length;
  const cases = {
    "missing signature": { ...good, signature: undefined },
    "empty signature": { ...good, signature: "" },
    "flipped signature": { ...good, signature: (good.signature[0] === "0" ? "1" : "0") + good.signature.slice(1) },
    "signed with the API Key Secret": webhook(ctx, checkout.razorpay_payment_id, { secret: ctx.api.keySecret }),
    "body changed after signing": { ...good, rawBody: Buffer.from(good.rawBody.toString().replace('"captured"', '"captured" ')) },
    "no raw body": { ...good, rawBody: null },
  };
  for (const [label, input] of Object.entries(cases)) {
    const r = await ctx.processWebhook(input);
    assert.equal(r.status, 400, label);
  }
  assert.equal(ctx.api.state.calls.length, callsBefore, "no Razorpay API calls for unsigned requests");
  assert.equal(ctx.col.docs.length, 0);
});

test("valid signature but malformed JSON → 400", async () => {
  const ctx = setup();
  const rawBody = Buffer.from("{not json");
  const r = await ctx.processWebhook({ rawBody, signature: crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex") });
  assert.equal(r.status, 400);
});

test("missing webhook secret, or webhook secret equal to the Key Secret → 500 (misconfiguration), nothing processed", async () => {
  for (const variant of ["missing", "same-as-key"]) {
    const base = setup();
    const ctx = variant === "missing" ? setup({ webhookSecret: "" }) : setup({ webhookSecret: base.api.keySecret });
    const { checkout } = await paidOrder(ctx);
    const secret = variant === "missing" ? WEBHOOK_SECRET : ctx.api.keySecret;
    const r = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id, { secret }));
    assert.equal(r.status, 500, variant);
    assert.equal(ctx.col.docs.length, 0);
    assert.ok(ctx.log.errors.some((e) => e.includes("RAZORPAY_WEBHOOK_SECRET")), variant);
  }
});

// ---------------- duplicates ----------------

test("duplicate deliveries of the same event (sequential and concurrent) create exactly one booking", async () => {
  const ctx = setup();
  const { bookingId, checkout } = await paidOrder(ctx);
  const evt = webhook(ctx, checkout.razorpay_payment_id);
  const first = await ctx.processWebhook(evt);
  const second = await ctx.processWebhook(evt);
  const burst = await Promise.all(Array.from({ length: 6 }, () => ctx.processWebhook(evt)));
  for (const r of [first, second, ...burst]) assert.deepEqual([r.status, r.json.status, r.json.bookingId], [200, "confirmed", bookingId]);
  assert.equal(ctx.col.docs.length, 1);
});

test("concurrent first deliveries (no booking yet) still create exactly one booking", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  const results = await Promise.all(Array.from({ length: 6 }, () => ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id))));
  assert.deepEqual(results.map((r) => r.status), Array(6).fill(200));
  assert.equal(ctx.col.docs.length, 1);
});

test("webhook and website verification racing each other create one booking", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  const [w, v] = await Promise.all([ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id)), ctx.service.verifyCheckout(checkout)]);
  assert.equal(w.status, 200);
  assert.equal(v.status, 200);
  assert.equal(v.json.booking.id, w.json.bookingId);
  assert.equal(ctx.col.docs.length, 1);
});

// ---------------- out of order ----------------

test("webhook arrives before the website's verification → website gets the same booking", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  const w = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id));
  const v = await ctx.service.verifyCheckout(checkout);
  assert.equal(v.status, 200);
  assert.equal(v.json.booking.id, w.json.bookingId);
  assert.equal(ctx.col.docs.length, 1);
});

test("webhook arrives after the website already verified → acknowledged, no duplicate", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  const v = await ctx.service.verifyCheckout(checkout);
  const w = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id));
  assert.equal(w.status, 200);
  assert.equal(w.json.bookingId, v.json.booking.id);
  assert.equal(ctx.col.docs.length, 1);
});

test("older events delivered late (payment.authorized after payment.captured) are ignored", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  assert.equal((await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id))).status, 200);
  const late = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id, { event: "payment.authorized", status: "authorized" }));
  assert.equal(late.status, 200);
  assert.equal(late.json.status, "ignored");
  assert.equal(ctx.col.docs.length, 1);
  assert.equal(ctx.col.docs[0].payment.status, "paid");
});

test("payment.captured event while Razorpay's API still shows 'authorized' → 503 so Razorpay retries; retry confirms", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx, { status: "authorized" });
  const evt = webhook(ctx, checkout.razorpay_payment_id);
  const r = await ctx.processWebhook(evt);
  assert.equal(r.status, 503);
  assert.equal(ctx.col.docs.length, 0);
  ctx.api.payments.get(checkout.razorpay_payment_id).status = "captured";
  assert.equal((await ctx.processWebhook(evt)).status, 200);
  assert.equal(ctx.col.docs.length, 1);
});

test("Razorpay API down while processing → 503 (retry), nothing stored; later delivery succeeds", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  const evt = webhook(ctx, checkout.razorpay_payment_id);
  ctx.api.state.mode = "timeout";
  assert.equal((await ctx.processWebhook(evt)).status, 503);
  assert.equal(ctx.col.docs.length, 0);
  ctx.api.state.mode = "ok";
  assert.equal((await ctx.processWebhook(evt)).status, 200);
  assert.equal(ctx.col.docs.length, 1);
});

// ---------------- events that must not create bookings ----------------

test("other events are acknowledged and ignored", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx, { status: "failed" });
  for (const event of ["payment.failed", "payment.authorized", "order.paid", "refund.processed"]) {
    const r = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id, { event }));
    assert.equal(r.status, 200, event);
    assert.equal(r.json.status, "ignored", event);
  }
  assert.equal(ctx.col.docs.length, 0);
});

test("captured payment for an order not created by this site → acknowledged, no booking", async () => {
  const ctx = setup();
  const rzp = createRazorpay({ keyId: ctx.api.keyId, keySecret: ctx.api.keySecret, fetchImpl: ctx.api.fetchImpl });
  const order = await rzp.createOrder({ amountPaise: 49900, receipt: "dashboard-link" });
  const checkout = ctx.api.pay(order.id);
  const r = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id));
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "ignored");
  assert.equal(ctx.col.docs.length, 0);
});

test("captured payment with the wrong amount → acknowledged, no booking", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx, { amount: 100 });
  const r = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id));
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "ignored");
  assert.equal(ctx.col.docs.length, 0);
});

test("second captured payment for an already-paid booking → acknowledged, first payment kept, ALERT logged", async () => {
  const ctx = setup();
  const { orderId, checkout } = await paidOrder(ctx);
  const second = ctx.api.pay(orderId);
  assert.equal((await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id))).status, 200);
  const r = await ctx.processWebhook(webhook(ctx, second.razorpay_payment_id));
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "ignored");
  assert.equal(ctx.col.docs.length, 1);
  assert.equal(ctx.col.docs[0].payment.paymentId, checkout.razorpay_payment_id);
  assert.ok(ctx.log.errors.some((e) => e.includes("ALERT") && e.includes(second.razorpay_payment_id)));
});

test("payment without an order id → acknowledged, ignored", async () => {
  const ctx = setup();
  const { checkout } = await paidOrder(ctx);
  ctx.api.payments.get(checkout.razorpay_payment_id).order_id = null;
  const r = await ctx.processWebhook(webhook(ctx, checkout.razorpay_payment_id));
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "ignored");
  assert.equal(ctx.col.docs.length, 0);
});

test("signature helper: Razorpay's formula, constant-time compare, rejects junk", () => {
  const body = Buffer.from('{"a":"शाम"}');
  const sig = crypto.createHmac("sha256", "s").update(body).digest("hex");
  assert.equal(isValidWebhookSignature(body, sig, "s"), true);
  assert.equal(isValidWebhookSignature(body, sig, "other"), false);
  assert.equal(isValidWebhookSignature(body, sig.toUpperCase(), "s"), false);
  assert.equal(isValidWebhookSignature(body, "zz", "s"), false);
  assert.equal(isValidWebhookSignature(body, sig, ""), false);
});

// ---------------- over real HTTP (raw bytes) ----------------

let server, port, httpCtx;
before(async () => {
  httpCtx = setup();
  server = createApp(makeHandlers(httpCtx.service, httpCtx.processWebhook));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});
after(() => server.close());

/** Sends the body in two TCP writes, split in the middle of a multi-byte character. */
function postInChunks(path, rawBody, headers, splitAt) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": rawBody.length, ...headers } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(data || "{}"), acao: res.headers["access-control-allow-origin"] }));
    });
    req.on("error", reject);
    req.write(rawBody.subarray(0, splitAt));
    setTimeout(() => req.end(rawBody.subarray(splitAt)), 20);
  });
}

test("HTTP: signature is checked on raw bytes even when a Hindi character is split across network chunks", async () => {
  const { checkout } = await paidOrder(httpCtx);
  const evt = webhook(httpCtx, checkout.razorpay_payment_id);
  const hindiAt = evt.rawBody.indexOf(Buffer.from("शाम"));
  assert.ok(hindiAt > 0, "payload contains Hindi");
  const r = await postInChunks("/api/razorpay-webhook", evt.rawBody, { "X-Razorpay-Signature": evt.signature, "X-Razorpay-Event-Id": evt.eventId }, hindiAt + 1);
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "confirmed");
  assert.equal(r.acao, undefined, "webhook sends no CORS headers");
});

test("HTTP: bad signature → 400, GET → 405, oversized → 413", async () => {
  const { checkout } = await paidOrder(httpCtx);
  const evt = webhook(httpCtx, checkout.razorpay_payment_id);
  assert.equal((await postInChunks("/api/razorpay-webhook", evt.rawBody, { "X-Razorpay-Signature": "0".repeat(64) }, 10)).status, 400);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/razorpay-webhook`)).status, 405);
  const big = Buffer.alloc(250_000, 0x20);
  const r = await fetch(`http://127.0.0.1:${port}/api/razorpay-webhook`, { method: "POST", body: big, headers: { "X-Razorpay-Signature": "0".repeat(64) } });
  assert.equal(r.status, 413);
});
