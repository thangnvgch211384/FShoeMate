const mongoose = require("mongoose");

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }
  },
  { timestamps: true, _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    items: [wishlistItemSchema]
  },
  { timestamps: true }
);

// Prevent duplicate products in wishlist
wishlistSchema.index({ userId: 1, "items.productId": 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);

