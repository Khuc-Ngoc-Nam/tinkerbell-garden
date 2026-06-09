const express = require('express');
const controller = require('./event.controller');
const { requireStaff } = require('../../middlewares/auth');

const router = express.Router();

router.use(requireStaff(['Manager', 'Cashier']));

router.get('/', controller.listEvents);
router.get('/ongoing', controller.listOngoingEvents);
router.get('/registrations/online', requireStaff(['Manager']), controller.listOnlineRegistrations);
router.patch('/registrations/:id/paid', requireStaff(['Manager']), controller.confirmOnlineRegistration);
router.post('/', requireStaff(['Manager']), controller.createEvent);
router.put('/:id', requireStaff(['Manager']), controller.updateEvent);
router.delete('/:id', requireStaff(['Manager']), controller.deleteEvent);
router.get('/bookings/list', controller.listBookings);
router.patch('/bookings/:qrCode/status', controller.updateBookingStatus);

module.exports = router;
