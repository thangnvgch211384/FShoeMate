const Wishlist = require("./wishlist.model");
const Product = require("../product/product.model");
const ProductVariant = require("../product-variant/variant.model");

/**
 * Get or create wishlist for user
 */
async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ userId, items: [] });
  }
  return wishlist;
}

/**
 * Get wishlist with populated product details
 */
async function getWishlistWithProducts(userId) {
  const wishlist = await getOrCreateWishlist(userId);
  
  const populated = await Wishlist.findById(wishlist._id)
    .populate({
      path: "items.productId",
      select: "name slug brand colors price originalPrice averageRating reviewCount status categoryName"
    })
    .lean();

  if (!populated) {
    return { items: [] };
  }

  // Transform to include stock status and format data
  const items = await Promise.all(
    populated.items.map(async (item, index) => {
      const product = item.productId;
      if (!product) return null;

      // Check if product has any variant in stock
      const variants = await ProductVariant.find({ productId: product._id });
      const inStock = variants.some(v => v.stock > 0);

      // Get added date from item's createdAt if available, otherwise use wishlist updatedAt
      const addedDate = item.createdAt || wishlist.updatedAt || wishlist.createdAt;

      return {
        id: product._id.toString(),
        productId: product._id.toString(),
        name: product.name,
        brand: product.brand,
        price: product.price || 0,
        // Nếu originalPrice không tồn tại hoặc là null/undefined, trả về null
        originalPrice: (product.originalPrice !== undefined && product.originalPrice !== null) ? product.originalPrice : null,
        image: (product?.colors && product.colors.length > 0 && product.colors[0].images && product.colors[0].images.length > 0 ? product.colors[0].images[0] : ""),
        images: (product?.colors && product.colors.length > 0 ? product.colors.flatMap(c => c.images || []) : []),
        slug: product.slug,
        categoryName: product.categoryName || "",
        rating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0,
        inStock,
        addedDate: addedDate
      };
    })
  );

  return {
    items: items.filter(Boolean)
  };
}

/**
 * Add product to wishlist
 */
async function addToWishlist(userId, productId) {
  const wishlist = await getOrCreateWishlist(userId);

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }

  const existingItem = wishlist.items.find(
    item => item.productId.toString() === productId.toString()
  );

  if (existingItem) {
    const err = new Error("Product already in wishlist");
    err.status = 400;
    throw err;
  }

  wishlist.items.push({ productId });
  await wishlist.save();

  return wishlist;
}


async function removeFromWishlist(userId, productId) {
  const wishlist = await getOrCreateWishlist(userId);

  const itemIndex = wishlist.items.findIndex(
    item => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    const err = new Error("Product not found in wishlist");
    err.status = 404;
    throw err;
  }

  wishlist.items.splice(itemIndex, 1);
  await wishlist.save();

  return wishlist;
}


async function clearWishlist(userId) {
  const wishlist = await getOrCreateWishlist(userId);
  wishlist.items = [];
  await wishlist.save();
  return wishlist;
}


async function isInWishlist(userId, productId) {
  const wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) return false;

  return wishlist.items.some(
    item => item.productId.toString() === productId.toString()
  );
}

module.exports = {
  getWishlistWithProducts,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  isInWishlist
};

