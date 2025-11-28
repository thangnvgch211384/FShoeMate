const router = require("express").Router({ mergeParams: true });
const { body } = require("express-validator");
const { requireAuth, requireAdmin } = require("../../middlewares/auth.middleware");
const ctrl = require("./review.controller");

router.get("/products/:productId/reviews", ctrl.handleList);

// Authenticated users create review (tuỳ chính sách có yêu cầu mua hàng hay không)
router.post(
  "/products/:productId/reviews",
  requireAuth,
  [
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").optional().isString().isLength({ max: 1000 })
  ],
  ctrl.handleCreate
);

// Admin review management
router.get("/reviews/admin/all", requireAuth, requireAdmin, ctrl.handleAdminList);
router.delete("/reviews/:id", requireAuth, requireAdmin, ctrl.handleDelete);

module.exports = router;