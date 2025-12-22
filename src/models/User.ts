import mongoose, {
  Schema,
  type InferSchemaType,
  type HydratedDocument,
} from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof UserSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel =
  mongoose.models.User || mongoose.model<User>("User", UserSchema);

