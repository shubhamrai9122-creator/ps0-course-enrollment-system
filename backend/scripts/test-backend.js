const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { app } = require('../server');
const connectDB = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');

// Helper to make HTTP request to local server
function request(server, options, postData) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token && { Authorization: `Bearer ${options.token}` }),
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (postData !== undefined) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

const runTests = async () => {
  console.log('--- STARTING BACKEND INTEGRATION TEST SUITE ---');
  await connectDB();
  await Promise.all([User.init(), Course.init(), Batch.init(), Enrollment.init()]);

  const suffix = Date.now().toString().slice(-6);
  const adminEmail = `test.admin${suffix}@institute.com`;
  const createdUserEmails = [adminEmail];
  let createdCourseId = null;

  // Dedicated admin for this run (removed at the end)
  await User.create({
    name: 'Test Administrator',
    email: adminEmail,
    role: 'admin',
    passwordHash: await User.hashPassword('AdminPassword@123')
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  console.log(`Test server running on port: ${server.address().port}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${typeof details === 'string' ? details : JSON.stringify(details)}`);
      failed++;
    }
  }

  const registerStudent = async (label) => {
    const email = `test.${label}${suffix}@student.com`;
    createdUserEmails.push(email);
    return request(
      server,
      { path: '/api/auth/register', method: 'POST' },
      { name: `Test ${label}`, email, password: 'Password@123', phone: '9123456789' }
    );
  };

  try {
    // Root & health
    const rootRes = await request(server, { path: '/' });
    assert(rootRes.status === 200 && rootRes.data.success === true, 'GET / returns 200 and API info');
    const health = await request(server, { path: '/api/health' });
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returns 200 and ok');

    // Auth
    const adminLogin = await request(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: adminEmail, password: 'AdminPassword@123' }
    );
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin login succeeds with token');
    const adminToken = adminLogin.data.token;

    const invalidLogin = await request(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: adminEmail, password: 'WrongPassword' }
    );
    assert(invalidLogin.status === 401, 'Invalid password returns 401 Unauthorized');

    const missingLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, { email: adminEmail });
    assert(missingLogin.status === 400, 'Login without password returns 400');

    const badJson = await request(server, { path: '/api/auth/login', method: 'POST' }, '{"email":');
    assert(badJson.status === 400 && typeof badJson.data === 'object', 'Malformed JSON returns 400 JSON error');

    const unauth = await request(server, { path: '/api/auth/me' });
    assert(unauth.status === 401, 'Protected route without token returns 401');

    const badToken = await request(server, { path: '/api/auth/me', token: 'not-a-real-token' });
    assert(badToken.status === 401, 'Protected route with a forged token returns 401');

    const regA = await registerStudent('alpha');
    assert(regA.status === 201 && regA.data.token, 'Student registration returns 201 and token');
    assert(!regA.data.user.passwordHash && regA.data.user.role === 'student', 'Registration hides password hash and forces student role');
    const studentA = regA.data.token;

    const dupReg = await request(
      server,
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Dup', email: regA.data.user.email, password: 'Password@123', phone: '9123456789' }
    );
    assert(dupReg.status === 409, 'Duplicate email registration returns 409');

    const regB = await registerStudent('beta');
    const studentB = regB.data.token;
    const regC = await registerStudent('gamma');
    const studentC = regC.data.token;

    const meRes = await request(server, { path: '/api/auth/me', token: studentA });
    assert(meRes.status === 200 && meRes.data.user.email === regA.data.user.email, 'GET /api/auth/me returns profile');

    // Course CRUD + validation
    const studentCreate = await request(
      server,
      { path: '/api/courses', method: 'POST', token: studentA },
      { title: 'Nope', code: 'NOPE1', durationWeeks: 4, fee: 100, description: 'x' }
    );
    assert(studentCreate.status === 403, 'Student creating a course returns 403 Forbidden');

    const code = `TST${suffix.slice(-4)}`;
    const createCourse = await request(
      server,
      { path: '/api/courses', method: 'POST', token: adminToken },
      { title: `Test Course ${suffix}`, code, durationWeeks: 4, fee: 5000, description: 'Integration test course' }
    );
    assert(createCourse.status === 201 && createCourse.data.data.code === code, 'Admin creates a course (201)');
    createdCourseId = createCourse.data.data._id;

    const dupCourse = await request(
      server,
      { path: '/api/courses', method: 'POST', token: adminToken },
      { title: 'Another', code: code.toLowerCase(), durationWeeks: 4, fee: 5000, description: 'dup' }
    );
    assert(dupCourse.status === 409, 'Duplicate course code returns 409 Conflict');

    const badCourse = await request(
      server,
      { path: '/api/courses', method: 'POST', token: adminToken },
      { title: 'Bad', code: 'BAD99', durationWeeks: 0, fee: 5000, description: 'bad' }
    );
    assert(badCourse.status === 400, 'Course with 0 weeks returns 400');

    const updateCourse = await request(
      server,
      { path: `/api/courses/${createdCourseId}`, method: 'PUT', token: adminToken },
      { fee: 5500 }
    );
    assert(updateCourse.status === 200 && updateCourse.data.data.fee === 5500, 'Admin updates course fee (PUT)');

    const missingCourse = await request(server, { path: '/api/courses/64b7f0000000000000000000', token: studentA });
    assert(missingCourse.status === 404, 'Unknown course id returns 404');

    const malformedId = await request(server, { path: '/api/courses/not-an-id', token: studentA });
    assert(malformedId.status === 400, 'Malformed course id returns 400');

    // Batch CRUD + validation
    const today = new Date().toISOString().slice(0, 10);
    const badMode = await request(
      server,
      { path: '/api/batches', method: 'POST', token: adminToken },
      { course: createdCourseId, name: 'Bad Mode', startDate: today, timing: '9-11', mode: 'Hybrid', totalSeats: 5 }
    );
    assert(badMode.status === 400, "Batch with mode 'Hybrid' returns 400");

    const createBatch = await request(
      server,
      { path: '/api/batches', method: 'POST', token: adminToken },
      { course: createdCourseId, name: 'Tiny Batch', startDate: today, timing: 'Mon 9-11 AM', mode: 'Online', totalSeats: 1 }
    );
    assert(createBatch.status === 201 && createBatch.data.data.seatsLeft === 1, 'Admin creates a 1-seat batch (201)');
    const batchId = createBatch.data.data._id;

    const createBatch2 = await request(
      server,
      { path: '/api/batches', method: 'POST', token: adminToken },
      { course: createdCourseId, name: 'Second Batch', startDate: today, timing: 'Tue 9-11 AM', mode: 'Offline', totalSeats: 10 }
    );
    const batch2Id = createBatch2.data.data._id;

    const dupBatch = await request(
      server,
      { path: '/api/batches', method: 'POST', token: adminToken },
      { course: createdCourseId, name: 'Tiny Batch', startDate: today, timing: 'x', mode: 'Online', totalSeats: 3 }
    );
    assert(dupBatch.status === 409, 'Duplicate batch name in the same course returns 409');

    const studentBatch = await request(
      server,
      { path: '/api/batches', method: 'POST', token: studentA },
      { course: createdCourseId, name: 'Hack', startDate: today, timing: 'x', mode: 'Online', totalSeats: 3 }
    );
    assert(studentBatch.status === 403, 'Student creating a batch returns 403');

    // Browse & search
    const search = await request(server, { path: `/api/courses?search=${code}`, token: studentA });
    assert(
      search.status === 200 && search.data.data.length === 1 && search.data.data[0].seatsLeft === 11,
      'Course search finds the course with total seats left'
    );

    // Enrollment rules
    const enrollA = await request(
      server,
      { path: '/api/enrollments', method: 'POST', token: studentA },
      { batchId }
    );
    assert(enrollA.status === 201 && enrollA.data.data.status === 'Active', 'Student A enrolls in the 1-seat batch (201 Active)');
    const enrollmentA = enrollA.data.data._id;

    const detail = await request(server, { path: `/api/courses/${createdCourseId}`, token: studentA });
    const tiny = detail.data.data.batches.find((b) => b._id === batchId);
    assert(tiny && tiny.seatsLeft === 0 && tiny.isFull, 'Course page shows 0 seats left on the full batch');
    assert(detail.data.data.myEnrollment && detail.data.data.myEnrollment.status === 'Active', 'Course page returns the student’s own enrollment');

    const twice = await request(
      server,
      { path: '/api/enrollments', method: 'POST', token: studentA },
      { batchId: batch2Id }
    );
    assert(twice.status === 409, 'Enrolling in the same course twice (other batch) returns 409');

    const full = await request(
      server,
      { path: '/api/enrollments', method: 'POST', token: studentB },
      { batchId }
    );
    assert(full.status === 409 && full.data.isFull === true, 'Enrolling in a full batch returns 409');

    const waitB = await request(
      server,
      { path: '/api/enrollments', method: 'POST', token: studentB },
      { batchId, joinWaitlist: true }
    );
    assert(
      waitB.status === 201 && waitB.data.data.status === 'Waitlisted' && waitB.data.data.waitlistPosition === 1,
      'Student B joins the waitlist at position #1'
    );
    const enrollmentB = waitB.data.data._id;

    const waitC = await request(
      server,
      { path: '/api/enrollments', method: 'POST', token: studentC },
      { batchId, joinWaitlist: true }
    );
    assert(waitC.status === 201 && waitC.data.data.waitlistPosition === 2, 'Student C joins the waitlist at position #2');
    const enrollmentC = waitC.data.data._id;

    const roster = await request(server, { path: `/api/batches/${batchId}/students`, token: adminToken });
    assert(
      roster.status === 200 && roster.data.data.students.length === 1 && roster.data.data.waitlist.length === 2,
      'Admin sees 1 enrolled student and 2 waitlisted for the batch'
    );

    const studentRoster = await request(server, { path: `/api/batches/${batchId}/students`, token: studentA });
    assert(studentRoster.status === 403, 'Student viewing a batch roster returns 403');

    const badStatus = await request(
      server,
      { path: `/api/enrollments/${enrollmentA}/status`, method: 'PATCH', token: adminToken },
      { status: 'Graduated' }
    );
    assert(badStatus.status === 400, 'Invalid enrollment status returns 400');

    const studentStatus = await request(
      server,
      { path: `/api/enrollments/${enrollmentA}/status`, method: 'PATCH', token: studentA },
      { status: 'Completed' }
    );
    assert(studentStatus.status === 403, 'Student changing enrollment status returns 403');

    const completeA = await request(
      server,
      { path: `/api/enrollments/${enrollmentA}/status`, method: 'PATCH', token: adminToken },
      { status: 'Completed' }
    );
    assert(completeA.status === 200 && completeA.data.data.status === 'Completed', 'Admin marks enrollment Completed');

    const shrink = await request(
      server,
      { path: `/api/batches/${batchId}`, method: 'PUT', token: adminToken },
      { totalSeats: 0 }
    );
    assert(shrink.status === 400, 'Batch seats below 1 returns 400');

    const dropA = await request(
      server,
      { path: `/api/enrollments/${enrollmentA}/status`, method: 'PATCH', token: adminToken },
      { status: 'Dropped' }
    );
    assert(dropA.status === 200 && dropA.data.promoted === 1, 'Admin drops A and one waitlisted student is promoted');

    const myB = await request(server, { path: '/api/enrollments/my', token: studentB });
    const bEntry = myB.data.data.find((e) => e._id === enrollmentB);
    assert(bEntry && bEntry.status === 'Active', 'Student B was auto-enrolled from the waitlist (Active)');

    const myC = await request(server, { path: '/api/enrollments/my', token: studentC });
    const cEntry = myC.data.data.find((e) => e._id === enrollmentC);
    assert(cEntry && cEntry.status === 'Waitlisted' && cEntry.waitlistPosition === 1, 'Student C moves up to waitlist #1');

    const reactivate = await request(
      server,
      { path: `/api/enrollments/${enrollmentA}/status`, method: 'PATCH', token: adminToken },
      { status: 'Active' }
    );
    assert(reactivate.status === 409, 'Re-activating a dropped student in a full batch returns 409');

    const crossDrop = await request(
      server,
      { path: `/api/enrollments/${enrollmentB}/drop`, method: 'PATCH', token: studentC }
    );
    assert(crossDrop.status === 403, "Student dropping another student's enrollment returns 403");

    const addSeats = await request(
      server,
      { path: `/api/batches/${batchId}`, method: 'PUT', token: adminToken },
      { totalSeats: 2 }
    );
    assert(addSeats.status === 200 && addSeats.data.data.seatsFilled === 2, 'Adding a seat auto-enrolls the next waitlisted student');

    const reduce = await request(
      server,
      { path: `/api/batches/${batchId}`, method: 'PUT', token: adminToken },
      { totalSeats: 1 }
    );
    assert(reduce.status === 400, 'Reducing seats below seats already filled returns 400');

    const reEnrollA = await request(
      server,
      { path: '/api/enrollments', method: 'POST', token: studentA },
      { batchId: batch2Id }
    );
    assert(reEnrollA.status === 201 && reEnrollA.data.data._id === enrollmentA, 'A dropped student can re-enroll in another batch (same record)');

    const selfDrop = await request(
      server,
      { path: `/api/enrollments/${enrollmentA}/drop`, method: 'PATCH', token: studentA }
    );
    assert(selfDrop.status === 200 && selfDrop.data.data.status === 'Dropped', 'Student drops their own enrollment');

    const deleteBusy = await request(server, { path: `/api/batches/${batchId}`, method: 'DELETE', token: adminToken });
    assert(deleteBusy.status === 409, 'Deleting a batch with enrolled students returns 409');

    // Dashboards
    const adminDash = await request(server, { path: '/api/dashboard/admin', token: adminToken });
    assert(
      adminDash.status === 200 &&
        typeof adminDash.data.data.summary.totalCourses === 'number' &&
        typeof adminDash.data.data.summary.activeBatches === 'number' &&
        typeof adminDash.data.data.summary.totalEnrollments === 'number' &&
        adminDash.data.data.mostPopularCourse !== undefined,
      'GET /api/dashboard/admin returns courses, active batches, enrollments and most popular course'
    );

    const studentDash = await request(server, { path: '/api/dashboard/student', token: studentB });
    assert(studentDash.status === 200 && studentDash.data.data.counts.active === 1, 'GET /api/dashboard/student returns counts');

    const forbiddenDash = await request(server, { path: '/api/dashboard/admin', token: studentA });
    assert(forbiddenDash.status === 403, 'Student accessing admin dashboard returns 403');

    const unknown = await request(server, { path: '/api/does-not-exist', token: adminToken });
    assert(unknown.status === 404 && unknown.data.success === false, 'Unknown API route returns 404 JSON');

    // Clean up: drop everyone, then delete the course (which removes its batches)
    for (const id of [enrollmentB, enrollmentC]) {
      await request(server, { path: `/api/enrollments/${id}/status`, method: 'PATCH', token: adminToken }, { status: 'Dropped' });
    }
    const deleteCourse = await request(
      server,
      { path: `/api/courses/${createdCourseId}`, method: 'DELETE', token: adminToken }
    );
    assert(deleteCourse.status === 200, 'Admin deletes the course once nobody is enrolled');
    createdCourseId = null;
  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    // Remove anything this run created
    if (createdCourseId) {
      await Enrollment.deleteMany({ course: createdCourseId });
      await Batch.deleteMany({ course: createdCourseId });
      await Course.deleteOne({ _id: createdCourseId });
    }
    const users = await User.find({ email: { $in: createdUserEmails } });
    await Enrollment.deleteMany({ student: { $in: users.map((u) => u._id) } });
    await User.deleteMany({ email: { $in: createdUserEmails } });

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();
