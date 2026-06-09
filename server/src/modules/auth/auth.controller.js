const { asyncHandler } = require('../../utils/http');
const authService = require('./auth.service');

const loginStaff = asyncHandler(async (req, res) => {
  const data = await authService.loginStaff(req.body);
  res.json({ success: true, data });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
});

const loginCustomer = asyncHandler(async (req, res) => {
  const data = await authService.loginCustomer(req.body);
  res.json({ success: true, data });
});

const registerCustomer = asyncHandler(async (req, res) => {
  const data = await authService.registerCustomer(req.body);
  res.status(201).json({ success: true, data });
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getCurrentUser(req.user);
  res.json({ success: true, data });
});

module.exports = {
  login,
  loginCustomer,
  loginStaff,
  me,
  registerCustomer,
};
