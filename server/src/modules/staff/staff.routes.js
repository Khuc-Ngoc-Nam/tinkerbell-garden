const express = require('express');
const controller = require('./staff.controller');
const { requireStaff } = require('../../middlewares/auth');

const router = express.Router();

router.use(requireStaff(['Manager']));

router.get('/', controller.listStaff);
router.post('/', controller.createStaff);
router.put('/:id', controller.updateStaff);
router.delete('/:id', controller.deleteStaff);

module.exports = router;
