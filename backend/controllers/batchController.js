const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Parse 'YYYY-MM-DD' (or an ISO string) into a UTC midnight Date. Returns null when invalid.
const parseDateOnly = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(date.getTime()) || date.getUTCDate() !== d) return null;
  return date;
};

// Validate and normalize batch fields from the request body.
const parseBatchBody = (body, { partial = false } = {}) => {
  const { name, startDate, timing, mode, totalSeats } = body;
  const data = {};

  if (!partial && (!name || !startDate || !timing || !mode || totalSeats === undefined)) {
    return { error: 'Please provide name, startDate, timing, mode and totalSeats' };
  }

  if (name !== undefined) {
    if (!String(name).trim()) return { error: 'Batch name cannot be empty' };
    data.name = String(name).trim();
  }

  if (startDate !== undefined) {
    const parsed = parseDateOnly(startDate);
    if (!parsed) return { error: 'Start date must be a valid date in YYYY-MM-DD format' };
    data.startDate = parsed;
  }

  if (timing !== undefined) {
    if (!String(timing).trim()) return { error: 'Batch timing cannot be empty' };
    data.timing = String(timing).trim();
  }

  if (mode !== undefined) {
    if (!['Online', 'Offline'].includes(mode)) {
      return { error: "Mode must be either 'Online' or 'Offline'" };
    }
    data.mode = mode;
  }

  if (totalSeats !== undefined) {
    const seats = Number(totalSeats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 500) {
      return { error: 'Total seats must be a whole number between 1 and 500' };
    }
    data.totalSeats = seats;
  }

  return { data };
};

// @desc    List batches (optionally for one course: ?course=<id>)
// @route   GET /api/batches
// @access  Private
const getBatches = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.course) filter.course = req.query.course;

    const batches = await Batch.find(filter)
      .populate('course', 'title code durationWeeks fee')
      .sort({ startDate: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches.filter((b) => b.course).map((b) => b.toMeta())
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single batch
// @route   GET /api/batches/:id
// @access  Private
const getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('course', 'title code durationWeeks fee');
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.status(200).json({
      success: true,
      data: batch.toMeta()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a batch under a course
// @route   POST /api/batches
// @access  Private (Admin only)
const createBatch = async (req, res, next) => {
  try {
    const { course: courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the course this batch belongs to'
      });
    }

    const { data, error } = parseBatchBody(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const batch = await Batch.create({ ...data, course: course._id, seatsFilled: 0 });

    res.status(201).json({
      success: true,
      message: `Batch '${batch.name}' created for ${course.title}`,
      data: batch.toMeta(course.durationWeeks)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a batch (seats can never go below the seats already filled)
// @route   PUT /api/batches/:id
// @access  Private (Admin only)
const updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const { data, error } = parseBatchBody(req.body, { partial: true });
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const newTotal = data.totalSeats !== undefined ? data.totalSeats : batch.totalSeats;

    // Conditional update so a concurrent enrollment can't push seatsFilled past the new total
    const updated = await Batch.findOneAndUpdate(
      { _id: batch._id, seatsFilled: { $lte: newTotal } },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('course', 'title code durationWeeks fee');

    if (!updated) {
      const current = await Batch.findById(batch._id);
      return res.status(400).json({
        success: false,
        message: `Total seats cannot be less than the ${current ? current.seatsFilled : batch.seatsFilled} seat(s) already filled`
      });
    }

    // More seats may let waitlisted students in
    let promoted = 0;
    if (newTotal > batch.totalSeats) {
      promoted = await Enrollment.promoteWaitlist(updated._id);
    }

    const fresh = promoted > 0
      ? await Batch.findById(updated._id).populate('course', 'title code durationWeeks fee')
      : updated;

    res.status(200).json({
      success: true,
      message: promoted > 0
        ? `Batch updated. ${promoted} waitlisted student(s) were enrolled into the new seats.`
        : 'Batch updated successfully',
      data: fresh.toMeta()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a batch when nobody is enrolled or waitlisted in it
// @route   DELETE /api/batches/:id
// @access  Private (Admin only)
const deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const liveEnrollments = await Enrollment.countDocuments({
      batch: batch._id,
      status: { $ne: 'Dropped' }
    });
    if (liveEnrollments > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete batch '${batch.name}' because it has ${liveEnrollments} active, completed or waitlisted student(s). Mark them Dropped first.`
      });
    }

    await Enrollment.deleteMany({ batch: batch._id });
    await Batch.findByIdAndDelete(batch._id);

    res.status(200).json({
      success: true,
      message: `Batch '${batch.name}' deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Students enrolled in a batch, plus its waitlist
// @route   GET /api/batches/:id/students
// @access  Private (Admin only)
const getBatchStudents = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('course', 'title code durationWeeks fee');
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const enrollments = await Enrollment.find({ batch: batch._id })
      .populate('student', 'name email phone')
      .populate('statusUpdatedBy', 'name')
      .sort({ waitlistedAt: 1, enrolledAt: 1, createdAt: 1 });

    const valid = enrollments.filter((e) => e.student);
    const roster = valid.filter((e) => e.status !== 'Waitlisted');
    const waitlist = valid.filter((e) => e.status === 'Waitlisted');

    const counts = { Active: 0, Completed: 0, Dropped: 0, Waitlisted: waitlist.length };
    roster.forEach((e) => {
      counts[e.status] += 1;
    });

    res.status(200).json({
      success: true,
      data: {
        batch: batch.toMeta(),
        counts,
        students: roster,
        waitlist
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStudents
};
