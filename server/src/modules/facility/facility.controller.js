const { asyncHandler } = require('../../utils/http');
const service = require('./facility.service');

const listFacilities = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listFacilities(req.user) });
});

const createFacility = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.createFacility(req.body, req.user) });
});

const updateFacility = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.updateFacility(req.params.id, req.body, req.user) });
});

const uploadFacilityImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Image file is required' });
    return;
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, data: await service.updateFacilityImage(req.params.id, imageUrl, req.user) });
});

const deleteFacility = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.deleteFacility(req.params.id, req.user) });
});

const listProducts = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listProducts(req.user) });
});

const listPaidServices = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listPaidServices(req.user) });
});

const createPaidService = asyncHandler(async (req, res) => {
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  res.status(201).json({ success: true, data: await service.createPaidService(req.body, imageUrl, req.user) });
});

const createProduct = asyncHandler(async (req, res) => {
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  res.status(201).json({ success: true, data: await service.createProduct(req.body, req.user, imageUrl) });
});

const updateProduct = asyncHandler(async (req, res) => {
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  res.json({ success: true, data: await service.updateProduct(req.params.id, req.body, req.user, imageUrl) });
});

const deleteProduct = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.deleteProduct(req.params.id, req.user) });
});

const listStaffAssignments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listStaffAssignments(req.user) });
});

const assignStaffArea = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.assignStaffArea(req.params.staffId, req.body, req.user) });
});

module.exports = {
  assignStaffArea,
  createFacility,
  createPaidService,
  createProduct,
  deleteFacility,
  deleteProduct,
  listFacilities,
  listPaidServices,
  listProducts,
  listStaffAssignments,
  updateFacility,
  uploadFacilityImage,
  updateProduct,
};
