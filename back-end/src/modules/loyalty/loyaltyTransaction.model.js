const mongoose = require("mongoose");

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    pointsEarned: { type: Number, required: true },
    revenue: { type: Number, required: true },
    reason: { type: String, default: "Order completion" },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);