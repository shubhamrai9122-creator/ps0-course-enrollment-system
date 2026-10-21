const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const batchRoutes = require('./routes/batchRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middleware: CORS for the deployed frontend URL(s) in CLIENT_URL (comma separated).
// Trailing slashes are normalized so "https://app.vercel.app/" also matches.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        return callback(null, true);
      }
      const error = new Error(`CORS policy: origin '${origin}' is not allowed`);
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Middleware: Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Informational Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Course Enrollment & Batch Management System (PS0) API is running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      courses: '/api/courses',
      batches: '/api/batches',
      enrollments: '/api/enrollments',
      dashboard: '/api/dashboard'
    }
  });
});

// Health Check Endpoints (available at both /api/health and /health)
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Course Enrollment & Batch Management System (PS0)',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthCheck);
app.get('/health', healthCheck);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Connect to Database first, then start listening
const startServer = async () => {
  const PORT = process.env.PORT;
  if (!PORT) {
    console.error('[Server Error] PORT is not defined in environment variables (see backend/.env.example)');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('[Server Error] JWT_SECRET is not defined in environment variables (see backend/.env.example)');
    process.exit(1);
  }

  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] PS0 Course Enrollment API running on port ${PORT}`);
    console.log(`[Server] Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Allowed frontend origin(s): ${allowedOrigins.join(', ') || '(none set in CLIENT_URL)'}`);
  });
};

// Start server if run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
