import mongoose, { type Connection } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "hmf2";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable eksik.");
}

/**
 * Mongoose bağlantısını tekil bir bağlantıda tutar (Next.js hot reload uyumlu).
 */
export const connectDb = async (): Promise<Connection> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: DB_NAME,
  });
  return mongoose.connection;
};

