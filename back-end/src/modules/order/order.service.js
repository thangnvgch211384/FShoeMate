const mongoose = require("mongoose");
const Order = require("./order.model");
const Cart = require("../cart/cart.model");
const Variant = require("../product-variant/variant.model");
const Loyalty = require("../loyalty/loyalty.service");
const User = require("../user/user.model");
const Product = require("../product/product.model");
const { createPaymentLink, cancelPaymentLink } = require("../../utils/payos.service");
const { sendOrderConfirmationEmail } = require("../../utils/email.service");
const { sendOrderCancellationEmail } = require("../../utils/email.service");
const { sendOrderReceivedEmail } = require("../../utils/email.service");

async function buildItemsFromCart(cart) {
  const populated = await Cart.findById(cart._id).populate({
    path: "items.variantId",
    populate: { path: "productId" }
  });

  return populated.items.map((item) => {
    const variant = item.variantId;
    const product = variant.productId;

    return {
      variantId: variant._id,
      quantity: item.quantity,
      productSnapshot: {
        name: product?.name || "Product",
        brand: product?.brand,
        size: variant.size,
        color: variant.color,
        image: variant.images?.[0] || (product?.colors && product.colors.length > 0 && product.colors[0].images && product.colors[0].images.length > 0 ? product.colors[0].images[0] : null),
        price: variant.price
      }
    };
  });
}

function calcTotals(items, { discount = 0, shippingFee = 0 } = {}) {
  const subtotal = items.reduce((sum, item) => sum + item.productSnapshot.price * item.quantity, 0);
  const total = subtotal - discount + shippingFee;
  return { subtotal, discount, shippingFee, total };
}

async function createOrderFromCart(userId, payload = {}) {
  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    const err = new Error("Cart is empty");
    err.status = 400;
    throw err;
  }

  const items = await buildItemsFromCart(cart);
  const totals = calcTotals(items, payload.totals);

  const order = await Order.create({
    userId,
    guestInfo: payload.guestInfo,
    items,
    totals,
    paymentMethod: payload.paymentMethod || "cod",
    discountCode: payload.discountCode,
    membershipDiscount: payload.membershipDiscount,
    shippingMethod: payload.shippingMethod || "standard",
    metadata: payload.metadata
  });

  // Increment promotion usage count if discount code was used
  if (payload.discountCode) {
    try {
      const Promotion = require("../promotion/promotion.service");
      const promotion = await Promotion.getPromotionByCode(payload.discountCode);
      if (promotion) {
        await Promotion.incrementPromotionUsage(promotion._id);
      }
    } catch (error) {
      console.error("Failed to increment promotion usage:", error);
      // Don't throw - order should still be created
    }
  }

  await Promise.all(
    items.map(async (item) => {
      await Variant.findByIdAndUpdate(item.variantId, { $inc: { stock: -item.quantity } });
    })
  );

  cart.items = [];
  await cart.save();

  if (payload.paymentMethod === "payos") {
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
      let customerName = "";
      let customerEmail = "";
      
      if (userId) {
        const user = await User.findById(userId);
        customerName = user?.name || "";
        customerEmail = user?.email || "";
      } else if (payload.guestInfo) {
        customerName = payload.guestInfo.name || "";
        customerEmail = payload.guestInfo.email || "";
      }

      const paymentLinkData = await createPaymentLink({
        orderId: order._id,
        amount: totals.total,
        description: `Order #${order._id.toString().slice(-6)}`,
        items: items.map(item => ({
          name: item.productSnapshot.name,
          quantity: item.quantity,
          price: item.productSnapshot.price
        })),
        customerInfo: {
          name: customerName,
          email: customerEmail,
          phone: payload.guestInfo?.phone || "",
          address: payload.guestInfo?.address || ""
        },
        returnUrl: `${frontendUrl}/orders/${order._id}?payment=success`,
        cancelUrl: `${frontendUrl}/checkout?payment=cancelled`
      });

      order.metadata = {
        ...(order.metadata || {}),
        payosPaymentLink: paymentLinkData.checkoutUrl,
        payosOrderCode: paymentLinkData.orderCode
      };
      await order.save();
    } catch (error) {
      console.error("Failed to create PayOS payment link:", error);
      // Nếu lỗi PayOS, throw lại để frontend có thể hiển thị thông báo
      if (error.code === '214' || error.message?.includes('PayOS')) {
        throw error;
      }
      // Các lỗi khác chỉ log, không throw để order vẫn được tạo
    }
  }

  // Chỉ award points khi order đã được thanh toán (COD) hoặc sau khi thanh toán thành công
  // Đối với PayOS, points sẽ được award sau khi webhook confirm payment
  if (userId && payload.paymentMethod === "cod") {
    try {
      await Loyalty.earnPoints({
        userId,
        orderId: order._id,
        revenue: totals.subtotal - (totals.discount || 0),
        reason: "Order completion"
      });
    } catch (error) {
      console.error("Failed to award loyalty points:", error.message);
    }
  }

  // Send order confirmation email
  // Only send "Order Confirmed" for COD or if PayOS is already paid
  // For PayOS pending, send "Order Received - Payment Pending" email
  try {
    let email = "";
    let name = "";
    if (userId) {
      const user = await User.findById(userId);
      email = user?.email || "";
      name = user?.name || "";
    } else if (payload.guestInfo) {
      email = payload.guestInfo.email || "";
      name = payload.guestInfo.name || "";
    }
    if (email) {
      // For COD or PayOS already paid, send confirmation email
      if (payload.paymentMethod === "cod" || (payload.paymentMethod === "payos" && order.paymentStatus === "paid")) {
        await sendOrderConfirmationEmail(order, email, name);
      } 
      // For PayOS pending, send order received email (not confirmed yet)
      else if (payload.paymentMethod === "payos" && order.paymentStatus === "pending") {
        await sendOrderReceivedEmail(order, email, name);
      }
    }
  } catch (error) {
    console.error("Failed to send order email:", error);
    // Don't throw - order should still be created
  }

  return order;
}

