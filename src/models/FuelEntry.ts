import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FuelEntrySchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    plate: { type: String, required: true, index: true },
    liters: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

export type FuelEntryDocument = InferSchemaType<typeof FuelEntrySchema>;

export const FuelEntryModel =
  mongoose.models.FuelEntry ||
  mongoose.model<FuelEntryDocument>("FuelEntry", FuelEntrySchema);

