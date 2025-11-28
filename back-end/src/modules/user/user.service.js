const User = require("./user.model");
const Order = require("../order/order.model");

async function getProfile(userId) {
  const user = await User.findById(userId).select("-password");
  if (!user) return null;
  
  const baseUser = user.toObject();
  if (user.role !== "customer") {
    delete baseUser.membershipLevel;
    delete baseUser.loyaltyPoints;
    delete baseUser.lastMembershipUpdate;
  }
  return baseUser;
}

async function updateProfile(userId, payload) {
  return User.findByIdAndUpdate(userId, payload, { new: true }).select("-password");
}

async function updateMembership(userId, { membershipLevel, loyaltyPoints }) {
  const update = {
    membershipLevel,
    loyaltyPoints,
    lastMembershipUpdate: new Date()
  };
  return User.findByIdAndUpdate(userId, update, { new: true }).select("-password");
}

async function listCustomers(query = {}) {
  const { search, status, membershipLevel, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;
  
  const filter = { role: "customer" };
  if (status) filter.isActive = status === "active";
  if (membershipLevel) {
    if (membershipLevel === "none") {
      filter.membershipLevel = null;
    } else {
      filter.membershipLevel = membershipLevel;
    }
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } }
    ];
  }
  
  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);
  
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const orders = await Order.find({ userId: user._id, status: { $ne: "cancelled" } });
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
      const lastOrder = orders.length > 0 
        ? orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : null;
      
      return {
        ...user.toObject(),
        totalOrders,
        totalSpent,
        lastOrderDate: lastOrder ? lastOrder.createdAt : null
      };
    })
  );
  
  return { users: usersWithStats, total, page: Number(page), limit: Number(limit) };
}

async function getCustomerById(userId) {
  const user = await User.findById(userId).select("-password");
  if (!user || user.role !== "customer") return null;
  
  const orders = await Order.find({ userId: user._id, status: { $ne: "cancelled" } });
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
  const lastOrder = orders.length > 0 
    ? orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;
  
  return {
    ...user.toObject(),
    totalOrders,
    totalSpent,
    lastOrderDate: lastOrder ? lastOrder.createdAt : null
  };
}

async function updateCustomerStatus(userId, isActive) {
  return User.findByIdAndUpdate(userId, { isActive }, { new: true }).select("-password");
}

async function updateCustomer(userId, payload) {
  const { password, ...updateData } = payload;
  return User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
}

async function getCustomerOrders(userId) {
  return Order.find({ userId }).sort({ createdAt: -1 });
}

module.exports = { 
  getProfile, 
  updateProfile, 
  updateMembership,
  listCustomers,
  getCustomerById,
  updateCustomerStatus,
  updateCustomer,
  getCustomerOrders
};