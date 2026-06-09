const express = require('express');
const controller = require('./portal.controller');
const { optionalCustomer, requireCustomer } = require('../../middlewares/auth');

const router = express.Router();

router.get('/info', controller.getParkInfo);
router.get('/services/:serviceId', controller.getPaidServiceDetail);
router.get('/events', controller.getEvents);
router.get('/events/:id', controller.getEventDetail);
router.post('/events/:id/register', optionalCustomer, controller.registerEventOnline);
router.post('/events/book', controller.bookEvent);
router.post('/tickets/reserve', controller.reserveTicket);
router.post('/tickets/reservations/:qrCode/pay', controller.payTicketReservation);
router.post('/vip/register', requireCustomer, controller.registerVip);
router.post('/vip/payment-request', requireCustomer, controller.createVipPaymentRequest);

module.exports = router;
