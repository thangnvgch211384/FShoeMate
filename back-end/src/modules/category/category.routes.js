const router = require("express").Router();
const { requireAuth, requireAdmin } = require("../../middlewares/auth.middleware");
const { body } = require("express-validator");
const ctrl = require("./category.controller");

const baseValidation = [
  body("id").notEmpty(),
  body("name").notEmpty()
];

router.get("/", ctrl.handleList);
router.get("/:id", ctrl.handleDetail);
router.post("/", requireAuth, requireAdmin, baseValidation, ctrl.handleCreate);
router.put("/:id", requireAuth, requireAdmin, ctrl.handleUpdate);
router.delete("/:id", requireAuth, requireAdmin, ctrl.handleDelete);

module.exports = router;