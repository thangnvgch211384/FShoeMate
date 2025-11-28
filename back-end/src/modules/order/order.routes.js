const router = require("express").Router();
const { body } = require("express-validator");
const { requireAuth, requireAdmin } = require("../../middlewares/auth.middleware");
const ctrl = require("./order.controller");

const shippingValidation = [
  body("shippingMethod").optional().isIn(["standard", "express", "free"]),
  body("paymentMethod").optional().isIn(["cod", "payos"])
];

const guestOrderValidation = [
  body("guestInfo.name").notEmpty(),
  body("guestInfo.email").isEmail(),
  body("guestInfo.address").notEmpty(),
  body("items").isArray({ min: 1 }),
  body("items.*.variantId").isMongoId(),
  body("items.*.quantity").isInt({ min: 1 })
];

router.post("/", requireAuth, shippingValidation, ctrl.handleCreateFromCart);
router.post("/guest", guestOrderValidation, ctrl.handleCreateGuest);

router.get("/", requireAuth, ctrl.handleListMine);

router.get("/guest/find", ctrl.handleFindGuestOrder);
router.get("/guest/:id", ctrl.handleGetGuestOrder);
router.put("/guest/:id/cancel", ctrl.handleCancelGuestOrder);
router.get("/:id", requireAuth, ctrl.handleGetOne);
router.put("/:id/cancel", requireAuth, ctrl.handleCancelOrder);

router.get("/admin/all", requireAuth, requireAdmin, ctrl.handleAdminList);
router.get("/admin/analytics", requireAuth, requireAdmin, ctrl.handleGetAnalytics);
router.get("/admin/:id", requireAuth, requireAdmin, ctrl.handleAdminGetOne);
router.put("/:id/status", requireAuth, requireAdmin, ctrl.handleUpdateStatus);
router.put("/:id/payment-status", requireAuth, requireAdmin, ctrl.handleUpdatePaymentStatus);

router.post("/payos/webhook", ctrl.handlePayOSWebhook);

router.get("/payos/webhook/test", (_req, res) => {
  res.json({
    code: "00",
    desc: "success",
    message: "Webhook endpoint is accessible"
  });
});

module.exports = router;