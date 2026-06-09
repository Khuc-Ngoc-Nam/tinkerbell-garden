const { asyncHandler } = require('../../utils/http');
const reportService = require('./report.service');

const visitorStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reportService.visitorStats(req.query) });
});

const revenueReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reportService.revenueReport(req.query) });
});

const dashboardData = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reportService.dashboardData() });
});

module.exports = {
  dashboardData,
  revenueReport,
  visitorStats,
};
