const LoyaltyTransaction = require("./loyaltyTransaction.model");
const User = require("../user/user.model");

function calculateMembershipLevel(points) {
  if (points >= 5000) return "diamond";
  if (points >= 2500) return "gold";
  if (points >= 1000) return "silver";
  return null;
}

async function earnPoints({ userId, orderId, revenue, multiplier = 0.01, reason = "Order completion" }) {
  if (!userId || !revenue) return null;

  const pointsEarned = Math.floor(revenue * multiplier);
  if (pointsEarned <= 0) return null;

  const transaction = await LoyaltyTransaction.create({
    userId,
    orderId,
    pointsEarned,
    revenue,
    reason
  });

  const user = await User.findById(userId);
  if (!user) return transaction;

  user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
  user.lastMembershipUpdate = new Date();
  user.membershipLevel = calculateMembershipLevel(user.loyaltyPoints);
  await user.save();

  return transaction;
}

async function deductPoints(userId, points, reason = "Redemption") {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) - points);
  user.membershipLevel = calculateMembershipLevel(user.loyaltyPoints);
  user.lastMembershipUpdate = new Date();
  await user.save();

  return LoyaltyTransaction.create({
    userId,
    pointsEarned: -points,
    revenue: 0,
    reason
  });
}

async function getSummary(userId) {
  const user = await User.findById(userId).select("loyaltyPoints membershipLevel");
  const recentTransactions = await LoyaltyTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    points: user?.loyaltyPoints || 0,
    level: user?.membershipLevel || null,
    transactions: recentTransactions
  };
}

module.exports = {
  earnPoints,
  deductPoints,
  getSummary
};