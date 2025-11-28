const mongoose = require("mongoose");

const TARGET_AUDIENCE = ["male", "female", "kids", "unisex"];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    categoryId: { type: String, required: true },
    categoryName: { type: String, trim: true },
    brand: { type: String, required: true },
    targetAudience: {
      type: [String],
      enum: TARGET_AUDIENCE,
      default: []
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    price: { type: Number, required: true },
    originalPrice: Number,
    colors: [{ name: String, hex: String, images: [String] }],
    sizes: [String],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isNew: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false }
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

module.exports = mongoose.model("Product", productSchema);