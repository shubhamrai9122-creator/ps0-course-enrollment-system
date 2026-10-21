import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStudentDashboard } from '../api/dashboard';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import { formatCurrency, formatDate } from '../utils/format';

export default function StudentDashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getStudentDashboard();
      setDashboardData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load your dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="container loading-container">Loading your dashboard...</div>;
  }

  const { profile, counts, totalCourseFees, currentBatches, recentEnrollments } = dashboardData || {};

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {profile?.name || user?.name}</h1>
          <p className="page-subtitle">
            {profile?.email || user?.email}
            {profile?.phone && <> &bull; {profile.phone}</>}
          </p>
        </div>
        <Link to="/courses" className="btn btn-primary">
          + Browse &amp; Enroll
        </Link>
      </div>

      {error && (
        <div className="alert alert-error alert-row">
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboard}>
            Retry
          </button>
        </div>
      )}

      {dashboardData && (
        <>
          {/* Summary Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-card-label">Active Enrollments</div>
              <div className="metric-card-value" style={{ color: '#2563eb' }}>
                {counts?.active || 0}
              </div>
              <div className="metric-card-sub">Courses you are attending</div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Completed</div>
              <div className="metric-card-value" style={{ color: '#16a34a' }}>
                {counts?.completed || 0}
              </div>
              <div className="metric-card-sub">Courses finished</div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">On Waitlist</div>
              <div className="metric-card-value" style={{ color: '#d97706' }}>
                {counts?.waitlisted || 0}
              </div>
              <div className="metric-card-sub">Waiting for a free seat</div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Course Fees</div>
              <div className="metric-card-value">{formatCurrency(totalCourseFees || 0)}</div>
              <div className="metric-card-sub">For active &amp; completed courses</div>
            </div>
          </div>

          {/* Current batches */}
          <div className="card">
            <h2 className="card-title">My Current Batches</h2>
            {currentBatches && currentBatches.length > 0 ? (
              <div className="balance-grid">
                {currentBatches.map((b) => (
                  <Link key={b.enrollmentId} to={`/courses/${b.courseId}`} className="balance-card balance-card-link">
                    <div className="balance-card-title">{b.courseTitle}</div>
                    <div className="balance-card-days">
                      <span className="balance-card-batch">{b.batchName}</span>
                    </div>
                    <div className="balance-card-used">{b.timing}</div>
                    <div className="balance-card-tags">
                      <Badge status={b.mode} />
                      <Badge status={b.phase} />
                      <span className="cell-sub">
                        {b.phase === 'Upcoming' ? 'Starts' : 'Started'} {formatDate(b.startDate)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">No active batches</div>
                <div className="empty-state-desc">Pick a course and enroll in one of its batches to get started.</div>
                <Link to="/courses" className="btn btn-primary btn-sm">
                  Browse Courses
                </Link>
              </div>
            )}
          </div>

          {/* Recent enrollments */}
          <div className="card">
            <div className="card-header-row">
              <h2>Recent Enrollment Activity</h2>
              <Link to="/my-enrollments" style={{ fontSize: '13px' }}>
                View All Enrollments &rarr;
              </Link>
            </div>

            {recentEnrollments && recentEnrollments.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Batch</th>
                      <th>Mode</th>
                      <th>Start Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEnrollments.map((e) => (
                      <tr key={e._id}>
                        <td>
                          <strong>{e.course?.title}</strong>
                          <div className="cell-sub">{e.course?.code}</div>
                        </td>
                        <td>{e.batch?.name}</td>
                        <td>
                          <Badge status={e.batch?.mode} />
                        </td>
                        <td>{formatDate(e.batch?.startDate)}</td>
                        <td>
                          <Badge status={e.status} />
                        </td>
                        <td>
                          <Link to={`/courses/${e.course?._id}`} className="btn btn-secondary btn-sm">
                            View Course
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">No enrollments yet</div>
                <div className="empty-state-desc">You have not enrolled in any course yet.</div>
                <Link to="/courses" className="btn btn-primary btn-sm">
                  Enroll Now
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
