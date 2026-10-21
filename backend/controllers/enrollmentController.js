const Enrollment = require('../models/Enrollment');
const Batch = require('../models/Batch');
const { SEAT_STATUSES } = require('../models/Enrollment');
const { getBatchPhase } = require('../models/Batch');

const ADMIN_STATUSES = ['Active', 'Completed', 'Dropped'];

// Populate an enrollment query/document with student, course and batch details
const withDetails = (query) =>
  query
    .populate('student', 'name email phone')
    .populate('course', 'title code durationWeeks fee')
    .populate('batch', 'name startDate timing mode totalSeats seatsFilled')
    .populate('statusUpdatedBy', 'name');

// Plain object with batch phase and waitlist position added
const toResponse = async (enrollment) => {
  const obj = enrollment.toObject();
  if (enrollment.batch && enrollment.course) {
    obj.batch.phase = getBatchPhase(enrollment.batch.startDate, enrollment.course.durationWeeks);
    obj.batch.seatsLeft = Math.max(0, enrollment.batch.totalSeats - enrollment.batch.seatsFilled);
  }
  obj.waitlistPosition = await Enrollment.getWaitlistPosition(enrollment);
  return obj;
};

// @desc    Enroll the logged-in student in a batch (or join its waitlist when full)
// @route   POST /api/enrollments
// @access  Private (Student)
const enroll = async (req, res, next) => {
  try {
    const { batchId, joinWaitlist } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the batchId to enroll in'
      });
    }

    const batch = await Batch.findById(batchId).populate('course', 'title code durationWeeks');
    if (!batch || !batch.course) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    if (getBatchPhase(batch.startDate, batch.course.durationWeeks) === 'Ended') {
      return res.status(400).json({
        success: false,
        message: `Batch '${batch.name}' has already ended. Please choose an upcoming or ongoing batch.`
      });
    }

    // Rule: a student can never hold two live enrollments for the same course
    const existing = await Enrollment.findOne({
      student: req.user._id,
      course: batch.course._id
    }).populate('batch', 'name');

    if (existing && existing.status !== 'Dropped') {
      const batchName = existing.batch ? existing.batch.name : 'another batch';
      const messages = {
        Active: `You are already enrolled in ${batch.course.title} (${batchName}). A course can only be taken once.`,
        Completed: `You have already completed ${batch.course.title} (${batchName}).`,
        Waitlisted: `You are already on the waitlist for ${batch.course.title} (${batchName}). Leave that waitlist first to pick another batch.`
      };
      return res.status(409).json({
        success: false,
        message: messages[existing.status]
      });
    }

    const now = new Date();

    // Rule: never over-fill a batch. reserveSeat is atomic, so two students can't take the last seat.
    const seat = await Batch.reserveSeat(batch._id);

    if (seat) {
      const fields = {
        batch: batch._id,
        status: 'Active',
        enrolledAt: now,
        waitlistedAt: null,
        statusUpdatedBy: null,
        statusUpdatedAt: now
      };

      let enrollment;
      try {
        if (existing) {
          // Re-enrolling after a drop re-uses the same record
          enrollment = await Enrollment.findOneAndUpdate(
            { _id: existing._id, status: 'Dropped' },
            { $set: fields },
            { new: true }
          );
          if (!enrollment) {
            await Batch.releaseSeat(batch._id);
            return res.status(409).json({
              success: false,
              message: 'Your enrollment for this course was changed by another request. Please refresh and try again.'
            });
          }
        } else {
          enrollment = await Enrollment.create({
            student: req.user._id,
            course: batch.course._id,
            ...fields
          });
        }
      } catch (err) {
        // e.g. duplicate key from a double-click: give the seat back
        await Batch.releaseSeat(batch._id);
        throw err;
      }

      const populated = await withDetails(Enrollment.findById(enrollment._id));
      return res.status(201).json({
        success: true,
        message: `Enrolled in ${batch.course.title} (${batch.name}) successfully`,
        data: await toResponse(populated)
      });
    }

    // Batch is full
    if (!joinWaitlist) {
      return res.status(409).json({
        success: false,
        isFull: true,
        message: `Batch '${batch.name}' is full (0 of ${batch.totalSeats} seats left). You can join the waitlist instead.`
      });
    }

    // Stretch goal: join the waitlist
    const waitFields = {
      batch: batch._id,
      status: 'Waitlisted',
      enrolledAt: null,
      waitlistedAt: now,
      statusUpdatedBy: null,
      statusUpdatedAt: now
    };

    let waitEntry;
    if (existing) {
      waitEntry = await Enrollment.findOneAndUpdate(
        { _id: existing._id, status: 'Dropped' },
        { $set: waitFields },
        { new: true }
      );
      if (!waitEntry) {
        return res.status(409).json({
          success: false,
          message: 'Your enrollment for this course was changed by another request. Please refresh and try again.'
        });
      }
    } else {
      waitEntry = await Enrollment.create({
        student: req.user._id,
        course: batch.course._id,
        ...waitFields
      });
    }

    // A seat may have opened up between the full check and joining the queue
    await Enrollment.promoteWaitlist(batch._id);

    const populated = await withDetails(Enrollment.findById(waitEntry._id));
    const data = await toResponse(populated);

    res.status(201).json({
      success: true,
      message:
        data.status === 'Active'
          ? `A seat just opened up: you are enrolled in ${batch.course.title} (${batch.name})`
          : `Batch '${batch.name}' is full. You are #${data.waitlistPosition} on the waitlist and will be enrolled automatically when a seat frees up.`,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    All enrollments of the logged-in student
// @route   GET /api/enrollments/my
// @access  Private (Student)
const getMyEnrollments = async (req, res, next) => {
  try {
    const filter = { student: req.user._id };
    if (req.query.status && ['Active', 'Completed', 'Dropped', 'Waitlisted'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const enrollments = await withDetails(Enrollment.find(filter)).sort({ updatedAt: -1 });
    const data = await Promise.all(
      enrollments.filter((e) => e.course && e.batch).map((e) => toResponse(e))
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    All enrollments (admin), filter by ?status= ?course= ?batch=
// @route   GET /api/enrollments
// @access  Private (Admin only)
const getAllEnrollments = async (req, res, next) => {
  try {
    const { status, course, batch } = req.query;
    const filter = {};
    if (status && ['Active', 'Completed', 'Dropped', 'Waitlisted'].includes(status)) filter.status = status;
    if (course) filter.course = course;
    if (batch) filter.batch = batch;

    const enrollments = await withDetails(Enrollment.find(filter)).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Student drops their own enrollment or leaves the waitlist
// @route   PATCH /api/enrollments/:id/drop
// @access  Private (Owner student or Admin)
const dropEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (req.user.role !== 'admin' && enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you cannot change another student's enrollment"
      });
    }

    if (enrollment.status === 'Dropped') {
      return res.status(400).json({
        success: false,
        message: 'This enrollment has already been dropped'
      });
    }

    if (enrollment.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'A completed enrollment cannot be dropped'
      });
    }

    const previousStatus = enrollment.status;
    const updated = await Enrollment.findOneAndUpdate(
      { _id: enrollment._id, status: previousStatus },
      {
        $set: {
          status: 'Dropped',
          statusUpdatedBy: req.user._id,
          statusUpdatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: this enrollment was already updated by another request. Please refresh.'
      });
    }

    // Freeing an Active seat lets the next waitlisted student in
    let promoted = 0;
    if (SEAT_STATUSES.includes(previousStatus)) {
      await Batch.releaseSeat(enrollment.batch);
      promoted = await Enrollment.promoteWaitlist(enrollment.batch);
    }

    const populated = await withDetails(Enrollment.findById(updated._id));

    res.status(200).json({
      success: true,
      message:
        previousStatus === 'Waitlisted'
          ? 'You have left the waitlist'
          : `Enrollment dropped successfully${promoted ? '. The next waitlisted student has been enrolled.' : ''}`,
      data: await toResponse(populated)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin marks an enrollment Active / Completed / Dropped
// @route   PATCH /api/enrollments/:id/status
// @access  Private (Admin only)
const updateEnrollmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!ADMIN_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ADMIN_STATUSES.join(', ')}`
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const previousStatus = enrollment.status;

    if (previousStatus === status) {
      return res.status(400).json({
        success: false,
        message: `This enrollment is already marked '${status}'`
      });
    }

    if (previousStatus === 'Waitlisted' && status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'A waitlisted student cannot be marked Completed. Enroll them (Active) first.'
      });
    }

    const hadSeat = SEAT_STATUSES.includes(previousStatus);
    const needsSeat = SEAT_STATUSES.includes(status);

    // Dropped/Waitlisted -> Active/Completed needs a free seat
    let reserved = false;
    if (!hadSeat && needsSeat) {
      const seat = await Batch.reserveSeat(enrollment.batch);
      if (!seat) {
        return res.status(409).json({
          success: false,
          message: 'Cannot re-activate this enrollment: the batch is full. Drop another student or add seats first.'
        });
      }
      reserved = true;
    }

    const now = new Date();
    const setFields = {
      status,
      statusUpdatedBy: req.user._id,
      statusUpdatedAt: now
    };
    if (!hadSeat && status === 'Active') {
      setFields.enrolledAt = now;
    }

    // Atomic: only apply if nobody changed the status in between
    const updated = await Enrollment.findOneAndUpdate(
      { _id: enrollment._id, status: previousStatus },
      { $set: setFields },
      { new: true, runValidators: true }
    );

    if (!updated) {
      if (reserved) await Batch.releaseSeat(enrollment.batch);
      return res.status(409).json({
        success: false,
        message: 'Conflict: this enrollment was already updated by another request. Please refresh.'
      });
    }

    let promoted = 0;
    if (hadSeat && !needsSeat) {
      await Batch.releaseSeat(enrollment.batch);
      promoted = await Enrollment.promoteWaitlist(enrollment.batch);
    }

    const populated = await withDetails(Enrollment.findById(updated._id));

    res.status(200).json({
      success: true,
      message: `Enrollment marked ${status}${promoted ? `. ${promoted} waitlisted student(s) auto-enrolled into the freed seat.` : ''}`,
      promoted,
      data: await toResponse(populated)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enroll,
  getMyEnrollments,
  getAllEnrollments,
  dropEnrollment,
  updateEnrollmentStatus
};
