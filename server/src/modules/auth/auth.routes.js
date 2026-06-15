const express = require('express');
const controller = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

router.post('/staff/login', controller.loginStaff);
router.post('/customer/login', controller.loginCustomer);
router.post('/customer/register', controller.registerCustomer);
router.post('/login', controller.login);
router.get('/me', authenticate, controller.me);
router.post('/change-password', authenticate, controller.changePassword);

module.exports = router;
