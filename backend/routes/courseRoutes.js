const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');
const { authHandler, allowRoles } = require('../middleware/authHandler');

// Authenticated users (students and admins) can browse courses
router.get('/', authHandler, getCourses);
router.get('/:id', authHandler, getCourseById);

// Admin only routes for course CRUD
router.post('/', authHandler, allowRoles('admin'), createCourse);
router.put('/:id', authHandler, allowRoles('admin'), updateCourse);
router.delete('/:id', authHandler, allowRoles('admin'), deleteCourse);

module.exports = router;
