import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VehicleSchema = new Schema(
  {
    plate: { type: String, required: true, unique: true, index: true },
    makeModel: { type: String, required: true },
    odometer: { type: Number, required: true },
    driverName: { type: String, required: true },
  },
  { timestamps: true }
);

export type VehicleDocument = InferSchemaType<typeof VehicleSchema>;

export const VehicleModel =
  mongoose.models.Vehicle ||
  mongoose.model<VehicleDocument>("Vehicle", VehicleSchema);

