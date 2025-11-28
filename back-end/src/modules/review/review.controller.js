const { validationResult } = require("express-validator");
const service = require("./review.service");

async function handleCreate(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const review = await service.createReview({
      productId: req.params.productId,
      userId: req.user?.id,
      rating: req.body.rating,
      comment: req.body.comment
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
}

async function handleList(req, res, next) {
  try {
    const reviews = await service.listReviews(req.params.productId, req.query);
    res.json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
}

async function handleAdminList(req, res, next) {
  try {
    const reviews = await service.listAllReviews(req.query);
    res.json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
}

async function handleDelete(req, res, next) {
  try {
    await service.deleteReview(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleCreate,
  handleList,
  handleAdminList,
  handleDelete
};