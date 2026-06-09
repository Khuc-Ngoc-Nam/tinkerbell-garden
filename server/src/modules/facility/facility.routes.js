const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const controller = require('./facility.controller');
const { requireStaff } = require('../../middlewares/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '../../../public/uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext || '.jpg';
      const target = req.uploadTarget || 'paid-asset';
      cb(null, `${target}-${Date.now()}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

router.use(requireStaff(['Manager', 'Cashier']));

router.get('/', controller.listFacilities);
router.post('/', controller.createFacility);
router.put('/:id', controller.updateFacility);
router.post('/:id/image', (req, res, next) => {
  req.uploadTarget = `facility-${req.params.id}`;
  next();
}, upload.single('image'), controller.uploadFacilityImage);
router.delete('/:id', controller.deleteFacility);
router.get('/paid-services/services', controller.listPaidServices);
router.post('/paid-services/services', (req, res, next) => {
  req.uploadTarget = 'paid-service';
  next();
}, upload.single('image'), controller.createPaidService);
router.get('/paid-services/items', controller.listProducts);
router.post('/paid-services/items', (req, res, next) => {
  req.uploadTarget = 'paid-product';
  next();
}, upload.single('image'), controller.createProduct);
router.put('/paid-services/items/:id', (req, res, next) => {
  req.uploadTarget = `paid-product-${req.params.id}`;
  next();
}, upload.single('image'), controller.updateProduct);
router.delete('/paid-services/items/:id', controller.deleteProduct);
router.get('/staff/assignments', controller.listStaffAssignments);
router.put('/staff/:staffId/assignments', controller.assignStaffArea);

module.exports = router;