async function createOrderAsGuest(payload) {
  if (!payload.items || payload.items.length === 0) {
    const err = new Error("No items provided");
    err.status = 400;
    throw err;
  }

  const items = await Promise.all(
    payload.items.map(async (input) => {
      const variant = await Variant.findById(input.variantId).populate("productId");
      if (!variant) {
        const err = new Error("Variant not found");
        err.status = 404;
        throw err;
      }
      if (variant.stock < input.quantity) {
        const err = new Error("Variant out of stock");
        err.status = 400;
        throw err;
      }

      return {
        variantId: variant._id,
        quantity: input.quantity,
        productSnapshot: {
          name: variant.productId?.name || "Product",
          brand: variant.productId?.brand,
          size: variant.size,
          color: variant.color,
          image: variant.images?.[0] || (variant.productId?.colors && variant.productId.colors.length > 0 && variant.productId.colors[0].images && variant.productId.colors[0].images.length > 0 ? variant.productId.colors[0].images[0] : null),
          price: variant.price
        }
      };
    })
  );

  const totals = calcTotals(items, payload.totals);

  const order = await Order.create({
    guestInfo: payload.guestInfo,
    items,
    totals,
    paymentMethod: payload.paymentMethod || "cod",
    discountCode: payload.discountCode,
    shippingMethod: payload.shippingMethod || "standard",
    metadata: payload.metadata
  });

  // Increment promotion usage count if discount code was used
  if (payload.discountCode) {
    try {
      const Promotion = require("../promotion/promotion.service");
      const promotion = await Promotion.getPromotionByCode(payload.discountCode);
      if (promotion) {
        await Promotion.incrementPromotionUsage(promotion._id);
      }
    } catch (error) {
      console.error("Failed to increment promotion usage:", error);
      // Don't throw - order should still be created
    }
  }

  await Promise.all(
    items.map(async (item) => {
      await Variant.findByIdAndUpdate(item.variantId, { $inc: { stock: -item.quantity } });
    })
  );

  if (payload.paymentMethod === "payos") {
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
      let customerName = "";
      let customerEmail = "";
      
      if (payload.guestInfo) {
        customerName = payload.guestInfo.name || "";
        customerEmail = payload.guestInfo.email || "";
      }

      const paymentLinkData = await createPaymentLink({
        orderId: order._id,
        amount: totals.total,
        description: `Order #${order._id.toString().slice(-6)}`,
        items: items.map(item => ({
          name: item.productSnapshot.name,
          quantity: item.quantity,
          price: item.productSnapshot.price
        })),
        customerInfo: {
          name: customerName,
          email: customerEmail,
          phone: payload.guestInfo?.phone || "",
          address: payload.guestInfo?.address || ""
        },
        returnUrl: `${frontendUrl}/orders/${order._id}?payment=success`,
        cancelUrl: `${frontendUrl}/checkout?payment=cancelled`
      });

      order.metadata = {
        ...(order.metadata || {}),
        payosPaymentLink: paymentLinkData.checkoutUrl,
        payosOrderCode: paymentLinkData.orderCode
      };
      await order.save();
    } catch (error) {
      console.error("Failed to create PayOS payment link:", error);
      // Nếu lỗi PayOS, throw lại để frontend có thể hiển thị thông báo
      if (error.code === '214' || error.message?.includes('PayOS')) {
        throw error;
      }
      // Các lỗi khác chỉ log, không throw để order vẫn được tạo
    }
  }

  // Send order email
  try {
    let email = "";
    let name = "";
    if (payload.guestInfo) {
      email = payload.guestInfo.email || "";
      name = payload.guestInfo.name || "";
    }
    if (email) {
      // For COD or PayOS already paid, send confirmation email
      if (payload.paymentMethod === "cod" || (payload.paymentMethod === "payos" && order.paymentStatus === "paid")) {
        await sendOrderConfirmationEmail(order, email, name);
      } 
      // For PayOS pending, send order received email (not confirmed yet)
      else if (payload.paymentMethod === "payos" && order.paymentStatus === "pending") {
        await sendOrderReceivedEmail(order, email, name);
      }
    }
  } catch (error) {
    console.error("Failed to send order email:", error);
    // Don't throw - order should still be created
  }

  return order;
}

