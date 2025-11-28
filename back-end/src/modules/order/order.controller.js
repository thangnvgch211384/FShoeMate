const { validationResult } = require("express-validator");
const service = require("./order.service");

async function handleCreateFromCart(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const order = await service.createOrderFromCart(req.user.id, req.body);
    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleCreateGuest(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const order = await service.createOrderAsGuest(req.body);
    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleListMine(req, res, next) {
  try {
    const orders = await service.listOrdersByUser(req.user.id);
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
}

async function handleGetOne(req, res, next) {
  try {
    const order = await service.getOrderById(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleGetGuestOrder(req, res, next) {
  try {
    // Guest orders don't have userId, so pass null
    const order = await service.getOrderById(req.params.id, null);
    if (!order) return res.status(404).json({ message: "Order not found" });
    // Only return guest orders (orders without userId)
    if (order.userId) {
      return res.status(403).json({ message: "This order requires authentication" });
    }
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleFindGuestOrder(req, res, next) {
  try {
    const { email, orderId } = req.query;
    
    if (!email || !orderId) {
      return res.status(400).json({ 
        success: false,
        message: "Email and Order ID are required" 
      });
    }

    const order = await service.findGuestOrderByEmailAndOrderId(email, orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Order not found. Please check your email and order ID." 
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleAdminList(req, res, next) {
  try {
    const orders = await service.listAllOrders();
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
}

async function handleAdminGetOne(req, res, next) {
  try {
    const order = await service.getOrderById(req.params.id, null); 
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateStatus(req, res, next) {
  try {
    const order = await service.updateOrderStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleUpdatePaymentStatus(req, res, next) {
  try {
    const order = await service.updatePaymentStatus(req.params.id, req.body.paymentStatus);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

async function handleCancelOrder(req, res, next) {
  try {
    const userId = req.user?.id || null; // Support guest orders (userId can be null)
    const orderId = req.params.id;
    const order = await service.cancelOrder(orderId, userId);
    res.json({
      success: true,
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    next(error);
  }
}

async function handleCancelGuestOrder(req, res, next) {
  try {
    const orderId = req.params.id;
    // For guest orders, userId is null
    const order = await service.cancelOrder(orderId, null);
    res.json({
      success: true,
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    next(error);
  }
}

async function handleGetAnalytics(req, res, next) {
  try {
    const analytics = await service.getAnalytics();
    res.json({ success: true, ...analytics });
  } catch (error) {
    next(error);
  }
}

async function handlePayOSWebhook(req, res, next) {
  try {
    const webhookData = req.body;
    const result = await service.handlePayOSWebhook(webhookData);
    
    res.json({
      code: "00",
      desc: "success"
    });
  } catch (error) {
    console.error("PayOS webhook error:", error);
    res.json({
      code: "01",
      desc: error.message || "Webhook processing failed"
    });
  }
}

module.exports = {
  handleCreateFromCart,
  handleCreateGuest,
  handleListMine,
  handleGetOne,
  handleGetGuestOrder,
  handleFindGuestOrder,
  handleAdminList,
  handleAdminGetOne,
  handleUpdateStatus,
  handleUpdatePaymentStatus,
  handleCancelOrder,
  handleCancelGuestOrder,
  handleGetAnalytics,
  handlePayOSWebhook
};