const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const { SEAT_STATUSES } = require('../models/Enrollment');
const { getBatchPhase } = require('../models/Batch');

// @desc    Get student dashboard metrics & summary
// @route   GET /api/dashboard/student
// @access  Private (Student)
const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const enrollments = await Enrollment.find({ student: studentId })
      .populate('course', 'title code durationWeeks fee')
      .populate('batch', 'name startDate timing mode')
      .sort({ updatedAt: -1 });

    const valid = enrollments.filter((e) => e.course && e.batch);
    const countOf = (status) => valid.filter((e) => e.status === status).length;
    const activeCount = countOf('Active');
    const completedCount = countOf('Completed');
    const waitlistedCount = countOf('Waitlisted');
    const droppedCount = countOf('Dropped');

    // Batches the student is currently attending or about to start
    const currentBatches = valid
      .filter((e) => e.status === 'Active')
      .map((e) => ({
        enrollmentId: e._id,
        courseId: e.course._id,
        courseTitle: e.course.title,
        courseCode: e.course.code,
        batchName: e.batch.name,
        startDate: e.batch.startDate,
        timing: e.batch.timing,
        mode: e.batch.mode,
        phase: getBatchPhase(e.batch.startDate, e.course.durationWeeks)
      }));

    const totalCourseFees = valid
      .filter((e) => SEAT_STATUSES.includes(e.status))
      .reduce((sum, e) => sum + (e.course.fee || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        profile: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          memberSince: req.user.createdAt
        },
        counts: {
          active: activeCount,
          completed: completedCount,
          waitlisted: waitlistedCount,
          dropped: droppedCount
        },
        totalCourseFees,
        currentBatches,
        recentEnrollments: valid.slice(0, 5)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get administrator dashboard metrics & institute summary
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
const getAdminDashboard = async (req, res, next) => {
  try {
    // All queries run in parallel: each one is a network round trip to the database
    const [
      courses,
      totalStudents,
      activeCount,
      completedCount,
      droppedCount,
      waitlistedCount,
      batches,
      courseAgg,
      recentEnrollments
    ] = await Promise.all([
      Course.find().sort({ title: 1 }),
      User.countDocuments({ role: 'student' }),
      Enrollment.countDocuments({ status: 'Active' }),
      Enrollment.countDocuments({ status: 'Completed' }),
      Enrollment.countDocuments({ status: 'Dropped' }),
      Enrollment.countDocuments({ status: 'Waitlisted' }),
      Batch.find().populate('course', 'title code durationWeeks'),
      // Course-wise enrollments (Active + Completed hold a seat)
      Enrollment.aggregate([
        { $match: { status: { $in: SEAT_STATUSES } } },
        { $group: { _id: '$course', enrollments: { $sum: 1 } } }
      ]),
      // Recent 5 enrollments institute-wide
      Enrollment.find()
        .populate('student', 'name email')
        .populate('course', 'title code')
        .populate('batch', 'name mode')
        .sort({ updatedAt: -1 })
        .limit(5)
    ]);
    const totalCourses = courses.length;

    // Active batches = batches that are ongoing or upcoming (not yet ended)
    const batchMeta = batches.filter((b) => b.course).map((b) => b.toMeta());
    const ongoing = batchMeta.filter((b) => b.phase === 'Ongoing');
    const upcoming = batchMeta.filter((b) => b.phase === 'Upcoming');
    const activeBatches = [...ongoing, ...upcoming].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    const enrollmentsByCourse = new Map(courseAgg.map((c) => [c._id.toString(), c.enrollments]));

    const courseWiseStats = courses
      .map((course) => {
        const courseBatches = batchMeta.filter((b) => b.course._id.toString() === course._id.toString());
        return {
          courseId: course._id,
          title: course.title,
          code: course.code,
          fee: course.fee,
          batchCount: courseBatches.length,
          activeBatchCount: courseBatches.filter((b) => b.phase !== 'Ended').length,
          seatsFilled: courseBatches.reduce((sum, b) => sum + b.seatsFilled, 0),
          totalSeats: courseBatches.reduce((sum, b) => sum + b.totalSeats, 0),
          enrollments: enrollmentsByCourse.get(course._id.toString()) || 0
        };
      })
      .sort((a, b) => b.enrollments - a.enrollments || a.title.localeCompare(b.title));

    const mostPopularCourse =
      courseWiseStats.length > 0 && courseWiseStats[0].enrollments > 0 ? courseWiseStats[0] : null;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCourses,
          totalStudents,
          totalBatches: batchMeta.length,
          activeBatches: activeBatches.length,
          ongoingBatches: ongoing.length,
          upcomingBatches: upcoming.length,
          totalEnrollments: activeCount + completedCount + droppedCount,
          activeEnrollments: activeCount,
          completedEnrollments: completedCount,
          droppedEnrollments: droppedCount,
          waitlistedStudents: waitlistedCount
        },
        mostPopularCourse,
        activeBatches,
        courseWiseStats,
        recentEnrollments: recentEnrollments.filter((e) => e.student && e.course && e.batch)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboard,
  getAdminDashboard
};
