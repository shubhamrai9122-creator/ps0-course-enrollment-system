const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const { SEAT_STATUSES } = require('../models/Enrollment');

// Escape user input before using it inside a RegExp
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  title: { title: 1 },
  fee_asc: { fee: 1, title: 1 },
  fee_desc: { fee: -1, title: 1 },
  duration: { durationWeeks: 1, title: 1 }
};

// Validate and normalize course fields from the request body.
// Returns { data } or { error } so create and update share the same rules.
const parseCourseBody = (body, { partial = false } = {}) => {
  const { title, code, durationWeeks, fee, description } = body;
  const data = {};

  if (!partial && (!title || !code || durationWeeks === undefined || fee === undefined || !description)) {
    return { error: 'Please provide title, code, durationWeeks, fee and description' };
  }

  if (title !== undefined) {
    if (!String(title).trim()) return { error: 'Course title cannot be empty' };
    data.title = String(title).trim();
  }

  if (code !== undefined) {
    if (!String(code).trim()) return { error: 'Course code cannot be empty' };
    data.code = String(code).toUpperCase().trim();
  }

  if (durationWeeks !== undefined) {
    const weeks = Number(durationWeeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 104) {
      return { error: 'Duration must be a whole number of weeks between 1 and 104' };
    }
    data.durationWeeks = weeks;
  }

  if (fee !== undefined) {
    const feeNum = Number(fee);
    if (fee === '' || isNaN(feeNum) || feeNum < 0 || feeNum > 1000000) {
      return { error: 'Fee must be a number between 0 and 1000000' };
    }
    data.fee = feeNum;
  }

  if (description !== undefined) {
    if (!String(description).trim()) return { error: 'Course description cannot be empty' };
    data.description = String(description).trim();
  }

  return { data };
};

// @desc    Get all courses (supports ?search= and ?sort=)
// @route   GET /api/courses
// @access  Private (All authenticated users)
const getCourses = async (req, res, next) => {
  try {
    const { search, sort } = req.query;
    const filter = {};

    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [{ title: regex }, { code: regex }, { description: regex }];
    }

    const courses = await Course.find(filter).sort(SORT_OPTIONS[sort] || SORT_OPTIONS.title);

    // Attach batch summary (count, open batches, seats left) to every course
    const batches = await Batch.find({ course: { $in: courses.map((c) => c._id) } });

    const data = courses.map((course) => {
      const courseBatches = batches
        .filter((b) => b.course.toString() === course._id.toString())
        .map((b) => b.toMeta(course.durationWeeks));
      const openBatches = courseBatches.filter((b) => b.phase !== 'Ended');

      return {
        ...course.toObject(),
        batchCount: courseBatches.length,
        openBatchCount: openBatches.length,
        seatsLeft: openBatches.reduce((sum, b) => sum + b.seatsLeft, 0),
        modes: [...new Set(openBatches.map((b) => b.mode))],
        nextStartDate: openBatches
          .filter((b) => b.phase === 'Upcoming')
          .map((b) => b.startDate)
          .sort((a, b) => a - b)[0] || null
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course with all its batches (and the student's own enrollment)
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const batches = await Batch.find({ course: course._id }).sort({ startDate: 1, name: 1 });

    let myEnrollment = null;
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: course._id
      }).populate('batch', 'name startDate timing mode');

      if (enrollment) {
        myEnrollment = enrollment.toObject();
        myEnrollment.waitlistPosition = await Enrollment.getWaitlistPosition(enrollment);
      }
    }

    const enrolledCount = await Enrollment.countDocuments({
      course: course._id,
      status: { $in: SEAT_STATUSES }
    });

    res.status(200).json({
      success: true,
      data: {
        course,
        batches: batches.map((b) => b.toMeta(course.durationWeeks)),
        enrolledCount,
        myEnrollment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Admin only)
const createCourse = async (req, res, next) => {
  try {
    const { data, error } = parseCourseBody(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const existing = await Course.findOne({ code: data.code });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A course with code '${data.code}' already exists`
      });
    }

    const course = await Course.create(data);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Admin only)
const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const { data, error } = parseCourseBody(req.body, { partial: true });
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    if (data.code && data.code !== course.code) {
      const existing = await Course.findOne({ code: data.code, _id: { $ne: course._id } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Another course with code '${data.code}' already exists`
        });
      }
    }

    Object.assign(course, data);
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a course (and its batches) when nobody is enrolled
// @route   DELETE /api/courses/:id
// @access  Private (Admin only)
const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const liveEnrollments = await Enrollment.countDocuments({
      course: course._id,
      status: { $ne: 'Dropped' }
    });
    if (liveEnrollments > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete '${course.title}' because it has ${liveEnrollments} active, completed or waitlisted enrollment(s). Mark them Dropped first.`
      });
    }

    await Enrollment.deleteMany({ course: course._id });
    const { deletedCount } = await Batch.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(course._id);

    res.status(200).json({
      success: true,
      message: `Course '${course.title}' and its ${deletedCount} batch(es) deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};
