import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { FUEL_LIMITS } from "../lib/validation";

const FuelEntrySchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    plate: { type: String, required: true, index: true },
    liters: {
      type: Number,
      required: true,
      min: FUEL_LIMITS.litersMin,
      max: FUEL_LIMITS.litersMax,
    },
    amount: {
      type: Number,
      required: true,
      min: FUEL_LIMITS.amountMin,
      max: FUEL_LIMITS.amountMax,
    },
  },
  { timestamps: true }
);

export type FuelEntryDocument = InferSchemaType<typeof FuelEntrySchema>;

export const FuelEntryModel: Model<FuelEntryDocument> =
  (mongoose.models.FuelEntry as Model<FuelEntryDocument> | undefined) ||
  mongoose.model<FuelEntryDocument>("FuelEntry", FuelEntrySchema);
