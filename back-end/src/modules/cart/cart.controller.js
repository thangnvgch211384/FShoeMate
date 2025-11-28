const { validationResult } = require("express-validator");
const service = require("./cart.service");

async function handleGetCart(req, res, next) {
  try {
    const cart = await service.getCartWithDetails(req.user.id);
    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
}

async function handleAddItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const cart = await service.addItem(req.user.id, req.body);
    res.status(201).json({ success: true, cart });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const cart = await service.updateItem(req.user.id, req.params.itemId, req.body.quantity);
    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
}

async function handleRemoveItem(req, res, next) {
  try {
    const cart = await service.removeItem(req.user.id, req.params.itemId);
    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
}

async function handleClearCart(req, res, next) {
  try {
    const cart = await service.clearCart(req.user.id);
    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGetCart,
  handleAddItem,
  handleUpdateItem,
  handleRemoveItem,
  handleClearCart
};