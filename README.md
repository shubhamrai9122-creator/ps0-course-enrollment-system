# Course Enrollment & Batch Management System (PS0)

A MERN-stack web application for a training institute to manage its **courses**, the **batches** running under each course, and **student enrollments**, with seat limits, duplicate-enrollment protection and an automatic **waitlist**. It is the next step after the class Student Admin project.

| Domain | Users | Models |
| :--- | :--- | :--- |
| Education / Training Institute | Student, Admin | User, Course, Batch, Enrollment |

---

## Live URL

| Part | URL |
| :--- | :--- |
| Frontend (Vercel) | _add your Vercel URL here after deploying_ |
| Backend API (Render) | _add your Render URL here after deploying_ |

Deployment takes about 10 minutes: see [Deployment](#deployment).

## Test Logins

| Role | Email | Password | What you will see |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@institute.com` | `AdminPassword@123` | Dashboard, course CRUD, batch CRUD, batch rosters, status changes |
| **Student** | `aarav.sharma@student.com` | `StudentPassword@123` | 3 active enrollments + 1 completed course |
| **Student (waitlisted)** | `diya.patel@student.com` | `StudentPassword@123` | #1 on the waitlist of the full *FSWD Weekend Batch* |

All 12 seeded students use the password `StudentPassword@123`. The login page has one-click buttons that fill these accounts.

---

## Problem Statement

Institutes that run several courses, each with multiple batches (weekday/weekend, online/offline), usually track admissions in spreadsheets. That leads to over-filled batches, the same student being admitted to the same course twice, no clear view of seats left, and no fair way to handle students who want a full batch.

This project solves it with one system that has:

1. **Admin portal**: manage the course catalogue and the batches under every course, see each batch's roster, mark every enrollment Active / Completed / Dropped, and track the institute on a live dashboard.
2. **Student portal**: browse and search courses, open a course to see its batches with seats left, enroll in a batch (or join its waitlist when it is full), and follow everything on *My Enrollments*.

Every business rule is enforced by the **backend**, not just hidden in React.

---

## Features

### Authentication & Roles
- Register / login with **JWT** (7-day token) and **bcrypt**-hashed passwords (`passwordHash` is never returned by the API).
- Public registration always creates a **student**; admins are created by the seed or by `npm run create-admin`.
- `authHandler` middleware verifies the token and loads the user; `allowRoles('admin')` / `allowRoles('student')` guards every protected route.
- Frontend `ProtectedRoute` redirects with `<Navigate>` when the user is not logged in (back to the page they wanted after login) or has the wrong role. The navbar shows different links per role.

### Courses (Admin CRUD)
- Fields: **title, course code (unique), duration in weeks, fee, description**.
- One shared `CourseForm` component is used for both **Add** and **Edit**.
- A course can only be deleted when nobody is active, completed or waitlisted in it (409 otherwise).

### Batches (Admin CRUD, under a course)
- Fields: **batch name, start date, timing, mode (Online/Offline), total seats**.
- One shared `BatchForm` component is used for both **Add** and **Edit**, right on the course page.
- Batch names are unique within a course. Seats can never be reduced below the seats already filled.
- Each batch shows its computed end date (start + duration) and phase: **Upcoming / Ongoing / Ended**.

### Students: Browse, Search & Enroll
- Course catalogue with search (title, code, description) and sorting. Search and sort live in the URL with `useSearchParams` (e.g. `/courses?search=python&sort=fee_asc`).
- Course page (`/courses/:id`, read with `useParams`) lists every batch with **seats left** and a fill bar.
- **Enroll** in a batch, or **Join Waitlist** when it is full. *My Enrollments* has a status filter (also kept in the URL) and lets students drop an enrollment or leave a waitlist.

### Business Rules (enforced on the backend)
- **No over-filling**: seats are taken with an atomic conditional update (`seatsFilled < totalSeats`), so two students can never get the last seat at the same time. Tested with 20 simultaneous requests on a 3-seat batch: exactly 3 enrolled, 17 waitlisted.
- **No enrolling in the same course twice**: unique compound index `{ student, course }` on Enrollment, plus a friendly 409 message. A student who dropped a course may enroll again (the same record is reused).
- **No enrolling in a batch that has already ended.**
- **Seats left** are shown on every batch, everywhere.

### Admin: Batch Roster & Status
- `/admin/batches/:id/students` shows every enrolled student with phone and email, and a one-click **Active / Completed / Dropped** toggle per student.
- Marking a student **Dropped** frees the seat; re-activating a dropped student needs a free seat (409 if the batch is full).

### Stretch Goal: Waitlist with Auto-Enroll ✅
- When a batch is full, a student can join its **waitlist** (first come, first served, position shown to the student).
- As soon as a seat frees up (a student is dropped, drops out, or the admin adds seats), the **first waitlisted student is enrolled automatically**.
- The admin can also enroll a waitlisted student directly or remove them from the waitlist.

### Dashboards
- **Admin**: total courses, active batches (ongoing + upcoming), total enrollments (with active / completed / dropped split), **most popular course**, course-wise enrollment table with seat fill, active batches with seats left, and recent enrollment activity.
- **Student**: active / completed / waitlisted counts, current batches, total course fees and recent activity.

### UX
- Every list page has **loading, error and empty states**; every form shows **server error messages** (e.g. duplicate course code).
- Responsive layout down to phone width; tables scroll inside their card.
- `*` route renders a 404 page.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 18 (Vite, client-side rendering) + react-router-dom v6 |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (`jsonwebtoken`) with bcrypt-hashed passwords (`bcryptjs`) |
| Styling | Plain CSS (`src/index.css`) |

---

## Project Structure

```
.
├── backend/
│   ├── config/
│   │   └── db.js                    # Mongoose connection (reads MONGO_URI)
│   ├── controllers/
│   │   ├── authController.js        # register, login, me
│   │   ├── courseController.js      # course CRUD + search
│   │   ├── batchController.js       # batch CRUD + batch roster
│   │   ├── enrollmentController.js  # enroll, waitlist, drop, status changes
│   │   └── dashboardController.js   # admin & student dashboards
│   ├── middleware/
│   │   ├── authHandler.js           # authHandler (JWT verify) + allowRoles()
│   │   └── errorHandler.js          # notFound + centralized errorHandler
│   ├── models/
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Batch.js                 # atomic reserveSeat / releaseSeat
│   │   └── Enrollment.js            # unique {student, course}, waitlist promotion
│   ├── routes/                      # one route file per resource
│   │   ├── authRoutes.js            # /api/auth
│   │   ├── courseRoutes.js          # /api/courses
│   │   ├── batchRoutes.js           # /api/batches
│   │   ├── enrollmentRoutes.js      # /api/enrollments
│   │   └── dashboardRoutes.js       # /api/dashboard
│   ├── scripts/
│   │   ├── seed.js                  # sample data (idempotent, --reset to wipe)
│   │   ├── test-backend.js          # 52 integration tests
│   │   ├── create-admin.js
│   │   └── make-admin.js
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── public/_redirects            # Netlify SPA rewrite
│   ├── src/
│   │   ├── api/                     # every fetch call lives here
│   │   │   ├── client.js            # base URL from VITE_API_URL + JWT header
│   │   │   ├── auth.js  courses.js  batches.js  enrollments.js  dashboard.js
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # NavLink per role
│   │   │   ├── ProtectedRoute.jsx   # <Navigate> on missing login / wrong role
│   │   │   ├── CourseForm.jsx       # shared Add/Edit course form
│   │   │   ├── BatchForm.jsx        # shared Add/Edit batch form
│   │   │   ├── Alert.jsx  Badge.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx  Register.jsx  NotFound.jsx
│   │   │   ├── StudentDashboard.jsx  Courses.jsx  CourseDetails.jsx  MyEnrollments.jsx
│   │   │   ├── AdminDashboard.jsx  AdminCourseForm.jsx  AdminBatchStudents.jsx
│   │   ├── utils/format.js          # date / currency helpers
│   │   ├── App.jsx                  # all <Routes>, logged-in user in useState
│   │   ├── main.jsx                 # BrowserRouter
│   │   └── index.css
│   ├── vercel.json                  # Vercel SPA rewrite
│   └── .env.example
├── docs/screenshots/
├── render.yaml                      # Render blueprint for the backend
└── package.json                     # convenience scripts
```

### Frontend Routes

| Path | Access | Page |
| :--- | :--- | :--- |
| `/` | Logged in | Student dashboard (admins are sent to `/admin/dashboard`, guests to `/login`) |
| `/login`, `/register` | Public | Sign in / student registration |
| `/courses` | Logged in | Browse & search courses (admins also edit/delete here) |
| `/courses/:id` | Logged in | Course details + batches; students enroll, admins manage batches |
| `/my-enrollments` | Student | All of the student's enrollments |
| `/admin/dashboard` | Admin | Institute dashboard |
| `/admin/courses/new` | Admin | Add course |
| `/admin/courses/:id/edit` | Admin | Edit course |
| `/admin/batches/:id/students` | Admin | Batch roster, status toggles and waitlist |
| `*` | Anyone | 404 page |

---

## Setup (Local)

**Prerequisites:** Node.js 18+ and a MongoDB database (a free MongoDB Atlas cluster or a local `mongod`).

```bash
# 1. Clone
git clone https://github.com/shubhamrai9122-creator/ps0-course-enrollment-system.git
cd ps0-course-enrollment-system

# 2. Backend
cd backend
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm install
npm run seed                # sample admin, 12 students, 10 courses, 15 batches, 44 enrollments
npm run dev                 # http://localhost:5001

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5001/api
npm install
npm run dev                 # http://localhost:5173
```

Run the backend integration tests (uses the database in `backend/.env` and cleans up after itself):

```bash
cd backend && npm test
```

`npm run seed -- --reset` wipes the users, courses, batches and enrollments collections and seeds them again.

---

## Environment Variables

### `backend/.env`

| Variable | Required | Example | Purpose |
| :--- | :--- | :--- | :--- |
| `MONGO_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/course_enrollment_db` | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | a long random string | Signs login tokens |
| `PORT` | Yes | `5001` | API port (Render sets this automatically) |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed frontend origin(s) for CORS, comma separated |
| `NODE_ENV` | No | `development` / `production` | Adds stack traces to errors in development |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | No | | Override the seeded admin account |

### `frontend/.env`

| Variable | Required | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Yes | `http://localhost:5001/api` (production: `https://<your-api>.onrender.com/api`) |

`.env` files are git-ignored; only the `.env.example` templates are committed.

---

## API Endpoints

All responses are JSON: `{ success, message?, data? }`. Protected routes need `Authorization: Bearer <token>`.

### Auth: `/api/auth`
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Public | Register a student (`name, email, phone, password`) |
| POST | `/api/auth/login` | Public | Log in, returns `token` and `user` |
| GET | `/api/auth/me` | Logged in | Current user profile |

### Courses: `/api/courses`
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/courses?search=&sort=` | Logged in | List/search courses with batch count and seats left. `sort`: `title`, `fee_asc`, `fee_desc`, `duration`, `newest` |
| GET | `/api/courses/:id` | Logged in | Course + its batches (seats left, phase). Students also get `myEnrollment` |
| POST | `/api/courses` | Admin | Create course |
| PUT | `/api/courses/:id` | Admin | Update course |
| DELETE | `/api/courses/:id` | Admin | Delete course and its batches (409 if anyone is enrolled) |

### Batches: `/api/batches`
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/batches?course=:courseId` | Logged in | List batches (optionally for one course) |
| GET | `/api/batches/:id` | Logged in | Single batch |
| GET | `/api/batches/:id/students` | Admin | Batch roster + waitlist + status counts |
| POST | `/api/batches` | Admin | Create batch (`course, name, startDate, timing, mode, totalSeats`) |
| PUT | `/api/batches/:id` | Admin | Update batch (seats can't go below seats filled; extra seats auto-enroll the waitlist) |
| DELETE | `/api/batches/:id` | Admin | Delete batch (409 if anyone is enrolled or waitlisted) |

### Enrollments: `/api/enrollments`
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/enrollments` | Student | Enroll in `{ batchId }`. Full batch: 409, or join the waitlist with `{ batchId, joinWaitlist: true }` |
| GET | `/api/enrollments/my` | Student | The student's enrollments (with waitlist position) |
| GET | `/api/enrollments?status=&course=&batch=` | Admin | All enrollments with filters |
| PATCH | `/api/enrollments/:id/drop` | Owner student / Admin | Drop an active enrollment or leave the waitlist |
| PATCH | `/api/enrollments/:id/status` | Admin | Set `{ status: "Active" \| "Completed" \| "Dropped" }` |

### Dashboard: `/api/dashboard`
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/dashboard/admin` | Admin | Total courses, active batches, total enrollments, most popular course, tables |
| GET | `/api/dashboard/student` | Student | Student counts, current batches, recent activity |

### Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/` | API info |
| GET | `/api/health` | Health check |

### Status Codes Used
`200` OK · `201` Created · `400` validation error / bad id / malformed JSON · `401` missing, invalid or expired token · `403` wrong role or not your record · `404` not found · `409` duplicate code/email, already enrolled, batch full, conflicting update · `500` server error.

---

## Screenshots

| Login | Student dashboard |
| :---: | :---: |
| ![Login](docs/screenshots/01-login.png) | ![Student dashboard](docs/screenshots/02-student-dashboard.png) |
| **Browse & search courses** | **Course batches, seats left & waitlist** |
| ![Browse courses](docs/screenshots/03-browse-courses.png) | ![Course batches](docs/screenshots/04-course-batches-waitlist.png) |
| **My Enrollments** | **Admin dashboard** |
| ![My enrollments](docs/screenshots/05-my-enrollments.png) | ![Admin dashboard](docs/screenshots/06-admin-dashboard.png) |
| **Batch roster & status (admin)** | **Shared Add/Edit course form** |
| ![Batch students](docs/screenshots/07-batch-students.png) | ![Course form](docs/screenshots/08-course-form.png) |

---

## Deployment

### 1. MongoDB Atlas
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. *Database Access*: add a database user. *Network Access*: allow `0.0.0.0/0` (Render's IPs change).
3. Copy the connection string and add the database name, e.g. `.../course_enrollment_db?retryWrites=true&w=majority`.

### 2. Backend on Render
1. Render dashboard → **New → Blueprint** → select this repository (it reads `render.yaml`), *or* **New → Web Service** with root directory `backend`, build `npm install`, start `npm start`.
2. Set `MONGO_URI` (Atlas string) and `CLIENT_URL` (your Vercel URL, set after step 3). `JWT_SECRET` is generated automatically; `PORT` is provided by Render.
3. Seed the Atlas database once from your machine: put the Atlas `MONGO_URI` in `backend/.env` and run `npm run seed`.

### 3. Frontend on Vercel
1. Vercel → **Add New Project** → import this repository, set **Root Directory** to `frontend` (framework: Vite).
2. Add the environment variable `VITE_API_URL=https://<your-render-service>.onrender.com/api` and deploy.
3. `frontend/vercel.json` rewrites every path to `index.html`, so refreshing `/courses/123` does not 404 (Netlify users get the same from `public/_redirects`).
4. Copy the Vercel URL into Render's `CLIENT_URL` and redeploy the backend so CORS allows it.
5. Put both URLs in the **Live URL** table at the top of this README.
