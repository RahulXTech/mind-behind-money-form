// Razorpay REST client (no SDK): orders, payments, checkout signature check.
// All calls use the Key Secret from the server's environment and time out (RAZORPAY_TIMEOUT_MS, default 10 s).
import crypto from "node:crypto";

export class RazorpayError extends Error {
  constructor(message, { status = 0, code = "api_error" } = {}) {
    super(message);
    this.name = "RazorpayError";
    this.status = status;
    this.code = code;
  }
}

export function createRazorpay({ keyId, keySecret, fetchImpl = globalThis.fetch, timeoutMs = 10_000, baseUrl = "https://api.razorpay.com/v1" }) {
  if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set");
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  async function call(method, path, body) {
    let res;
    try {
      res = await fetchImpl(baseUrl + path, {
        method,
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
      throw new RazorpayError(timedOut ? `Razorpay ${method} ${path} timed out` : `Could not reach Razorpay: ${err?.message}`, { code: timedOut ? "timeout" : "unreachable" });
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      throw new RazorpayError(`Razorpay ${method} ${path} failed (${res.status}): ${data?.error?.description || "no details"}`, { status: res.status });
    }
    return data;
  }

  return {
    keyId,
    /** amountPaise is set by the server from the plan, never by the browser. */
    createOrder: ({ amountPaise, receipt, notes }) => call("POST", "/orders", { amount: amountPaise, currency: "INR", receipt, notes }),
    fetchOrder: (orderId) => call("GET", `/orders/${encodeURIComponent(orderId)}`),
    fetchPayment: (paymentId) => call("GET", `/payments/${encodeURIComponent(paymentId)}`),
    /** Checkout signature: HMAC-SHA256("<order_id>|<payment_id>", Key Secret), hex. */
    isValidSignature(orderId, paymentId, signature) {
      const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(String(signature ?? ""));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  };
}

let fromEnv = null;
/** The client configured from environment variables (created on first use). */
export function razorpayFromEnv() {
  fromEnv ??= createRazorpay({
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    timeoutMs: Number(process.env.RAZORPAY_TIMEOUT_MS) || 10_000,
  });
  return fromEnv;
}
