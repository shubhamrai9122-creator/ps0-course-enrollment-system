import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { loginUser } from '../api/auth';
import Alert from '../components/Alert';

export default function Login({ user, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // Go back to the page that sent the user here, else to their role's home.
  // A wrong-role "from" is bounced again by ProtectedRoute.
  const from = location.state?.from;
  const getTarget = (loggedInUser) =>
    from && from.pathname !== '/'
      ? `${from.pathname}${from.search || ''}`
      : loggedInUser.role === 'admin'
      ? '/admin/dashboard'
      : '/';

  if (user) {
    return <Navigate to={getTarget(user)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser({ email: email.trim(), password });
      onLogin(res.user, res.token);
      navigate(getTarget(res.user), { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Sign In</h1>
          <p className="auth-subtitle">Access the Course Enrollment &amp; Batch Management System</p>
        </div>

        {errorMessage && <Alert type="error" message={errorMessage} />}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="e.g. aarav.sharma@student.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-box">
          <strong>Sample Accounts (from seed):</strong>
          <div className="btn-group" style={{ marginTop: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickDemo('admin@institute.com', 'AdminPassword@123')}
            >
              Fill Admin Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickDemo('aarav.sharma@student.com', 'StudentPassword@123')}
            >
              Fill Student Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickDemo('diya.patel@student.com', 'StudentPassword@123')}
            >
              Fill Waitlisted Student
            </button>
          </div>
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}
