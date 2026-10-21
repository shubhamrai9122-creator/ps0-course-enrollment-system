const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getAdminDashboard
} = require('../controllers/dashboardController');
const { authHandler, allowRoles } = require('../middleware/authHandler');

router.get('/student', authHandler, allowRoles('student'), getStudentDashboard);
router.get('/admin', authHandler, allowRoles('admin'), getAdminDashboard);

module.exports = router;
