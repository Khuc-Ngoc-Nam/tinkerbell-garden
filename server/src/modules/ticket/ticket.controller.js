const { asyncHandler } = require('../../utils/http');
const ticketService = require('./ticket.service');

const listTicketTypes = asyncHandler(async (req, res) => {
  const data = await ticketService.listTicketTypes();
  res.json({ success: true, data });
});

const listProducts = asyncHandler(async (req, res) => {
  const data = await ticketService.listProducts(req.user);
  res.json({ success: true, data });
});

const createSession = asyncHandler(async (req, res) => {
  const data = await ticketService.createSession({
    ...req.body,
    staffId: req.user?.sub || req.body.staffId || null,
  }, req.user);
  res.status(201).json({ success: true, data });
});

const listActiveSessions = asyncHandler(async (req, res) => {
  const data = await ticketService.listActiveSessions(req.user);
  res.json({ success: true, data });
});

const previewCheckout = asyncHandler(async (req, res) => {
  const data = await ticketService.calculateCheckout(req.params.id, req.user);
  res.json({ success: true, data });
});

const checkinSession = asyncHandler(async (req, res) => {
  const data = await ticketService.checkinSession(req.params.id, {
    staffId: req.user?.sub || req.body.staffId || null,
    user: req.user,
  });
  res.json({ success: true, data });
});

const checkoutSession = asyncHandler(async (req, res) => {
  const data = await ticketService.checkoutSession(req.params.id, {
    staffId: req.user?.sub || req.body.staffId || null,
    paymentMethod: req.body.paymentMethod,
    user: req.user,
  });
  res.json({ success: true, data });
});

const sellServiceOrder = asyncHandler(async (req, res) => {
  const data = await ticketService.sellServiceOrder({
    ...req.body,
    staffId: req.user?.sub || req.body.staffId || null,
    user: req.user,
  });
  res.status(201).json({ success: true, data });
});

module.exports = {
  checkinSession,
  checkoutSession,
  createSession,
  listActiveSessions,
  listProducts,
  listTicketTypes,
  previewCheckout,
  sellServiceOrder,
};
