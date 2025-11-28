const express = require("express");
const { body } = require("express-validator");
const { requireAuth, requireAdmin } = require("../../middlewares/auth.middleware");
const { 
  handleGetMe, 
  handleUpdateMe, 
  handleUpdateMembership,
  handleListCustomers,
  handleGetCustomer,
  handleUpdateCustomerStatus,
  handleUpdateCustomer,
  handleGetCustomerOrders
} = require("./user.controller");

const router = express.Router();

const updateValidation = [
  body("name").optional().isLength({ min: 2 }),
  body("phone").optional().isString(),
  body("address.street").optional().isString(),
  body("address.city").optional().isString(),
  body("address.country").optional().isString(),
  body("address.postalCode").optional().isString()
];

router.get("/me", requireAuth, handleGetMe);
router.put("/me", requireAuth, updateValidation, handleUpdateMe);

// Admin-only
router.get("/customers", requireAuth, requireAdmin, handleListCustomers);
router.get("/customers/:id", requireAuth, requireAdmin, handleGetCustomer);
router.get("/customers/:id/orders", requireAuth, requireAdmin, handleGetCustomerOrders);
router.put("/customers/:id", requireAuth, requireAdmin, updateValidation, handleUpdateCustomer);
router.put("/customers/:id/status", requireAuth, requireAdmin, body("isActive").isBoolean(), handleUpdateCustomerStatus);
router.put("/:id/membership", requireAuth, requireAdmin, handleUpdateMembership);

module.exports = router;