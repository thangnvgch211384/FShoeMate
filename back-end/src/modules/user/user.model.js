const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: addressSchema, default: {} },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer"
    },
    membershipLevel: {
      type: String,
      enum: ["silver", "gold", "diamond", null],
      default: null
    },
    loyaltyPoints: { type: Number, default: 0 },
    lastMembershipUpdate: { type: Date },
    oauthProvider: { type: String, trim: true },
    oauthId: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);