const mongoose = require('mongoose');

const DAY_MS = 24 * 60 * 60 * 1000;

const batchSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required']
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
      maxlength: [60, 'Batch name cannot exceed 60 characters']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    timing: {
      type: String,
      required: [true, 'Batch timing is required'],
      trim: true,
      maxlength: [80, 'Timing cannot exceed 80 characters']
    },
    mode: {
      type: String,
      required: [true, 'Batch mode is required'],
      enum: {
        values: ['Online', 'Offline'],
        message: '{VALUE} is not a valid mode. Use Online or Offline'
      }
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'A batch must have at least 1 seat'],
      max: [500, 'A batch cannot have more than 500 seats']
    },
    // Number of seats taken by Active + Completed enrollments.
    // Only changed through the atomic helpers below so it never goes past totalSeats.
    seatsFilled: {
      type: Number,
      default: 0,
      min: [0, 'Seats filled cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Batch names are unique within a course
batchSchema.index({ course: 1, name: 1 }, { unique: true });

// Atomically take one seat. Returns the updated batch, or null when the batch is full.
batchSchema.statics.reserveSeat = function (batchId) {
  return this.findOneAndUpdate(
    { _id: batchId, $expr: { $lt: ['$seatsFilled', '$totalSeats'] } },
    { $inc: { seatsFilled: 1 } },
    { new: true }
  );
};

// Atomically give one seat back.
batchSchema.statics.releaseSeat = function (batchId) {
  return this.updateOne(
    { _id: batchId, seatsFilled: { $gt: 0 } },
    { $inc: { seatsFilled: -1 } }
  );
};

// Start of today in UTC (dates are stored as UTC midnight)
const startOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Last day of the batch = start + (weeks * 7) - 1 days
const getBatchEndDate = (startDate, durationWeeks) => {
  return new Date(new Date(startDate).getTime() + (durationWeeks * 7 - 1) * DAY_MS);
};

// Upcoming | Ongoing | Ended
const getBatchPhase = (startDate, durationWeeks) => {
  const today = startOfTodayUTC();
  if (today < new Date(startDate)) return 'Upcoming';
  if (today > getBatchEndDate(startDate, durationWeeks)) return 'Ended';
  return 'Ongoing';
};

// Plain object with computed fields the frontend needs (seats left, end date, phase)
batchSchema.methods.toMeta = function (durationWeeks) {
  const obj = this.toObject();
  delete obj.__v;
  const weeks = durationWeeks || (this.course && this.course.durationWeeks) || 1;
  obj.seatsLeft = Math.max(0, this.totalSeats - this.seatsFilled);
  obj.isFull = obj.seatsLeft === 0;
  obj.endDate = getBatchEndDate(this.startDate, weeks);
  obj.phase = getBatchPhase(this.startDate, weeks);
  return obj;
};

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
module.exports.getBatchEndDate = getBatchEndDate;
module.exports.getBatchPhase = getBatchPhase;
module.exports.startOfTodayUTC = startOfTodayUTC;