function listOrdersByUser(userId) {
  return Order.find({ userId }).sort({ createdAt: -1 });
}

function getOrderById(orderId, userId) {
  const query = { _id: orderId };
  if (userId) query.userId = userId;
  return Order.findOne(query);
}

async function findGuestOrderByEmailAndOrderId(email, orderId) {
  // Remove # if present and trim whitespace
  let cleanOrderId = orderId.trim().replace(/^#/, '');
  
  // Check if it's a valid MongoDB ObjectId (24 hex characters)
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(cleanOrderId);
  
  let query = {
    userId: null, // Only guest orders
    "guestInfo.email": email
  };
  
  if (isValidObjectId) {
    // If it's a valid ObjectId, search by _id directly
    query._id = cleanOrderId;
  } else {
    // If it's an order number (6 characters), find by last 6 characters of _id
    // Convert to uppercase for case-insensitive search
    const orderNumber = cleanOrderId.toUpperCase();
    if (orderNumber.length === 6) {
      // Find orders where the last 6 characters of _id match
      const allGuestOrders = await Order.find({
        userId: null,
        "guestInfo.email": email
      });
      
      // Filter orders where last 6 chars of _id match
      const matchingOrder = allGuestOrders.find(order => {
        const orderIdStr = order._id.toString();
        const last6Chars = orderIdStr.slice(-6).toUpperCase();
        return last6Chars === orderNumber;
      });
      
      return matchingOrder || null;
    } else {
      // Invalid format
      return null;
    }
  }
  
  const order = await Order.findOne(query);
  return order;
}

function listAllOrders(query = {}) {
  return Order.find(query).populate("userId", "name email").sort({ createdAt: -1 });
}

function updateOrderStatus(orderId, status) {
  return Order.findByIdAndUpdate(orderId, { status }, { new: true });
}

function updatePaymentStatus(orderId, paymentStatus) {
  return Order.findByIdAndUpdate(orderId, { paymentStatus }, { new: true });
}


async function handlePayOSWebhook(webhookData) {
  const { code, desc, data } = webhookData;

  const orderCode = data?.orderCode;
  
  if (!orderCode) {
    return { isTest: true, message: "Webhook test successful" };
  }

  const order = await Order.findOne({
    "metadata.payosOrderCode": orderCode
  });

  if (!order) {
    return { isTest: true, message: "Webhook test successful" };
  }

  if (code === "00" && desc === "success") {
    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      order.status = "processing";
      
      if (order.userId) {
        try {
          await Loyalty.earnPoints({
            userId: order.userId,
            orderId: order._id,
            revenue: order.totals.subtotal - (order.totals.discount || 0),
            reason: "Order payment completed"
          });
        } catch (error) {
          console.error("Failed to award loyalty points:", error.message);
        }
      }
      
      // Send confirmation email now that payment is confirmed
      try {
        let email = "";
        let name = "";
        if (order.userId) {
          const user = await User.findById(order.userId);
          email = user?.email || "";
          name = user?.name || "";
        } else if (order.guestInfo) {
          email = order.guestInfo.email || "";
          name = order.guestInfo.name || "";
        }
        if (email) {
          await sendOrderConfirmationEmail(order, email, name);
        }
      } catch (error) {
        console.error("Failed to send confirmation email after payment:", error);
      }
    }
  } else {
    order.paymentStatus = "failed";
  }

  await order.save();
  return order;
}

