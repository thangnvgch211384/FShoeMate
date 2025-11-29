const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    parentId: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);