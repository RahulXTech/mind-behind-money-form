// One MongoDB connection, reused between requests while the function stays warm.
import { MongoClient } from "mongodb";

let clientPromise = null;

export async function bookings() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI).connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "mindbehindmoney").collection("bookings");
}
