import mongoose, {
  Schema,
  type InferSchemaType,
  type HydratedDocument,
  type Model,
} from "mongoose";
import { USER_ROLES } from "../lib/roles";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 64,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "user" },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.set("toJSON", {
  transform(_doc, ret: Record<string, unknown>) {
    delete ret.passwordHash;
    return ret;
  },
});

export type User = InferSchemaType<typeof UserSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel: Model<User> =
  (mongoose.models.User as Model<User> | undefined) ||
  mongoose.model<User>("User", UserSchema);