async function cancelOrder(orderId, userId) {
  // Support both authenticated user orders and guest orders
  const query = { _id: orderId };
  if (userId) {
    query.userId = userId;
  } else {
    // For guest orders, ensure it doesn't have userId
    query.userId = null;
  }
  
  const order = await Order.findOne(query);
  if (!order) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }

  if (order.status !== "pending" && order.status !== "processing") {
    const err = new Error("Order cannot be cancelled. Only pending or processing orders can be cancelled.");
    err.status = 400;
    throw err;
  }

  await Promise.all(
    order.items.map(async (item) => {
      await Variant.findByIdAndUpdate(item.variantId, { $inc: { stock: item.quantity } });
    })
  );

  // Cancel PayOS payment link if exists
  if (order.paymentMethod === "payos" && order.metadata?.payosOrderCode) {
    try {
      await cancelPaymentLink(order.metadata.payosOrderCode);
    } catch (error) {
      console.error("Failed to cancel PayOS payment link:", error);
    }
  }

  order.status = "cancelled";
  
  // If order uses PayOS, mark payment as failed (whether paid or pending)
  if (order.paymentMethod === "payos") {
    order.paymentStatus = "failed";
  }
  
  await order.save();
  
  // Reload order to ensure we have the latest data
  const updatedOrder = await Order.findById(orderId);

  // Send cancellation email
  try {
    let email = "";
    let name = "";
    
    // Get email and name from order or user
    if (updatedOrder.userId) {
      const user = await User.findById(updatedOrder.userId);
      if (user) {
        email = user.email || "";
        name = user.name || "";
      }
    }
    
    // If no email from user, try guestInfo
    if (!email && updatedOrder.guestInfo) {
      email = updatedOrder.guestInfo.email || "";
      name = updatedOrder.guestInfo.name || "";
    }
    
    if (email && email.trim() !== "") {
      await sendOrderCancellationEmail(updatedOrder, email, name);
    }
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
    // Don't throw - order should still be cancelled
  }

  return updatedOrder;
}

