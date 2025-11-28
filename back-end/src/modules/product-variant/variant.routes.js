const router = require("express").Router({ mergeParams: true });
const { body } = require("express-validator");
const { requireAuth, requireAdmin } = require("../../middlewares/auth.middleware");
const ctrl = require("./variant.controller");

const baseValidation = [
  body("size").notEmpty().withMessage("Size is required"),
  body("color").notEmpty().withMessage("Color is required"),
  body("price").isNumeric().withMessage("Price must be a number").isFloat({ min: 0 }).withMessage("Price must be >= 0"),
  body("discountPrice").optional().isNumeric().withMessage("Discount price must be a number").isFloat({ min: 0 }).withMessage("Discount price must be >= 0"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("images").optional().isArray().withMessage("Images must be an array"),
  body("images.*").optional().isURL().withMessage("Each image must be a valid URL")
];

const stockValidation = [
  body("type").isIn(["import", "export"]),
  body("quantity").isInt({ min: 1 }),
  body("reason").optional().isString(),
  body("supplier").optional().isString()
];

router.get("/products/:productId/variants", ctrl.handleList);
router.get("/variants/all", requireAuth, requireAdmin, ctrl.handleListAll);
router.get("/variants/:variantId", requireAuth, requireAdmin, ctrl.handleGet);
router.post("/products/:productId/variants", requireAuth, requireAdmin, baseValidation, ctrl.handleCreate);
router.put("/variants/:variantId", requireAuth, requireAdmin, baseValidation, ctrl.handleUpdate);
router.patch("/variants/:variantId/stock", requireAuth, requireAdmin, stockValidation, ctrl.handleAdjustStock);
router.delete("/variants/:variantId", requireAuth, requireAdmin, ctrl.handleDelete);

module.exports = router;