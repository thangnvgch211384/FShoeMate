const mongoose = require("mongoose");
const Variant = require("./variant.model");
const Product = require("../product/product.model");

async function ensureProduct(productId) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid productId");
  }
  const exists = await Product.exists({ _id: productId });
  if (!exists) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
}

async function createVariant(productId, data) {
  await ensureProduct(productId);
  return Variant.create({ ...data, productId });
}

async function listVariants(productId) {
  await ensureProduct(productId);
  const variants = await Variant.find({ productId })
    .populate("productId", "name brand categoryName colors")
    .lean();
  
  // Filter out variants with deleted products (productId is null or undefined after populate)
  return variants.filter(v => v.productId && v.productId._id);
}

function getVariant(id) {
  return Variant.findById(id);
}

function updateVariant(id, data) {
  return Variant.findByIdAndUpdate(id, data, { new: true });
}

async function adjustStock(id, { type, quantity, reason, supplier }) {
  const variant = await Variant.findById(id);
  if (!variant) return null;

  const delta = type === "import" ? quantity : -quantity;
  const newStock = variant.stock + delta;
  if (newStock < 0) {
    const err = new Error("Stock cannot be negative");
    err.status = 400;
    throw err;
  }

  // Create stock history entry
  const historyEntry = {
    type,
    quantity,
    date: new Date()
  };
  
  // Only add reason and supplier if they have values
  if (reason && typeof reason === 'string' && reason.trim()) {
    historyEntry.reason = reason.trim();
  }
  
  if (supplier && typeof supplier === 'string' && supplier.trim()) {
    historyEntry.supplier = supplier.trim();
  }
  
  // Update stock and add to history using findByIdAndUpdate to ensure atomic operation
  const updatedVariant = await Variant.findByIdAndUpdate(
    id,
    {
      $set: { stock: newStock },
      $push: { stockHistory: historyEntry }
    },
    { new: true }
  );
  
  return updatedVariant;
}

function deleteVariant(id) {
  return Variant.findByIdAndDelete(id);
}

async function listAllVariants(query = {}) {
  const { search, status, minStock, maxStock } = query;
  
  let filter = {};
  
  // Stock status filter
  if (status === "low") {
    filter.stock = { $lte: 5, $gt: 0 };
  } else if (status === "out") {
    filter.stock = { $eq: 0 };
  } else if (status === "in_stock") {
    filter.stock = { $gt: 5 };
  }
  
  // Stock range filter (only if status filter is not set)
  if (!status) {
    if (minStock !== undefined || maxStock !== undefined) {
      filter.stock = {};
      if (minStock !== undefined) {
        filter.stock.$gte = Number(minStock);
      }
      if (maxStock !== undefined) {
        filter.stock.$lte = Number(maxStock);
      }
    }
  }
  
  const variants = await Variant.find(filter)
    .populate("productId", "name brand categoryName colors")
    .sort({ stock: 1, createdAt: -1 })
    .lean();
  
  // Filter out variants with deleted products (productId is null or undefined)
  const validVariants = variants.filter(v => v.productId && v.productId._id);
  
  // Filter by search term after populate
  if (search) {
    const searchLower = search.toLowerCase();
    return validVariants.filter(v => 
      v.productId?.name?.toLowerCase().includes(searchLower) ||
      `${v.size} ${v.color}`.toLowerCase().includes(searchLower) ||
      v.productId?.brand?.toLowerCase().includes(searchLower) ||
      v.productId?.categoryName?.toLowerCase().includes(searchLower)
    );
  }
  
  return validVariants;
}

module.exports = {
  createVariant,
  listVariants,
  getVariant,
  updateVariant,
  adjustStock,
  deleteVariant,
  listAllVariants
};