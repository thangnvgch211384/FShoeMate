const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "fixed", "shipping"], required: true },
    discountValue: { type: Number, required: true },              
    maxDiscount: { type: Number, default: null },                 
    membershipLevel: { type: String, enum: [null, "silver", "gold", "diamond"], default: null },
    minOrderValue: { type: Number, default: 0 },
    maxUses: { type: Number, default: 0 },               
    usedCount: { type: Number, default: 0 },
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

promotionSchema.virtual("status").get(function() {
  if (!this.isActive) return "inactive";
  const now = new Date();
  if (this.endDate && this.endDate < now) return "expired";
  if (this.startDate && this.startDate > now) return "inactive";
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) return "expired";
  return "active";
});

promotionSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Promotion", promotionSchema);