async function getAnalytics() {
  // Total Revenue: Tính từ tất cả orders đã thanh toán (paid), không cần delivered
  // Điều này phản ánh doanh thu thực tế từ các đơn hàng đã được thanh toán
  const paidOrders = await Order.find({ 
    status: { $ne: "cancelled" },
    paymentStatus: "paid"
  });
  const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);

  const totalOrders = await Order.countDocuments({ status: { $ne: "cancelled" } });

  const totalCustomers = await User.countDocuments({ role: "customer" });

  // Avg Order Value: Tính từ tất cả orders (không chỉ paid orders)
  const allOrdersForAvg = await Order.find({ status: { $ne: "cancelled" } });
  const totalOrderValue = allOrdersForAvg.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;

  const recentOrders = await Order.find({ status: { $ne: "cancelled" } })
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const allOrders = await Order.find({ status: { $ne: "cancelled" } }).lean();
  
  const variantIds = [];
  allOrders.forEach(order => {
    order.items.forEach(item => {
      if (item.variantId && !variantIds.includes(item.variantId.toString())) {
        variantIds.push(item.variantId.toString());
      }
    });
  });

  const variants = await Variant.find({ 
    _id: { $in: variantIds.map(id => new mongoose.Types.ObjectId(id)) }
  })
    .populate("productId")
    .lean();

  const variantToProductMap = {};
  variants.forEach(variant => {
    if (variant.productId) {
      variantToProductMap[variant._id.toString()] = variant.productId._id.toString();
    }
  });

  const productIds = [...new Set(Object.values(variantToProductMap))];
  
  const existingProducts = await Product.find({ 
    _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) }
  }).lean();
  
  const existingProductMap = {};
  existingProducts.forEach(product => {
    existingProductMap[product._id.toString()] = {
      name: product.name,
      image: (product?.colors && product.colors.length > 0 
        && product.colors[0].images && product.colors[0].images.length > 0 
        ? product.colors[0].images[0] : null)
    };
  });

  const productSales = {};
  
  allOrders.forEach(order => {
    order.items.forEach(item => {
      const variantId = item.variantId?.toString();
      const productId = variantToProductMap[variantId];
      
      if (productId && existingProductMap[productId]) {
        const quantity = item.quantity || 0;
        const revenue = (item.productSnapshot?.price || 0) * quantity;
        
        if (!productSales[productId]) {
          productSales[productId] = {
            name: existingProductMap[productId].name,
            image: existingProductMap[productId].image,
            sold: 0,
            revenue: 0
          };
        }
        productSales[productId].sold += quantity;
        productSales[productId].revenue += revenue;
      }
    });
  });

  const mostSellingProducts = Object.values(productSales)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      image: p.image,
      sold: p.sold,
      revenue: p.revenue
    }));

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weeklyOrders = await Order.find({
    status: { $ne: "cancelled" },
    createdAt: { $gte: oneWeekAgo },
    userId: { $ne: null }
  })
    .populate("userId", "name email")
    .lean();

  const customerSpending = {};
  
  weeklyOrders.forEach(order => {
    if (order.userId) {
      const userId = order.userId._id.toString();
      const customerName = order.userId.name || "Unknown";
      const customerEmail = order.userId.email || "";
      const orderTotal = order.totals?.total || 0;
      
      if (!customerSpending[userId]) {
        customerSpending[userId] = {
          id: userId,
          name: customerName,
          email: customerEmail,
          totalSpent: 0,
          orderCount: 0
        };
      }
      customerSpending[userId].totalSpent += orderTotal;
      customerSpending[userId].orderCount += 1;
    }
  });

  const weeklyTopCustomers = Object.values(customerSpending)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      totalSpent: c.totalSpent,
      orderCount: c.orderCount
    }));

  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    avgOrderValue,
    recentOrders: recentOrders.map(order => ({
      id: order._id.toString(),
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      customer: order.userId?.name || order.guestInfo?.name || "Guest",
      customerEmail: order.userId?.email || order.guestInfo?.email || "",
      total: order.totals?.total || 0,
      status: order.status,
      paymentStatus: order.paymentStatus || "pending",
      paymentMethod: order.paymentMethod || "cod",
      createdAt: order.createdAt
    })),
    mostSellingProducts,
    weeklyTopCustomers
  };
}

module.exports = {
  createOrderFromCart,
  createOrderAsGuest,
  listOrdersByUser,
  getOrderById,
  findGuestOrderByEmailAndOrderId,
  listAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  getAnalytics,
  handlePayOSWebhook
};