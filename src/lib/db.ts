import mongoose, { type Connection } from "mongoose";
import { getMongoDbName, getMongoUri } from "./env";

mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

export const connectDb = async (): Promise<Connection> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }

  await mongoose.connect(getMongoUri(), {
    dbName: getMongoDbName(),
  });
  return mongoose.connection;
};
