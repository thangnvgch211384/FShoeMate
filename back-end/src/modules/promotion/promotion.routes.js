const router = require("express").Router();
const { body } = require("express-validator");
const { requireAuth, requireAdmin, optionalAuth } = require("../../middlewares/auth.middleware");
const ctrl = require("./promotion.controller");

const baseValidation = [
  body("code").notEmpty().withMessage("Code is required"),
  body("discountType").isIn(["percentage", "fixed", "shipping"]).withMessage("Invalid discount type"),
  body("discountValue").isNumeric().withMessage("Discount value must be a number").isFloat({ min: 0 }).withMessage("Discount value must be >= 0"),
  body("maxDiscount").optional().isNumeric().withMessage("Max discount must be a number").isFloat({ min: 0 }).withMessage("Max discount must be >= 0"),
  body("minOrderValue").optional().isNumeric().withMessage("Min order value must be a number").isFloat({ min: 0 }).withMessage("Min order value must be >= 0"),
  body("maxUses").optional().isInt({ min: 0 }).withMessage("Max uses must be a non-negative integer"),
  body("startDate").optional().isISO8601().withMessage("Start date must be a valid date"),
  body("endDate").optional().isISO8601().withMessage("End date must be a valid date"),
  body("isActive").optional().toBoolean().isBoolean().withMessage("isActive must be a boolean")
];

router.get("/", requireAuth, requireAdmin, ctrl.handleList);
router.post("/", requireAuth, requireAdmin, baseValidation, ctrl.handleCreate);
router.get("/:id/usage", requireAuth, requireAdmin, ctrl.handleGetUsageHistory);
router.put("/:id", requireAuth, requireAdmin, baseValidation, ctrl.handleUpdate);
router.delete("/:id", requireAuth, requireAdmin, ctrl.handleDelete);

router.post("/validate", optionalAuth, ctrl.handleValidate);


module.exports = router;