const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const {
  handleGetWishlist,
  handleAddToWishlist,
  handleRemoveFromWishlist,
  handleClearWishlist,
  handleCheckWishlist
} = require("./wishlist.controller");

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/wishlist - Get user's wishlist
router.get("/", handleGetWishlist);

// POST /api/wishlist - Add product to wishlist
router.post("/", handleAddToWishlist);

// DELETE /api/wishlist/:productId - Remove product from wishlist
router.delete("/:productId", handleRemoveFromWishlist);

// DELETE /api/wishlist - Clear entire wishlist
router.delete("/", handleClearWishlist);

// GET /api/wishlist/check/:productId - Check if product is in wishlist
router.get("/check/:productId", handleCheckWishlist);

module.exports = router;

