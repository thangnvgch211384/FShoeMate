const mongoose = require("mongoose");

const stockHistorySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["import", "export"], required: true },
    quantity: { type: Number, required: true },
    reason: String, 
    supplier: String,
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: Number,
    stock: { type: Number, default: 0, min: 0 },
    stockHistory: { type: [stockHistorySchema], default: [] },
    images: { type: [String], default: [] }
  },
  { timestamps: true }
);

variantSchema.index({ productId: 1, size: 1, color: 1 }, { unique: true });

module.exports = mongoose.model("ProductVariant", variantSchema);