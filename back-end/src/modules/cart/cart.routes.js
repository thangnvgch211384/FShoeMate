const router = require("express").Router();
const { body } = require("express-validator");
const { requireAuth } = require("../../middlewares/auth.middleware");
const ctrl = require("./cart.controller");

const addValidation = [
  body("variantId").isMongoId(),
  body("quantity").isInt({ min: 1 })
];

const updateValidation = [
  body("quantity").isInt({ min: 0 })
];

router.get("/", requireAuth, ctrl.handleGetCart);
router.post("/items", requireAuth, addValidation, ctrl.handleAddItem);
router.put("/items/:itemId", requireAuth, updateValidation, ctrl.handleUpdateItem);
router.delete("/items/:itemId", requireAuth, ctrl.handleRemoveItem);
router.delete("/", requireAuth, ctrl.handleClearCart);

module.exports = router;