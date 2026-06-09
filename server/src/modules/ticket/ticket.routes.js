const express = require('express');
const controller = require('./ticket.controller');
const { requireStaff } = require('../../middlewares/auth');

const router = express.Router();

router.use(requireStaff(['Manager', 'Cashier']));

router.get('/types', controller.listTicketTypes);
router.get('/products', controller.listProducts);
router.get('/sessions/active', controller.listActiveSessions);
router.post('/sessions', controller.createSession);
router.patch('/sessions/:id/checkin', controller.checkinSession);
router.get('/sessions/:id/checkout-preview', controller.previewCheckout);
router.post('/sessions/:id/checkout', controller.checkoutSession);
router.post('/service-orders', controller.sellServiceOrder);

module.exports = router;
