const router = require("express").Router();
const { body } = require("express-validator");
const { requireAuth, requireAdmin } = require("../../middlewares/auth.middleware");
const ctrl = require("./loyalty.controller");

router.get("/me", requireAuth, ctrl.handleGetSummary);

router.post(
  "/:userId/deduct",
  requireAuth,
  requireAdmin,
  body("points").isInt({ min: 1 }),
  ctrl.handleDeductPoints
);

module.exports = router;