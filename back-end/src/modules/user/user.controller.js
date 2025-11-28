const { validationResult } = require("express-validator");
const { 
  getProfile, 
  updateProfile, 
  updateMembership,
  listCustomers,
  getCustomerById,
  updateCustomerStatus,
  updateCustomer,
  getCustomerOrders
} = require("./user.service");

async function handleGetMe(req, res, next) {
  try {
    const user = await getProfile(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateMe(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const user = await updateProfile(req.user.id, req.body);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateMembership(req, res, next) {
  try {
    const user = await updateMembership(req.params.id, req.body);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

async function handleListCustomers(req, res, next) {
  try {
    const result = await listCustomers(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function handleGetCustomer(req, res, next) {
  try {
    const customer = await getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateCustomerStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const customer = await updateCustomerStatus(req.params.id, isActive);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateCustomer(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const customer = await updateCustomer(req.params.id, req.body);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
}

async function handleGetCustomerOrders(req, res, next) {
  try {
    const orders = await getCustomerOrders(req.params.id);
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
}

module.exports = { 
  handleGetMe, 
  handleUpdateMe, 
  handleUpdateMembership,
  handleListCustomers,
  handleGetCustomer,
  handleUpdateCustomerStatus,
  handleUpdateCustomer,
  handleGetCustomerOrders
};