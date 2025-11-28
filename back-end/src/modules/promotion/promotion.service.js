const Promotion = require("./promotion.model");
const User = require("../user/user.model");

function buildFilters(query = {}) {
  const filters = {};
  if (query.isActive !== undefined) filters.isActive = query.isActive === "true";
  if (query.membershipLevel) filters.membershipLevel = query.membershipLevel;
  return filters;
}

async function createPromotion(data) {
  // Ensure isActive is a boolean
  if (data.isActive !== undefined) {
    data.isActive = data.isActive === true || data.isActive === "true" || data.isActive === 1;
  }
  return Promotion.create(data);
}

function listPromotions(query) {
  return Promotion.find(buildFilters(query)).sort({ createdAt: -1 });
}

function getPromotionByCode(code) {
  return Promotion.findOne({ code: code.toUpperCase() });
}

function updatePromotion(id, data) {
  // Ensure isActive is a boolean
  if (data.isActive !== undefined) {
    data.isActive = data.isActive === true || data.isActive === "true" || data.isActive === 1;
  }
  return Promotion.findByIdAndUpdate(id, data, { new: true });
}

function deletePromotion(id) {
  return Promotion.findByIdAndDelete(id);
}

async function validatePromotion({ code, userId, orderTotal, items = [] }) {
  const promotion = await getPromotionByCode(code);
  if (!promotion) return { success: false, message: "Code not found" };
  if (!promotion.isActive) return { success: false, message: "Promotion is not active" };
  if (promotion.startDate && promotion.startDate > new Date()) return { success: false, message: "Promotion is not started yet" };
  if (promotion.endDate && promotion.endDate < new Date()) return { success: false, message: "Promotion has expired" };
  if (promotion.maxUses > 0 && promotion.usedCount >= promotion.maxUses) return { success: false, message: "Promotion has reached the maximum usage limit" };
  if (orderTotal < promotion.minOrderValue) return { success: false, message: `Minimum order value is ${promotion.minOrderValue.toLocaleString("vi-VN")}đ` };

  // Check applicableProducts if specified
  if (promotion.applicableProducts && promotion.applicableProducts.length > 0) {
    const Product = require("../product/product.model");
    const Variant = require("../product-variant/variant.model");
    
    // Get product IDs from items
    const productIds = [];
    for (const item of items) {
      if (item.variantId) {
        const variant = await Variant.findById(item.variantId).select("productId");
        if (variant && variant.productId) {
          const productId = variant.productId.toString();
          if (!productIds.includes(productId)) {
            productIds.push(productId);
          }
        }
      } else if (item.productId) {
        const productId = item.productId.toString();
        if (!productIds.includes(productId)) {
          productIds.push(productId);
        }
      }
    }
    
    // Check if any product in order matches applicableProducts
    const applicableProductIds = promotion.applicableProducts.map(id => id.toString());
    const hasApplicableProduct = productIds.some(id => applicableProductIds.includes(id));
    
    if (!hasApplicableProduct) {
      return { success: false, message: "This promotion is not applicable to products in your cart" };
    }
  }

  if (promotion.membershipLevel && userId) {
    const user = await User.findById(userId);
    if (!user || user.membershipLevel !== promotion.membershipLevel) {
      return { success: false, message: "Promotion is only applicable for other membership levels" };
    }
  } else if (promotion.membershipLevel && !userId) {
    return { success: false, message: "Promotion requires a member account" };
  }

  let discountAmount = 0;
  let shippingDiscount = 0;
  
  if (promotion.discountType === "percentage") {
    discountAmount = orderTotal * (promotion.discountValue / 100);
    if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
      discountAmount = promotion.maxDiscount;
    }
  } else if (promotion.discountType === "fixed") {
    discountAmount = promotion.discountValue;
  } else if (promotion.discountType === "shipping") {
    // Shipping discount should be applied to shipping fee, not order total
    shippingDiscount = promotion.discountValue;
  }

  return {
    success: true,
    data: {
      promotionId: promotion._id,
      discountAmount,
      shippingDiscount,
      discountType: promotion.discountType,
      message: `Applied promotion ${promotion.code} successfully`
    }
  };
}

async function incrementPromotionUsage(promotionId) {
  if (!promotionId) return;
  await Promotion.findByIdAndUpdate(promotionId, { $inc: { usedCount: 1 } });
}

async function getPromotionUsageHistory(promotionId) {
  const Order = require("../order/order.model");
  const promotion = await Promotion.findById(promotionId);
  if (!promotion) {
    const err = new Error("Promotion not found");
    err.status = 404;
    throw err;
  }
  
  const orders = await Order.find({ 
    discountCode: promotion.code
  })
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(100);
  
  return orders.map(order => ({
    orderId: order._id,
    userId: order.userId?._id,
    userName: order.userId?.name || order.guestInfo?.name,
    userEmail: order.userId?.email || order.guestInfo?.email,
    orderTotal: order.totals?.total || 0,
    discountAmount: order.totals?.discount || 0,
    createdAt: order.createdAt
  }));
}

module.exports = {
  createPromotion,
  listPromotions,
  getPromotionByCode,
  updatePromotion,
  deletePromotion,
  validatePromotion,
  incrementPromotionUsage,
  getPromotionUsageHistory
};