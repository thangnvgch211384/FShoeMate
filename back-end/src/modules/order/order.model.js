const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    productSnapshot: {
      name: String,
      brand: String,
      size: String,
      color: String,
      image: String,
      price: Number
    },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const guestInfoSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    address: String
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestInfo: guestInfoSchema,
    items: { type: [orderItemSchema], required: true },
    totals: { type: totalsSchema, required: true },
    paymentMethod: { type: String, enum: ["cod", "payos"], default: "cod" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    status: { type: String, enum: ["pending", "processing", "shipped", "delivered", "cancelled"], default: "pending" },
    discountCode: String,
    membershipDiscount: Number,
    shippingMethod: { type: String, enum: ["standard", "express", "free"], default: "standard" },
    invoiceUrl: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);