const {
  getWishlistWithProducts,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  isInWishlist
} = require("./wishlist.service");

/**
 * GET /api/wishlist
 * Get user's wishlist
 */
async function handleGetWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const wishlist = await getWishlistWithProducts(userId);
    res.json({
      success: true,
      wishlist: wishlist.items,
      count: wishlist.items.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/wishlist
 * Add product to wishlist
 */
async function handleAddToWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    await addToWishlist(userId, productId);
    res.status(201).json({
      success: true,
      message: "Product added to wishlist"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/wishlist/:productId
 * Remove product from wishlist
 */
async function handleRemoveFromWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    await removeFromWishlist(userId, productId);
    res.json({
      success: true,
      message: "Product removed from wishlist"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/wishlist
 * Clear entire wishlist
 */
async function handleClearWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    await clearWishlist(userId);
    res.json({
      success: true,
      message: "Wishlist cleared"
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/wishlist/check/:productId
 * Check if product is in wishlist
 */
async function handleCheckWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const inWishlist = await isInWishlist(userId, productId);
    res.json({
      success: true,
      inWishlist
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGetWishlist,
  handleAddToWishlist,
  handleRemoveFromWishlist,
  handleClearWishlist,
  handleCheckWishlist
};

