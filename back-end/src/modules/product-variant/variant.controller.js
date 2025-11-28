const { validationResult } = require("express-validator");
const service = require("./variant.service");

async function handleList(req, res, next) {
  try {
    const variants = await service.listVariants(req.params.productId);
    res.json({ success: true, variants });
  } catch (error) {
    next(error);
  }
}

async function handleCreate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const variant = await service.createVariant(req.params.productId, req.body);
    res.status(201).json({ success: true, variant });
  } catch (error) {
    next(error);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const variant = await service.updateVariant(req.params.variantId, req.body);
    if (!variant) return res.status(404).json({ message: "Variant not found" });
    res.json({ success: true, variant });
  } catch (error) {
    next(error);
  }
}

async function handleAdjustStock(req, res, next) {
  try {
    const variant = await service.adjustStock(req.params.variantId, req.body);
    if (!variant) return res.status(404).json({ message: "Variant not found" });
    res.json({ success: true, variant });
  } catch (error) {
    next(error);
  }
}

async function handleDelete(req, res, next) {
  try {
    await service.deleteVariant(req.params.variantId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function handleListAll(req, res, next) {
  try {
    const variants = await service.listAllVariants(req.query);
    res.json({ success: true, variants });
  } catch (error) {
    next(error);
  }
}

async function handleGet(req, res, next) {
  try {
    const variant = await service.getVariant(req.params.variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });
    res.json({ success: true, variant });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleList,
  handleCreate,
  handleUpdate,
  handleAdjustStock,
  handleDelete,
  handleListAll,
  handleGet
};