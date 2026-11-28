// Razorpay client: signature formula, auth, error and timeout handling.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRazorpay, RazorpayError } from "../lib/razorpay.js";
import { fakeRazorpayApi } from "./fakes.js";

test("signature check follows Razorpay's documented formula: HMAC_SHA256(order_id + '|' + payment_id, key_secret)", () => {
  const rzp = createRazorpay({ keyId: "rzp_test_x", keySecret: "s3cr3t", fetchImpl: async () => {} });
  const good = crypto.createHmac("sha256", "s3cr3t").update("order_ABC123|pay_DEF456").digest("hex");
  assert.equal(rzp.isValidSignature("order_ABC123", "pay_DEF456", good), true);
  assert.equal(rzp.isValidSignature("order_ABC123", "pay_OTHER1", good), false);
  assert.equal(rzp.isValidSignature("order_ABC123", "pay_DEF456", good.toUpperCase()), false);
  assert.equal(rzp.isValidSignature("order_ABC123", "pay_DEF456", ""), false);
  assert.equal(rzp.isValidSignature("order_ABC123", "pay_DEF456", undefined), false);
});

test("missing keys fail fast", () => {
  assert.throws(() => createRazorpay({ keyId: "", keySecret: "x" }), /not set/);
  assert.throws(() => createRazorpay({ keyId: "x", keySecret: "" }), /not set/);
});

test("wrong Key Secret → RazorpayError 401", async () => {
  const api = fakeRazorpayApi();
  const rzp = createRazorpay({ keyId: api.keyId, keySecret: "wrong", fetchImpl: api.fetchImpl });
  await assert.rejects(rzp.createOrder({ amountPaise: 49900, receipt: "r" }), (e) => e instanceof RazorpayError && e.status === 401);
});

test("timeout → RazorpayError code 'timeout' within the limit", async () => {
  const api = fakeRazorpayApi();
  api.state.mode = "timeout";
  const rzp = createRazorpay({ keyId: api.keyId, keySecret: api.keySecret, fetchImpl: api.fetchImpl, timeoutMs: 40 });
  const t0 = Date.now();
  await assert.rejects(rzp.fetchPayment("pay_ABCDEF123"), (e) => e instanceof RazorpayError && e.code === "timeout");
  assert.ok(Date.now() - t0 < 1000);
});

test("network failure → RazorpayError code 'unreachable'", async () => {
  const api = fakeRazorpayApi();
  api.state.mode = "network";
  const rzp = createRazorpay({ keyId: api.keyId, keySecret: api.keySecret, fetchImpl: api.fetchImpl });
  await assert.rejects(rzp.fetchOrder("order_ABCDEF123"), (e) => e instanceof RazorpayError && e.code === "unreachable");
});
