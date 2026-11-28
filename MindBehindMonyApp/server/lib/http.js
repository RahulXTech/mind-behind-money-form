// CORS + small helpers shared by the API functions.
const allowed = (process.env.ALLOWED_ORIGINS || "https://consult.axamp.com,https://axamp.com,https://www.axamp.com,http://localhost:5173")
  .split(",").map((s) => s.trim()).filter(Boolean);

/** Sets CORS headers. Returns true when the request is already answered (preflight / wrong method). */
export function handleCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return true; }
  return false;
}

export function readBody(req) {
  if (typeof req.body === "string") { try { return JSON.parse(req.body || "{}"); } catch (_) { return {}; } }
  return req.body || {};
}

/** Booking as the website expects it: dates as ISO strings, no Mongo _id. */
export function toClient(doc) {
  const { _id, ...rest } = doc;
  const iso = (d) => (d instanceof Date ? d.toISOString() : d);
  return { ...rest, createdAt: iso(rest.createdAt), payment: { ...rest.payment, paidAt: iso(rest.payment?.paidAt) } };
}
