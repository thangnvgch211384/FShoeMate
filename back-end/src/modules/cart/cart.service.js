const Cart = require("./cart.model");
const Variant = require("../product-variant/variant.model");

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  return cart;
}

function buildCartQuery(userId) {
  return Cart.findOne({ userId }).populate({
    path: "items.variantId",
    select: "productId size color price discountPrice stock images",
    populate: {
      path: "productId",
      select: "name brand images"
    }
  });
}

async function addItem(userId, { variantId, quantity }) {
  const variant = await Variant.findById(variantId);
  if (!variant) throw Object.assign(new Error("Variant not found"), { status: 404 });

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(item => item.variantId.equals(variantId));
  if (existingItem) {
    existingItem.quantity = Math.min(existingItem.quantity + quantity, variant.stock);
  } else {
    cart.items.push({ variantId, quantity: Math.min(quantity, variant.stock) });
  }

  await cart.save();
  return getCartWithDetails(userId);
}

async function updateItem(userId, itemId, quantity) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId) || cart.items.find(i => i._id.equals(itemId));
  if (!item) throw Object.assign(new Error("Item not found"), { status: 404 });

  if (quantity <= 0) {
    cart.items = cart.items.filter(i => !i._id.equals(itemId));
  } else {
    const variant = await Variant.findById(item.variantId);
    if (!variant) throw Object.assign(new Error("Variant not found"), { status: 404 });
    item.quantity = Math.min(quantity, variant.stock);
  }

  await cart.save();
  return getCartWithDetails(userId);
}

async function removeItem(userId, itemId) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter(i => !i._id.equals(itemId));
  await cart.save();
  return getCartWithDetails(userId);
}

async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  await cart.save();
  return getCartWithDetails(userId);
}

async function getCartWithDetails(userId) {
  const cart = await buildCartQuery(userId);
  if (!cart) {
    return { userId, items: [] };
  }
  
  // Filter out items that are out of stock or have invalid variants
  const validItems = cart.items.filter(item => {
    const variant = item.variantId;
    // Remove item if variant doesn't exist or is out of stock
    if (!variant || !variant._id) {
      return false;
    }
    // Remove item if stock is 0 or less
    if (variant.stock <= 0) {
      return false;
    }
    return true;
  });
  
  // If any items were removed, update the cart
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }
  
  return cart;
}

module.exports = {
  getOrCreateCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  getCartWithDetails
};