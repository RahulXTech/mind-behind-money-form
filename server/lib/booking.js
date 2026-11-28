// Booking details: validation, booking ids, and storing details on the Razorpay order (notes).
// Razorpay notes are set by this server with the Key Secret, so the browser can never change them.
// Limits: at most 15 notes, each value at most 256 characters.
import crypto from "node:crypto";
import { PLANS, SLOTS } from "./plans.js";

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const TOPIC_MAX = 300;
const TOPIC_PART = 150;

export const amountPaise = (plan) => PLANS[plan].amount * 100;

export function newBookingId(now = new Date()) {
  const code = Array.from(crypto.randomBytes(4), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
  return `MBM-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${code}`;
}

/** Validates what the visitor sent. Returns { details } or { error }. Any amount sent by the browser is ignored. */
export function validateDetails(b = {}) {
  const plan = String(b.plan ?? "");
  if (!Object.hasOwn(PLANS, plan)) return { error: "Invalid plan" };
  const details = {
    plan,
    name: str(b.name, 80),
    mobile: str(b.mobile, 24),
    email: str(b.email, 120).toLowerCase(),
    preferredDate: str(b.preferredDate, 10),
    timeSlot: String(b.timeSlot ?? ""),
    topic: str(b.topic, TOPIC_MAX),
    language: str(b.language, 10),
  };
  if (details.name.length < 2) return { error: "Invalid name" };
  if (!/^\+\d{1,4} \d{6,14}$/.test(details.mobile)) return { error: "Invalid mobile" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email)) return { error: "Invalid email" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.preferredDate)) return { error: "Invalid date" };
  if (!SLOTS.includes(details.timeSlot)) return { error: "Invalid time slot" };
  return { details };
}

export function toOrderNotes(bookingId, d) {
  return {
    bookingId,
    plan: d.plan,
    name: d.name,
    mobile: d.mobile,
    email: d.email,
    preferredDate: d.preferredDate,
    timeSlot: d.timeSlot,
    language: d.language,
    topic_1: d.topic.slice(0, TOPIC_PART),
    topic_2: d.topic.slice(TOPIC_PART, TOPIC_MAX),
  };
}

/** Reads the booking back from a Razorpay order's notes. Returns null if they are not ours / incomplete. */
export function fromOrderNotes(notes) {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return null;
  if (!/^MBM-\d{8}-[A-Z0-9]{4}$/.test(String(notes.bookingId ?? ""))) return null;
  const { details, error } = validateDetails({ ...notes, topic: `${notes.topic_1 ?? ""}${notes.topic_2 ?? ""}` });
  if (error) return null;
  return { bookingId: notes.bookingId, ...details };
}
