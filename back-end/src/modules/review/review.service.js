const Review = require("./review.model");
const Product = require("../product/product.model");

async function createReview({ productId, userId, rating, comment }) {
  const review = await Review.create({ productId, userId, rating, comment });

  const stats = await Review.aggregate([
    { $match: { productId: review.productId } },
    { $group: { _id: "$productId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(review.productId, {
      rating: stats[0].avgRating,
      reviewCount: stats[0].count
    });
  }

  return review;
}

function listReviews(productId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;
  return Review.find({ productId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "name avatar");
}

function listAllReviews(query = {}) {
  return Review.find(query).populate("productId", "name").populate("userId", "name email");
}

function deleteReview(reviewId) {
  return Review.findByIdAndDelete(reviewId);
}

module.exports = {
  createReview,
  listReviews,
  listAllReviews,
  deleteReview
};