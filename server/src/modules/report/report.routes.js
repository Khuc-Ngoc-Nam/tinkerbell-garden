const express = require('express');
const controller = require('./report.controller');
const { requireStaff } = require('../../middlewares/auth');

const router = express.Router();

router.use(requireStaff(['Manager']));

router.get('/dashboard', controller.dashboardData);
router.get('/visitors', controller.visitorStats);
router.get('/revenue', controller.revenueReport);

module.exports = router;
