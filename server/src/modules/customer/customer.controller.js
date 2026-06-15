const { asyncHandler } = require('../../utils/http');
const customerService = require('./customer.service');

const listCustomers = asyncHandler(async (req, res) => {
  const data = await customerService.listCustomers();
  res.json({ success: true, data });
});

const listVipCustomers = asyncHandler(async (req, res) => {
  const data = await customerService.listVipCustomers(req.query);
  res.json({ success: true, data });
});

const listVipPaymentRequests = asyncHandler(async (req, res) => {
  const data = await customerService.listVipPaymentRequests(req.query);
  res.json({ success: true, data });
});

const lookupCustomer = asyncHandler(async (req, res) => {
  const data = await customerService.lookupCustomerByUsername(req.query.username);
  res.json({ success: true, data });
});

const getCustomer = asyncHandler(async (req, res) => {
  const data = await customerService.getCustomer(req.params.id);
  res.json({ success: true, data });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const [profile, bookings] = await Promise.all([
    customerService.getCustomer(req.user.sub),
    customerService.getCustomerBookings(req.user.sub),
  ]);
  res.json({ success: true, data: { profile, bookings } });
});

const registerVip = asyncHandler(async (req, res) => {
  const data = await customerService.registerOrRenewVip({
    ...req.body,
    channel: req.body.channel || 'Counter',
    staffId: req.user?.sub || req.body.staffId || null,
  });
  res.status(201).json({ success: true, data });
});

const registerVipAtCounter = asyncHandler(async (req, res) => {
  const data = await customerService.registerOrRenewVipAtCounter({
    username: req.body.username,
    years: req.body.years,
    paymentMethod: req.body.paymentMethod,
    staffId: req.user?.sub || null,
  });
  res.status(201).json({ success: true, data });
});

const approveVipPaymentRequest = asyncHandler(async (req, res) => {
  const data = await customerService.approveVipPaymentRequest({
    requestId: req.params.id,
    staffId: req.user?.sub || null,
  });
  res.json({ success: true, data });
});

module.exports = {
  approveVipPaymentRequest,
  getCustomer,
  getMyProfile,
  listCustomers,
  listVipCustomers,
  listVipPaymentRequests,
  lookupCustomer,
  registerVip,
  registerVipAtCounter,
};
