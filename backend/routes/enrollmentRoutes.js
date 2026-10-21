const express = require('express');
const router = express.Router();
const {
  enroll,
  getMyEnrollments,
  getAllEnrollments,
  dropEnrollment,
  updateEnrollmentStatus
} = require('../controllers/enrollmentController');
const { authHandler, allowRoles } = require('../middleware/authHandler');

// Student operations
router.post('/', authHandler, allowRoles('student'), enroll);
router.get('/my', authHandler, allowRoles('student'), getMyEnrollments);

// Admin list
router.get('/', authHandler, allowRoles('admin'), getAllEnrollments);

// Individual enrollment operations
router.patch('/:id/drop', authHandler, allowRoles('student', 'admin'), dropEnrollment);
router.patch('/:id/status', authHandler, allowRoles('admin'), updateEnrollmentStatus);

module.exports = router;
