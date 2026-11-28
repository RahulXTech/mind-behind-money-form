// Plain Node.js HTTP server for Hostinger / any Node host. Same handlers as the Vercel functions in api/.
//   GET  /api/health             → { ok: true }
//   POST /api/create-order       → start a payment            (from the website)
//   POST /api/verify-payment     → confirm a payment          (from the website)
//   POST /api/razorpay-webhook   → payment.captured recovery  (from Razorpay)
import http from "node:http";

export const MAX_BODY = 20_000; // bytes, website requests
export const MAX_WEBHOOK_BODY = 200_000; // bytes, Razorpay event payloads

export function createApp(handlers) {
  const routes = {
    "/api/create-order": [handlers.createOrder, MAX_BODY],
    "/api/verify-payment": [handlers.verifyPayment, MAX_BODY],
    "/api/razorpay-webhook": [handlers.razorpayWebhook, MAX_WEBHOOK_BODY],
  };

  return http.createServer(async (req, res) => {
    // Vercel-style helpers used by the handlers
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return res; };

    const path = new URL(req.url, "http://localhost").pathname.replace(/\/+$/, "");
    if (path === "" || path === "/api/health") return res.json({ ok: true, service: "mind-behind-money-api" });
    const route = routes[path];
    if (!route || !route[0]) return res.status(404).json({ error: "Not found" });
    const [handler, limit] = route;

    try {
      // Collect raw bytes (joining text chunks could split a multi-byte character, e.g. Hindi in notes)
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) return res.status(413).json({ error: "Request too large" });
        chunks.push(chunk);
      }
      req.rawBody = Buffer.concat(chunks); // exact bytes — the webhook signature is computed over these
      req.body = req.rawBody.toString("utf8");
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: "Server error" });
    }
  });
}
