// One MongoDB connection, reused between requests while the process / function stays warm.
// Unique indexes make "one booking per Razorpay order" and "one booking per payment" a database guarantee,
// so two simultaneous confirmations can never create two bookings.
import { MongoClient } from "mongodb";

let clientPromise = null;
let indexesReady = null;

export async function bookings() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI).connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB || "mindbehindmoney").collection("bookings");
  indexesReady ??= Promise.all([
    col.createIndex({ "payment.orderId": 1 }, { unique: true, name: "uniq_order", partialFilterExpression: { "payment.orderId": { $exists: true } } }),
    col.createIndex({ "payment.paymentId": 1 }, { unique: true, name: "uniq_payment", partialFilterExpression: { "payment.paymentId": { $exists: true } } }),
  ]).catch((err) => {
    indexesReady = null;
    throw err;
  });
  await indexesReady;
  return col;
}






