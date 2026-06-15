const { asyncHandler } = require('../../utils/http');
const staffService = require('./staff.service');

const listStaff = asyncHandler(async (req, res) => {
  const data = await staffService.listStaff();
  res.json({ success: true, data });
});

const createStaff = asyncHandler(async (req, res) => {
  const data = await staffService.createStaff(req.body);
  res.status(201).json({ success: true, data });
});

const updateStaff = asyncHandler(async (req, res) => {
  const data = await staffService.updateStaff(req.params.id, req.body);
  res.json({ success: true, data });
});

const deleteStaff = asyncHandler(async (req, res) => {
  const data = await staffService.deleteStaff(req.params.id, req.user.sub);
  res.json({ success: true, data });
});

module.exports = {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
};
