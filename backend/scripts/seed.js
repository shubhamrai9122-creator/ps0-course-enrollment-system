/**
 * Database Seed Script (idempotent - safe to run more than once)
 *
 * Usage:
 *   npm run seed            # upsert sample admin, students, courses, batches and enrollments
 *   npm run seed -- --reset # wipe the four collections first, then seed
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const { SEAT_STATUSES } = require('../models/Enrollment');

const DAY_MS = 24 * 60 * 60 * 1000;

// Date that is `offset` days from today, at UTC midnight
const getOffsetDate = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + offset * DAY_MS);
};

const courseDefinitions = [
  {
    title: 'Full Stack Web Development (MERN)',
    code: 'FSWD101',
    durationWeeks: 24,
    fee: 45000,
    description:
      'Build production-ready web apps with MongoDB, Express, React and Node.js. Covers REST APIs, authentication, deployment and a capstone project.'
  },
  {
    title: 'Data Structures & Algorithms in Java',
    code: 'DSA201',
    durationWeeks: 12,
    fee: 18000,
    description:
      'Arrays, linked lists, trees, graphs, dynamic programming and problem-solving patterns for coding interviews, taught in Java.'
  },
  {
    title: 'Python Programming Fundamentals',
    code: 'PY101',
    durationWeeks: 8,
    fee: 9500,
    description:
      'Start programming from zero: variables, control flow, functions, files, OOP basics and small automation projects in Python 3.'
  },
  {
    title: 'Data Science with Python',
    code: 'DS301',
    durationWeeks: 20,
    fee: 38000,
    description:
      'NumPy, Pandas, data visualisation, statistics and exploratory data analysis on real datasets, ending with a portfolio project.'
  },
  {
    title: 'Machine Learning Essentials',
    code: 'ML401',
    durationWeeks: 16,
    fee: 32000,
    description:
      'Supervised and unsupervised learning with scikit-learn: regression, classification, clustering, model evaluation and feature engineering.'
  },
  {
    title: 'UI/UX Design Fundamentals',
    code: 'UIX101',
    durationWeeks: 10,
    fee: 15000,
    description:
      'User research, wireframing, prototyping in Figma, design systems and usability testing for web and mobile products.'
  },
  {
    title: 'AWS Cloud Practitioner Bootcamp',
    code: 'CLD201',
    durationWeeks: 6,
    fee: 12000,
    description:
      'Core AWS services (EC2, S3, IAM, RDS, Lambda), pricing and security basics, with full preparation for the Cloud Practitioner exam.'
  },
  {
    title: 'Digital Marketing Mastery',
    code: 'DMK101',
    durationWeeks: 8,
    fee: 11000,
    description:
      'SEO, social media marketing, Google Ads, email campaigns and analytics, with live campaign assignments.'
  },
  {
    title: 'Android App Development with Kotlin',
    code: 'AND201',
    durationWeeks: 14,
    fee: 26000,
    description:
      'Kotlin fundamentals, Jetpack Compose UI, Room database, networking with Retrofit and publishing to the Play Store.'
  },
  {
    title: 'Cybersecurity & Ethical Hacking',
    code: 'CYB301',
    durationWeeks: 12,
    fee: 28000,
    description:
      'Networking basics, vulnerability assessment, web application security, penetration testing tools and responsible disclosure.'
  }
];

// startOffset is in days from today: negative = already started
const batchDefinitions = [
  { key: 'fswdMorning', course: 'FSWD101', name: 'FSWD Morning Batch', startOffset: -60, timing: 'Mon-Fri, 7:00 AM - 9:00 AM', mode: 'Online', totalSeats: 30 },
  { key: 'fswdWeekend', course: 'FSWD101', name: 'FSWD Weekend Batch', startOffset: 14, timing: 'Sat-Sun, 10:00 AM - 1:00 PM', mode: 'Offline', totalSeats: 4 },
  { key: 'fswdJan', course: 'FSWD101', name: 'FSWD January Batch', startOffset: -280, timing: 'Mon-Fri, 6:00 PM - 8:00 PM', mode: 'Offline', totalSeats: 25 },
  { key: 'dsaEvening', course: 'DSA201', name: 'DSA Evening Batch', startOffset: -30, timing: 'Mon, Wed, Fri, 7:00 PM - 9:00 PM', mode: 'Online', totalSeats: 40 },
  { key: 'dsaFast', course: 'DSA201', name: 'DSA Fast-Track Batch', startOffset: 21, timing: 'Tue, Thu, 8:00 PM - 10:00 PM', mode: 'Online', totalSeats: 25 },
  { key: 'pyA', course: 'PY101', name: 'Python Batch A', startOffset: -120, timing: 'Mon-Thu, 5:00 PM - 6:30 PM', mode: 'Offline', totalSeats: 20 },
  { key: 'pyB', course: 'PY101', name: 'Python Batch B', startOffset: 7, timing: 'Mon-Thu, 6:00 PM - 7:30 PM', mode: 'Online', totalSeats: 35 },
  { key: 'dsWeekday', course: 'DS301', name: 'Data Science Weekday Batch', startOffset: -45, timing: 'Tue-Fri, 7:00 PM - 9:00 PM', mode: 'Online', totalSeats: 30 },
  { key: 'mlWeekend', course: 'ML401', name: 'ML Weekend Batch', startOffset: 30, timing: 'Sat-Sun, 2:00 PM - 5:00 PM', mode: 'Offline', totalSeats: 20 },
  { key: 'uixStudio', course: 'UIX101', name: 'UI/UX Studio Batch', startOffset: -10, timing: 'Mon, Wed, Fri, 11:00 AM - 1:00 PM', mode: 'Offline', totalSeats: 15 },
  { key: 'awsNov', course: 'CLD201', name: 'AWS Bootcamp November', startOffset: 10, timing: 'Mon-Fri, 8:00 PM - 9:30 PM', mode: 'Online', totalSeats: 50 },
  { key: 'awsAug', course: 'CLD201', name: 'AWS Bootcamp August', startOffset: -75, timing: 'Mon-Fri, 8:00 PM - 9:30 PM', mode: 'Online', totalSeats: 50 },
  { key: 'dmkEvening', course: 'DMK101', name: 'Digital Marketing Evening', startOffset: -20, timing: 'Tue, Thu, 6:30 PM - 8:30 PM', mode: 'Online', totalSeats: 40 },
  { key: 'andBatch1', course: 'AND201', name: 'Android Batch 1', startOffset: 45, timing: 'Sat-Sun, 10:00 AM - 1:00 PM', mode: 'Offline', totalSeats: 20 },
  { key: 'cybAlpha', course: 'CYB301', name: 'Cyber Batch Alpha', startOffset: -5, timing: 'Mon-Wed, 4:00 PM - 6:00 PM', mode: 'Offline', totalSeats: 3 }
];

const studentDefinitions = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@student.com', phone: '9876543201' },
  { name: 'Diya Patel', email: 'diya.patel@student.com', phone: '9876543202' },
  { name: 'Rohan Verma', email: 'rohan.verma@student.com', phone: '9876543203' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@student.com', phone: '9876543204' },
  { name: 'Kabir Mehta', email: 'kabir.mehta@student.com', phone: '9876543205' },
  { name: 'Neha Gupta', email: 'neha.gupta@student.com', phone: '9876543206' },
  { name: 'Aditya Rao', email: 'aditya.rao@student.com', phone: '9876543207' },
  { name: 'Ishaan Joshi', email: 'ishaan.joshi@student.com', phone: '9876543208' },
  { name: 'Pooja Reddy', email: 'pooja.reddy@student.com', phone: '9876543209' },
  { name: 'Varun Nair', email: 'varun.nair@student.com', phone: '9876543210' },
  { name: 'Simran Kaur', email: 'simran.kaur@student.com', phone: '9876543211' },
  { name: 'Arjun Malhotra', email: 'arjun.malhotra@student.com', phone: '9876543212' }
];

// [studentIndex, batchKey, status]. Each student appears at most once per course.
const enrollmentTemplates = [
  // FSWD101 - most popular course
  [0, 'fswdMorning', 'Active'],
  [2, 'fswdMorning', 'Active'],
  [4, 'fswdMorning', 'Active'],
  [6, 'fswdMorning', 'Active'],
  [10, 'fswdMorning', 'Dropped'],
  [3, 'fswdWeekend', 'Active'],
  [5, 'fswdWeekend', 'Active'],
  [7, 'fswdWeekend', 'Active'],
  [9, 'fswdWeekend', 'Active'], // batch now full (4/4)
  [1, 'fswdWeekend', 'Waitlisted'], // waitlist #1
  [11, 'fswdWeekend', 'Waitlisted'], // waitlist #2
  [8, 'fswdJan', 'Completed'],
  // DSA201
  [0, 'dsaEvening', 'Active'],
  [1, 'dsaEvening', 'Active'],
  [3, 'dsaEvening', 'Active'],
  [11, 'dsaEvening', 'Active'],
  [7, 'dsaEvening', 'Dropped'],
  [5, 'dsaFast', 'Active'],
  [9, 'dsaFast', 'Active'],
  // PY101
  [0, 'pyA', 'Completed'],
  [2, 'pyA', 'Completed'],
  [4, 'pyA', 'Completed'],
  [6, 'pyA', 'Dropped'],
  [10, 'pyB', 'Active'],
  [8, 'pyB', 'Active'],
  // DS301
  [2, 'dsWeekday', 'Active'],
  [6, 'dsWeekday', 'Active'],
  [7, 'dsWeekday', 'Active'],
  // ML401
  [0, 'mlWeekend', 'Active'],
  [3, 'mlWeekend', 'Active'],
  // UIX101
  [1, 'uixStudio', 'Active'],
  [10, 'uixStudio', 'Active'],
  [11, 'uixStudio', 'Active'],
  // CLD201
  [4, 'awsNov', 'Active'],
  [8, 'awsNov', 'Active'],
  [5, 'awsAug', 'Completed'],
  [9, 'awsAug', 'Completed'],
  [3, 'awsAug', 'Completed'],
  // DMK101
  [6, 'dmkEvening', 'Active'],
  [11, 'dmkEvening', 'Dropped'],
  // AND201
  [2, 'andBatch1', 'Active'],
  // CYB301 - small batch that is full (3/3)
  [1, 'cybAlpha', 'Active'],
  [4, 'cybAlpha', 'Active'],
  [9, 'cybAlpha', 'Active']
];

const seedData = async () => {
  try {
    console.log('[Seed] Starting database seed process...');
    await connectDB();

    // Make sure unique indexes exist before inserting
    await Promise.all([User.init(), Course.init(), Batch.init(), Enrollment.init()]);

    if (process.argv.includes('--reset')) {
      console.log('[Seed] --reset supplied: clearing users, courses, batches and enrollments...');
      await Promise.all([
        Enrollment.deleteMany({}),
        Batch.deleteMany({}),
        Course.deleteMany({}),
        User.deleteMany({})
      ]);
    }

    // 1. Admin account
    // In production, use create-admin.js or configure ADMIN_EMAIL and ADMIN_PASSWORD
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@institute.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword@123';
    const adminDoc = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          name: process.env.ADMIN_NAME || 'Institute Administrator',
          role: 'admin',
          phone: '9876500000',
          passwordHash: await User.hashPassword(adminPassword)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    console.log(`[Seed] Admin account ready: ${adminDoc.email}`);

    // 2. Students
    const studentPasswordHash = await User.hashPassword('StudentPassword@123');
    const studentDocs = [];
    for (const def of studentDefinitions) {
      const doc = await User.findOneAndUpdate(
        { email: def.email },
        { $set: { ...def, role: 'student', passwordHash: studentPasswordHash } },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      studentDocs.push(doc);
    }
    console.log(`[Seed] Synced ${studentDocs.length} student accounts.`);

    // 3. Courses (upsert by unique code)
    const courseMap = {};
    for (const def of courseDefinitions) {
      courseMap[def.code] = await Course.findOneAndUpdate(
        { code: def.code },
        { $set: def },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
    }
    console.log(`[Seed] Synced ${Object.keys(courseMap).length} courses.`);

    // 4. Batches (upsert by course + name). Start dates are relative to today.
    const batchMap = {};
    for (const def of batchDefinitions) {
      const course = courseMap[def.course];
      batchMap[def.key] = await Batch.findOneAndUpdate(
        { course: course._id, name: def.name },
        {
          $set: {
            startDate: getOffsetDate(def.startOffset),
            timing: def.timing,
            mode: def.mode,
            totalSeats: def.totalSeats
          },
          $setOnInsert: { seatsFilled: 0 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
    }
    console.log(`[Seed] Synced ${Object.keys(batchMap).length} batches.`);

    // 5. Enrollments (only created when the student has no enrollment for that course yet)
    let created = 0;
    let waitlistOrder = 0;
    for (const [studentIndex, batchKey, status] of enrollmentTemplates) {
      const student = studentDocs[studentIndex];
      const batch = batchMap[batchKey];

      const existing = await Enrollment.findOne({ student: student._id, course: batch.course });
      if (existing) continue;

      const isWaitlisted = status === 'Waitlisted';
      waitlistOrder += isWaitlisted ? 1 : 0;

      await Enrollment.create({
        student: student._id,
        course: batch.course,
        batch: batch._id,
        status,
        // A week before the batch starts, but never in the future
        enrolledAt: isWaitlisted
          ? null
          : new Date(Math.min(batch.startDate.getTime() - 7 * DAY_MS, Date.now() - DAY_MS)),
        waitlistedAt: isWaitlisted ? new Date(Date.now() - (10 - waitlistOrder) * 60 * 1000) : null,
        statusUpdatedBy: ['Completed', 'Dropped'].includes(status) ? adminDoc._id : null,
        statusUpdatedAt: new Date()
      });
      created++;
    }
    console.log(`[Seed] Seeded ${created} new enrollments (Total defined: ${enrollmentTemplates.length}).`);

    // 6. Recalculate seatsFilled for every batch from the real enrollment records
    const allBatches = await Batch.find();
    for (const batch of allBatches) {
      const seatsFilled = await Enrollment.countDocuments({
        batch: batch._id,
        status: { $in: SEAT_STATUSES }
      });
      await Batch.updateOne({ _id: batch._id }, { $set: { seatsFilled } });
    }
    console.log('[Seed] Recalculated seats filled for all batches.');

    console.log('[Seed] Database seeding completed successfully.');
    console.log('\n--- Test logins ---');
    console.log(`  Admin:   ${adminEmail} / ${adminPassword}`);
    console.log('  Student: aarav.sharma@student.com / StudentPassword@123');
    console.log('  Student: diya.patel@student.com / StudentPassword@123 (on a waitlist)');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
