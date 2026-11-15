const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboard.service');

exports.summary = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await dashboardService.getSummary(req.organizationId)) });
});
