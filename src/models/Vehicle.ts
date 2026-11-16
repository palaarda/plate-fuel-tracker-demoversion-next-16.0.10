import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { VEHICLE_LIMITS } from "../lib/validation";

const VehicleSchema = new Schema(
  {
    plate: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: VEHICLE_LIMITS.plateMaxLength,
    },
    makeModel: {
      type: String,
      required: true,
      trim: true,
      maxlength: VEHICLE_LIMITS.makeModelMaxLength,
    },
    odometer: {
      type: Number,
      required: true,
      min: 0,
      max: VEHICLE_LIMITS.odometerMax,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
      maxlength: VEHICLE_LIMITS.driverNameMaxLength,
    },
  },
  { timestamps: true }
);

export type VehicleDocument = InferSchemaType<typeof VehicleSchema>;

export const VehicleModel: Model<VehicleDocument> =
  (mongoose.models.Vehicle as Model<VehicleDocument> | undefined) ||
  mongoose.model<VehicleDocument>("Vehicle", VehicleSchema);
