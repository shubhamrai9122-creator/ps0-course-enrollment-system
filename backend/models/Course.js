const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [120, 'Course title cannot exceed 120 characters']
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]{3,12}$/, 'Course code must be 3-12 letters, digits or hyphens (e.g. FSWD101)']
    },
    durationWeeks: {
      type: Number,
      required: [true, 'Duration in weeks is required'],
      min: [1, 'Duration must be at least 1 week'],
      max: [104, 'Duration cannot exceed 104 weeks']
    },
    fee: {
      type: Number,
      required: [true, 'Course fee is required'],
      min: [0, 'Fee cannot be negative'],
      max: [1000000, 'Fee cannot exceed 10,00,000']
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    }
  },
  {
    timestamps: true
  }
);

courseSchema.index({ title: 1 });

module.exports = mongoose.model('Course', courseSchema);
