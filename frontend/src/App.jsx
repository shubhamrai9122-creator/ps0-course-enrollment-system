import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { getCurrentUser } from './api/auth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import MyEnrollments from './pages/MyEnrollments';
import AdminDashboard from './pages/AdminDashboard';
import AdminCourseForm from './pages/AdminCourseForm';
import AdminBatchStudents from './pages/AdminBatchStudents';
import NotFound from './pages/NotFound';

// Read the saved user once on startup
const loadStoredUser = () => {
  try {
    const saved = localStorage.getItem('user');
    return saved && localStorage.getItem('token') ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

export default function App() {
  // Logged-in user lives here and is passed down as props
  const [user, setUser] = useState(loadStoredUser);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Re-validate a stored session with the backend (expired/forged tokens are cleared)
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    getCurrentUser()
      .then((res) => {
        localStorage.setItem('user', JSON.stringify(res.user));
        setUser(res.user);
      })
      .catch((err) => {
        if (err.status === 401) handleLogout();
      });
  }, []);

  const homePath = user?.role === 'admin' ? '/admin/dashboard' : '/';

  return (
    <div className="app-layout">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="main-content">
        <Routes>
          {/* Root dispatch: guests -> login, admins -> admin dashboard, students -> their dashboard */}
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.role === 'admin' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <StudentDashboard user={user} />
              )
            }
          />

          {/* Public Routes */}
          <Route path="/login" element={<Login user={user} onLogin={handleLogin} />} />
          <Route
            path="/register"
            element={user ? <Navigate to={homePath} replace /> : <Register onLogin={handleLogin} />}
          />

          {/* Shared Routes (student + admin) */}
          <Route
            path="/courses"
            element={
              <ProtectedRoute user={user}>
                <Courses user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute user={user}>
                <CourseDetails user={user} />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/my-enrollments"
            element={
              <ProtectedRoute user={user} role="student">
                <MyEnrollments user={user} />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/new"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminCourseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:id/edit"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminCourseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batches/:id/students"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminBatchStudents />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFound user={user} />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="container">
          Course Enrollment &amp; Batch Management System &bull; PS0 Training Institute Portal
        </div>
      </footer>
    </div>
  );
}
