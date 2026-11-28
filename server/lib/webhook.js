// Razorpay webhook (recovery): confirms bookings even when the visitor closed the tab before the website
// could call /api/verify-payment.
//
// Security: Razorpay signs the exact request bytes with the WEBHOOK secret (set when creating the webhook in the
// Razorpay dashboard). This is a different credential from the API Key Secret, and using the same value is refused.
// The payload is only used for the order + payment ids; amount, currency and status are re-read from Razorpay's API
// by confirmPayment(), the same function the website's verification uses.
//
// Response codes are chosen for Razorpay's retry behaviour (it retries non-2xx deliveries):
//   200 → done or nothing to do (confirmed, duplicate, other event, not our order, other payment already recorded)
//   400 → bad signature / malformed body (not from Razorpay)
//   500 → server misconfigured (missing / reused secret) — fix the config; Razorpay keeps retrying meanwhile
//   503 → temporary (Razorpay API unreachable, payment not captured yet, database error) — Razorpay retries
import crypto from "node:crypto";
import { ORDER_ID, PAYMENT_ID } from "./payments.js";

const reply = (status, json) => ({ status, json });

/** HMAC-SHA256(raw body bytes, webhook secret), hex — compared in constant time. */
export function isValidWebhookSignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * @param {object} deps
 * @param {{ confirmPayment: Function }} deps.service  from makeBookingService()
 * @param {() => { webhookSecret?: string, keySecret?: string }} deps.getSecrets
 */
export function makeWebhookProcessor({ service, getSecrets, log = console }) {
  return async function processWebhook({ rawBody, signature, eventId = "" }) {
    const { webhookSecret, keySecret } = getSecrets();
    if (!webhookSecret) {
      log.error("[webhook] RAZORPAY_WEBHOOK_SECRET is not set");
      return reply(500, { error: "Webhook not configured" });
    }
    if (keySecret && webhookSecret === keySecret) {
      log.error("[webhook] RAZORPAY_WEBHOOK_SECRET must not be the same as RAZORPAY_KEY_SECRET — set a separate webhook secret");
      return reply(500, { error: "Webhook not configured" });
    }
    if (!Buffer.isBuffer(rawBody) || !isValidWebhookSignature(rawBody, signature, webhookSecret)) {
      return reply(400, { error: "Invalid webhook signature" });
    }

    let event;
    try { event = JSON.parse(rawBody.toString("utf8")); } catch (_) { return reply(400, { error: "Invalid JSON" }); }

    if (event?.event !== "payment.captured") return reply(200, { status: "ignored", reason: `event ${event?.event ?? "unknown"}` });
    const entity = event?.payload?.payment?.entity;
    const paymentId = entity?.id;
    const orderId = entity?.order_id;
    if (!PAYMENT_ID.test(String(paymentId)) || !ORDER_ID.test(String(orderId))) {
      return reply(200, { status: "ignored", reason: "payment has no order" });
    }

    const r = await service.confirmPayment({ orderId, paymentId });
    const tag = `[webhook ${eventId || "-"}] ${orderId} ${paymentId}`;
    switch (r.status) {
      case 200:
        return reply(200, { status: "confirmed", bookingId: r.json.booking.id });
      case 409: // a different payment already paid this booking; confirmPayment logged an ALERT to refund it
        return reply(200, { status: "ignored", reason: "booking already paid by another payment" });
      case 400: // not one of our orders, or amount/currency/order mismatch — retrying would not change that
        log.error(`${tag} not confirmed: ${r.json.error}`);
        return reply(200, { status: "ignored", reason: r.json.error });
      case 202: // Razorpay's API does not show it as captured yet — let Razorpay retry later
        return reply(503, { error: "Payment not captured yet, retry later" });
      default:
        log.error(`${tag} temporary failure (${r.status}): ${r.json.error}`);
        return reply(503, { error: "Temporary failure, retry later" });
    }
  };
}
