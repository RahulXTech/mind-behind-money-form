// HTTP layer of the Node server (what Hostinger runs): routing, CORS, limits, full flow over real HTTP.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { makeHandlers } from "../lib/handlers.js";
import { makeBookingService } from "../lib/payments.js";
import { createRazorpay } from "../lib/razorpay.js";
import { fakeBookings, fakeRazorpayApi, quietLog, VALID_DETAILS } from "./fakes.js";

const api = fakeRazorpayApi();
const col = fakeBookings();
const rzp = createRazorpay({ keyId: api.keyId, keySecret: api.keySecret, fetchImpl: api.fetchImpl, timeoutMs: 200 });
const service = makeBookingService({ getRazorpay: () => rzp, getBookings: async () => col, captureChecks: 0, log: quietLog() });
let server, base;

before(async () => {
  server = createApp(makeHandlers(service));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function call(path, { method = "POST", body, raw, origin = "https://axamp.in" } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, json, acao: res.headers.get("access-control-allow-origin") };
}

test("GET /api/health", async () => {
  const r = await call("/api/health", { method: "GET", origin: null });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true, service: "mind-behind-money-api" });
});

test("unknown path → 404, wrong method → 405", async () => {
  assert.equal((await call("/api/nope")).status, 404);
  assert.equal((await call("/api/create-order", { method: "GET" })).status, 405);
  assert.equal((await call("/api/verify-payment", { method: "PUT", body: {} })).status, 405);
});

test("CORS allows https://axamp.in and https://www.axamp.in (default list) and refuses other sites", async () => {
  for (const origin of ["https://axamp.in", "https://www.axamp.in"]) {
    const r = await call("/api/create-order", { method: "OPTIONS", origin });
    assert.equal(r.status, 204);
    assert.equal(r.acao, origin);
  }
  for (const origin of ["https://evil.example", "https://axamp.in.evil.example", "http://axamp.in"]) {
    const r = await call("/api/create-order", { method: "OPTIONS", origin });
    assert.equal(r.acao, null, origin);
  }
});

test("invalid JSON → 400, oversized body → 413", async () => {
  assert.equal((await call("/api/create-order", { raw: "{not json" })).status, 400);
  assert.equal((await call("/api/verify-payment", { raw: "{not json" })).status, 400);
  assert.equal((await call("/api/create-order", { raw: JSON.stringify({ ...VALID_DETAILS, topic: "x".repeat(30_000) }) })).status, 413);
});

test("full flow over HTTP: create-order (no DB write) → pay → verify (booking) → verify again (same)", async () => {
  const before = col.docs.length;
  const order = await call("/api/create-order", { body: { ...VALID_DETAILS, amount: 1 } });
  assert.equal(order.status, 200);
  assert.equal(order.json.amount, 499);
  assert.equal(col.docs.length, before);

  const checkout = api.pay(order.json.orderId);
  const v1 = await call("/api/verify-payment", { body: { ...checkout, bookingId: "MBM-ignored" } });
  assert.equal(v1.status, 200);
  assert.equal(v1.json.booking.id, order.json.bookingId);
  assert.equal(v1.json.booking.payment.paymentId, checkout.razorpay_payment_id);
  assert.equal(col.docs.length, before + 1);

  const v2 = await call("/api/verify-payment", { body: checkout });
  assert.equal(v2.status, 200);
  assert.deepEqual(v2.json, v1.json);
  assert.equal(col.docs.length, before + 1);
});

test("authorized-only payment over HTTP → 202 pending", async () => {
  const order = await call("/api/create-order", { body: VALID_DETAILS });
  const r = await call("/api/verify-payment", { body: api.pay(order.json.orderId, { status: "authorized" }) });
  assert.equal(r.status, 202);
  assert.equal(r.json.status, "pending");
});
