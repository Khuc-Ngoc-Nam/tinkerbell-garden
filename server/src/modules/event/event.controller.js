const { asyncHandler } = require('../../utils/http');
const eventService = require('./event.service');

const listEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listEvents({ search: req.query.search });
  res.json({ success: true, data });
});

const listOngoingEvents = asyncHandler(async (req, res) => {
  const data = await eventService.listEvents({ publicOnly: true, search: req.query.search });
  res.json({ success: true, data });
});

const getEvent = asyncHandler(async (req, res) => {
  const data = await eventService.getPublicEvent(req.params.id);
  res.json({ success: true, data });
});

const createEvent = asyncHandler(async (req, res) => {
  const data = await eventService.createEvent(req.body);
  res.status(201).json({ success: true, data });
});

const updateEvent = asyncHandler(async (req, res) => {
  const data = await eventService.updateEvent(req.params.id, req.body);
  res.json({ success: true, data });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const data = await eventService.deleteEvent(req.params.id);
  res.json({ success: true, data });
});

const listBookings = asyncHandler(async (req, res) => {
  const data = await eventService.listBookings(req.query);
  res.json({ success: true, data });
});

const listOnlineRegistrations = asyncHandler(async (req, res) => {
  const data = await eventService.listOnlineRegistrations(req.query);
  res.json({ success: true, data });
});

const confirmOnlineRegistration = asyncHandler(async (req, res) => {
  const data = await eventService.confirmOnlineRegistration(req.params.id, {
    staffId: req.user?.sub || null,
    paymentMethod: req.body.paymentMethod,
  });
  res.json({ success: true, data });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const data = await eventService.setBookingStatus(req.params.qrCode, req.body.status);
  res.json({ success: true, data });
});

module.exports = {
  createEvent,
  deleteEvent,
  getEvent,
  confirmOnlineRegistration,
  listBookings,
  listEvents,
  listOngoingEvents,
  listOnlineRegistrations,
  updateBookingStatus,
  updateEvent,
};
