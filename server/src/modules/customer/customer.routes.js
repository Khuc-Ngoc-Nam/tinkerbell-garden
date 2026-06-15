const express = require('express');
const controller = require('./customer.controller');
const { requireCustomer, requireStaff } = require('../../middlewares/auth');

const router = express.Router();

router.get('/', requireStaff(['Manager', 'Cashier']), controller.listCustomers);
router.get('/me', requireCustomer, controller.getMyProfile);
router.get('/lookup', requireStaff(['Manager', 'Cashier']), controller.lookupCustomer);
router.get('/vip/list', requireStaff(['Manager', 'Cashier']), controller.listVipCustomers);
router.get('/vip/online-requests', requireStaff(['Manager']), controller.listVipPaymentRequests);
router.post('/vip', requireStaff(['Manager', 'Cashier']), controller.registerVip);
router.post('/vip/counter-renew', requireStaff(['Manager', 'Cashier']), controller.registerVipAtCounter);
router.post('/vip/online-requests/:id/approve', requireStaff(['Manager']), controller.approveVipPaymentRequest);
router.get('/:id', requireStaff(['Manager', 'Cashier']), controller.getCustomer);

module.exports = router;
