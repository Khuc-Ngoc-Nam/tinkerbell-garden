const { asyncHandler } = require('../../utils/http');
const portalService = require('./portal.service');

const getParkInfo = asyncHandler(async (req, res) => {
  const data = await portalService.getParkInfo();
  res.json({ success: true, data });
});

const getEvents = asyncHandler(async (req, res) => {
  const data = await portalService.listEvents();
  res.json({ success: true, data });
});

const getEventDetail = asyncHandler(async (req, res) => {
  const data = await portalService.getEventDetail(req.params.id);
  res.json({ success: true, data });
});

const getPaidServiceDetail = asyncHandler(async (req, res) => {
  const data = await portalService.getPaidServiceDetail(req.params.serviceId);
  res.json({ success: true, data });
});

const bookEvent = asyncHandler(async (req, res) => {
  const data = await portalService.bookEvent(req.body);
  res.status(201).json({ success: true, data });
});

const registerEventOnline = asyncHandler(async (req, res) => {
  const data = await portalService.registerEventOnline(req.params.id, req.body, req.user || null);
  res.status(201).json({ success: true, data });
});

const registerVip = asyncHandler(async (req, res) => {
  const data = await portalService.registerVipOnline(req.user.sub);
  res.status(201).json({ success: true, data });
});

const createVipPaymentRequest = asyncHandler(async (req, res) => {
  const data = await portalService.createVipPaymentRequest(req.user.sub, req.body);
  res.status(201).json({ success: true, data });
});

const reserveTicket = asyncHandler(async (req, res) => {
  const data = await portalService.reserveTicket(req.body);
  res.status(201).json({ success: true, data });
});

const payTicketReservation = asyncHandler(async (req, res) => {
  const data = await portalService.markTicketReservationPaid(req.params.qrCode);
  res.json({ success: true, data });
});

module.exports = {
  bookEvent,
  getEventDetail,
  getEvents,
  getParkInfo,
  getPaidServiceDetail,
  payTicketReservation,
  createVipPaymentRequest,
  registerEventOnline,
  reserveTicket,
  registerVip,
};
