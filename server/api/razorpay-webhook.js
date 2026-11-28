// Vercel function: POST /api/razorpay-webhook  (Razorpay → server; see README "Razorpay webhook")
// Reads the raw request bytes itself, because the signature must be checked on exactly what Razorpay sent.
import { defaultHandlers } from "../lib/handlers.js";
import { MAX_WEBHOOK_BODY } from "../app.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_WEBHOOK_BODY) return res.status(413).json({ error: "Request too large" });
    chunks.push(Buffer.from(chunk));
  }
  req.rawBody = Buffer.concat(chunks);
  return defaultHandlers().razorpayWebhook(req, res);
}
