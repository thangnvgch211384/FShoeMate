const { validationResult } = require("express-validator");
const service = require("./promotion.service");

async function handleCreate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const promotion = await service.createPromotion(req.body);
    res.status(201).json({ success: true, promotion });
  } catch (error) {
    next(error);
  }
}

async function handleList(req, res, next) {
  try {
    const promotions = await service.listPromotions(req.query);
    res.json({ success: true, promotions });
  } catch (error) {
    next(error);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const promotion = await service.updatePromotion(req.params.id, req.body);
    if (!promotion) return res.status(404).json({ message: "Promotion not found" });
    res.json({ success: true, promotion });
  } catch (error) {
    next(error);
  }
}

async function handleDelete(req, res, next) {
  try {
    await service.deletePromotion(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function handleValidate(req, res, next) {
  try {
    const { code, orderTotal, items } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "Thiếu mã" });

    const result = await service.validatePromotion({
      code,
      orderTotal,
      userId: req.user?.id,
      items: items || []
    });

    if (!result.success) return res.status(400).json(result);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function handleGetUsageHistory(req, res, next) {
  try {
    const history = await service.getPromotionUsageHistory(req.params.id);
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleCreate,
  handleList,
  handleUpdate,
  handleDelete,
  handleValidate,
  handleGetUsageHistory
};