const express = require("express");
const { body } = require("express-validator");
const { requireAuth, requireAdmin } = require("../../middlewares/auth.middleware");
const {
  handleList,
  handleGetDetail,
  handleCreate,
  handleUpdate,
  handleDelete
} = require("./product.controller");

const router = express.Router();

const productValidation = [
  body("name").notEmpty(),
  body("slug").notEmpty(),
  body("price").isNumeric(),
  body("categoryId").notEmpty(),
  body("brand").notEmpty(),
  body("images").isArray({ min: 1 }),
  body("targetAudience").optional().isArray()
];

router.get("/", handleList);
router.get("/:id", handleGetDetail);

router.post("/", requireAuth, requireAdmin, productValidation, handleCreate);
router.put("/:id", requireAuth, requireAdmin, handleUpdate);
router.delete("/:id", requireAuth, requireAdmin, handleDelete);

module.exports = router;