/* ============ Booking storage + server calls ============
 * Every confirmed booking is kept in this browser's localStorage ("mbm-bookings") as a backup.
 * When CONFIG.API_URL is set (the server in /server, hosted on Vercel), the server is the real record:
 *   createServerOrder() → saves the booking in MongoDB and creates the Razorpay order
 *   verifyServerPayment() → checks Razorpay's signature and marks the booking "paid"
 * The Razorpay Key Secret and the MongoDB connection string live only on that server.
 */
import { CONFIG } from "./config.js";

const KEY = "mbm-bookings";
const api = (path) => CONFIG.API_URL.replace(/\/+$/, "") + path;

export function listBookings() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

export function saveLocal(booking) {
  try { localStorage.setItem(KEY, JSON.stringify([...listBookings(), booking])); } catch (_) {}
}

async function post(path, data, code) {
  let res, json;
  try {
    res = await fetch(api(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    json = await res.json().catch(() => ({}));
  } catch (err) {
    throw Object.assign(new Error("Network error: " + err.message), { code });
  }
  if (!res.ok) throw Object.assign(new Error(json.error || `Server responded ${res.status}`), { code });
  return json;
}

/** @returns {Promise<{ bookingId, orderId, amount, keyId }>} */
export const createServerOrder = (details) => post("/api/create-order", details, "failed");

/** @returns {Promise<object>} the confirmed booking */
export async function verifyServerPayment(data) {
  return (await post("/api/verify-payment", data, "verify")).booking;
}
