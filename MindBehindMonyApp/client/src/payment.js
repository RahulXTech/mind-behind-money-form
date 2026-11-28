/* ============ Payment ============
 * TEST MODE (no CONFIG.API_URL and no CONFIG.RAZORPAY_KEY_ID): waits a moment, returns a fake "pay_TEST…" id.
 * Otherwise opens Razorpay Checkout. With the server (CONFIG.API_URL) the key and order id come from it.
 *
 * pay() resolves with { provider, paymentId, orderId, signature }
 * and rejects with an Error whose .code is "cancelled" (visitor closed the window) or "failed".
 *
 * The order id + signature are checked on the server (server/api/verify-payment.js) with the Key Secret,
 * which must never be put in this website.
 */
import { CONFIG } from "./config.js";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export const isTestMode = () => !CONFIG.API_URL && !CONFIG.RAZORPAY_KEY_ID;

let checkoutLoading = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutLoading) {
    checkoutLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CHECKOUT_SRC;
      s.onload = resolve;
      s.onerror = () => {
        checkoutLoading = null;
        reject(Object.assign(new Error("Could not load Razorpay"), { code: "failed" }));
      };
      document.head.appendChild(s);
    });
  }
  return checkoutLoading;
}

const randomId = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

/**
 * @param {{ amount: number, description: string, prefill: {name, email, contact}, notes?: object, orderId?: string, keyId?: string }} p
 *        amount is in rupees.
 */
export async function pay({ amount, description, prefill, notes = {}, orderId, keyId = CONFIG.RAZORPAY_KEY_ID }) {
  if (!keyId) {
    await new Promise((r) => setTimeout(r, 1200));
    return { provider: "test", paymentId: "pay_TEST" + randomId(10), orderId: "", signature: "" };
  }

  await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      name: "Mind Behind Money",
      description,
      image: new URL("assets/logo.png", document.baseURI).href,
      order_id: orderId || undefined,
      prefill,
      notes,
      theme: { color: "#2A7470" },
      handler: (r) =>
        resolve({
          provider: "razorpay",
          paymentId: r.razorpay_payment_id,
          orderId: r.razorpay_order_id || "",
          signature: r.razorpay_signature || "",
        }),
      modal: { ondismiss: () => reject(Object.assign(new Error("Payment cancelled"), { code: "cancelled" })) },
    });
    rzp.on("payment.failed", (r) =>
      reject(Object.assign(new Error(r?.error?.description || "Payment failed"), { code: "failed" })),
    );
    rzp.open();
  });
}

export { randomId };
