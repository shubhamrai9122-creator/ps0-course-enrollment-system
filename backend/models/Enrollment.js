const mongoose = require('mongoose');
const Batch = require('./Batch');

// Statuses that occupy a seat in the batch
const SEAT_STATUSES = ['Active', 'Completed'];

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required']
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required']
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Completed', 'Dropped', 'Waitlisted'],
        message: '{VALUE} is not a valid enrollment status'
      },
      default: 'Active'
    },
    enrolledAt: {
      type: Date,
      default: null
    },
    // Used to keep the waitlist in first-come, first-served order
    waitlistedAt: {
      type: Date,
      default: null
    },
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    statusUpdatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One enrollment record per student per course: a student can never be enrolled
// in the same course twice. A dropped record is re-used if the student enrolls again.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
// Fast lookups of a batch's roster and waitlist order
enrollmentSchema.index({ batch: 1, status: 1, waitlistedAt: 1 });

// Move waitlisted students into free seats of a batch (oldest first).
// Returns the number of students promoted.
enrollmentSchema.statics.promoteWaitlist = async function (batchId) {
  let promoted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const next = await this.findOne({ batch: batchId, status: 'Waitlisted' }).sort({
      waitlistedAt: 1,
      createdAt: 1
    });
    if (!next) break;

    const seat = await Batch.reserveSeat(batchId);
    if (!seat) break; // no free seat left

    const updated = await this.findOneAndUpdate(
      { _id: next._id, status: 'Waitlisted' },
      {
        $set: {
          status: 'Active',
          enrolledAt: new Date(),
          statusUpdatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updated) {
      // The student left the waitlist meanwhile: give the seat back and try the next one
      await Batch.releaseSeat(batchId);
      continue;
    }

    promoted += 1;
  }

  return promoted;
};

// 1-based position of a waitlisted enrollment in its batch queue
enrollmentSchema.statics.getWaitlistPosition = async function (enrollment) {
  if (!enrollment || enrollment.status !== 'Waitlisted') return null;
  const ahead = await this.countDocuments({
    batch: enrollment.batch._id || enrollment.batch,
    status: 'Waitlisted',
    waitlistedAt: { $lt: enrollment.waitlistedAt }
  });
  return ahead + 1;
};

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
module.exports.SEAT_STATUSES = SEAT_STATUSES;
