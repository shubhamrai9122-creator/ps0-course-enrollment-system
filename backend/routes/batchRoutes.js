const express = require('express');
const router = express.Router();
const {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStudents
} = require('../controllers/batchController');
const { authHandler, allowRoles } = require('../middleware/authHandler');

// Authenticated users can list and view batches
router.get('/', authHandler, getBatches);
router.get('/:id', authHandler, getBatchById);

// Admin only: batch roster and batch CRUD
router.get('/:id/students', authHandler, allowRoles('admin'), getBatchStudents);
router.post('/', authHandler, allowRoles('admin'), createBatch);
router.put('/:id', authHandler, allowRoles('admin'), updateBatch);
router.delete('/:id', authHandler, allowRoles('admin'), deleteBatch);

module.exports = router;
