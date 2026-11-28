// HTTP handlers (Vercel-style req/res) around the booking service and the webhook processor.
import { bookings } from "./db.js";
import { handleCors, readBody } from "./http.js";
import { makeBookingService } from "./payments.js";
import { razorpayFromEnv } from "./razorpay.js";
import { makeWebhookProcessor } from "./webhook.js";

export function makeHandlers(service, processWebhook) {
  const wrap = (fn) => async (req, res) => {
    if (handleCors(req, res)) return;
    const { status, json } = await fn(readBody(req));
    res.status(status).json(json);
  };
  return {
    createOrder: wrap(service.createOrder),
    verifyPayment: wrap(service.verifyCheckout),
    // Server-to-server from Razorpay: no CORS. Needs req.rawBody (the exact bytes Razorpay signed).
    async razorpayWebhook(req, res) {
      if (!processWebhook) return res.status(404).json({ error: "Not found" });
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : typeof req.rawBody === "string" ? Buffer.from(req.rawBody, "utf8") : null;
      const { status, json } = await processWebhook({
        rawBody,
        signature: req.headers["x-razorpay-signature"],
        eventId: req.headers["x-razorpay-event-id"],
      });
      res.status(status).json(json);
    },
  };
}

let defaults = null;
/** Handlers wired to the real Razorpay account and MongoDB (settings from environment variables). */
export function defaultHandlers() {
  if (!defaults) {
    const service = makeBookingService({ getRazorpay: razorpayFromEnv, getBookings: bookings });
    const processWebhook = makeWebhookProcessor({
      service,
      getSecrets: () => ({ webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET, keySecret: process.env.RAZORPAY_KEY_SECRET }),
    });
    defaults = makeHandlers(service, processWebhook);
  }
  return defaults;
}
