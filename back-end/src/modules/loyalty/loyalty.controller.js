const service = require("./loyalty.service");

async function handleGetSummary(req, res, next) {
  try {
    const summary = await service.getSummary(req.user.id);
    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
}

// (Optional) endpoint để admin trừ điểm, đổi thưởng
async function handleDeductPoints(req, res, next) {
  try {
    const { userId } = req.params;
    const { points, reason } = req.body;

    const transaction = await service.deductPoints(userId, points, reason);
    res.json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGetSummary,
  handleDeductPoints
};