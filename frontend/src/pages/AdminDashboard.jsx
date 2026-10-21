import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../api/dashboard';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import { formatDate, formatDateTime, pluralize } from '../utils/format';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAdminDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load administrator dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="container loading-container">Loading admin metrics...</div>;
  }

  const { summary, mostPopularCourse, activeBatches, courseWiseStats, recentEnrollments } = data || {};

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administrator Dashboard</h1>
          <p className="page-subtitle">Courses, batches, seats and enrollments across the institute</p>
        </div>
        <div className="btn-group">
          <Link to="/admin/courses/new" className="btn btn-primary">
            + Add Course
          </Link>
          <Link to="/courses" className="btn btn-secondary">
            Manage Courses &amp; Batches
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {data && (
        <>
          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-card-label">Total Courses</div>
              <div className="metric-card-value">{summary.totalCourses}</div>
              <div className="metric-card-sub">{pluralize(summary.totalBatches, 'batch', 'batches')} in total</div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Active Batches</div>
              <div className="metric-card-value" style={{ color: '#2563eb' }}>
                {summary.activeBatches}
              </div>
              <div className="metric-card-sub">
                {summary.ongoingBatches} ongoing &bull; {summary.upcomingBatches} upcoming
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Total Enrollments</div>
              <div className="metric-card-value" style={{ color: '#16a34a' }}>
                {summary.totalEnrollments}
              </div>
              <div className="metric-card-sub">
                {summary.activeEnrollments} active &bull; {summary.completedEnrollments} completed &bull;{' '}
                {summary.droppedEnrollments} dropped
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Most Popular Course</div>
              {mostPopularCourse ? (
                <>
                  <div className="metric-card-value metric-card-value-text">
                    <Link to={`/courses/${mostPopularCourse.courseId}`}>{mostPopularCourse.title}</Link>
                  </div>
                  <div className="metric-card-sub">
                    {pluralize(mostPopularCourse.enrollments, 'enrollment')} &bull; {mostPopularCourse.code}
                  </div>
                </>
              ) : (
                <>
                  <div className="metric-card-value metric-card-value-text">&mdash;</div>
                  <div className="metric-card-sub">No enrollments yet</div>
                </>
              )}
            </div>
          </div>

          <div className="metrics-strip">
            <span>
              <strong>{summary.totalStudents}</strong> registered students
            </span>
            <span>
              <strong>{summary.waitlistedStudents}</strong> on waitlists
            </span>
          </div>

          <div className="two-col-grid">
            {/* Course-wise enrollments */}
            <div className="card">
              <h2 className="card-title">Course-wise Enrollments</h2>
              {courseWiseStats.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Batches</th>
                        <th>Enrolled</th>
                        <th>Seats Filled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseWiseStats.map((c) => {
                        const pct = c.totalSeats > 0 ? Math.round((c.seatsFilled / c.totalSeats) * 100) : 0;
                        return (
                          <tr key={c.courseId}>
                            <td>
                              <Link to={`/courses/${c.courseId}`}>
                                <strong>{c.title}</strong>
                              </Link>
                              <div className="cell-sub">{c.code}</div>
                            </td>
                            <td>
                              {c.activeBatchCount}/{c.batchCount}
                              <div className="cell-sub">active</div>
                            </td>
                            <td>
                              <strong>{c.enrollments}</strong>
                            </td>
                            <td style={{ minWidth: '120px' }}>
                              <span className="cell-sub">
                                {c.seatsFilled}/{c.totalSeats} ({pct}%)
                              </span>
                              <div className="seat-bar" aria-hidden="true">
                                <div
                                  className={`seat-bar-fill ${pct >= 100 ? 'full' : pct >= 80 ? 'warn' : ''}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-title">No courses yet</div>
                  <div className="empty-state-desc">Create a course to start tracking enrollments.</div>
                  <Link to="/admin/courses/new" className="btn btn-primary btn-sm">
                    Add Course
                  </Link>
                </div>
              )}
            </div>

            {/* Active batches */}
            <div className="card">
              <h2 className="card-title">Active Batches ({activeBatches.length})</h2>
              {activeBatches.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Starts</th>
                        <th>Status</th>
                        <th>Seats Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeBatches.map((b) => (
                        <tr key={b._id}>
                          <td>
                            <Link to={`/admin/batches/${b._id}/students`}>
                              <strong>{b.name}</strong>
                            </Link>
                            <div className="cell-sub">
                              {b.course?.code} &bull; {b.mode}
                            </div>
                          </td>
                          <td>{formatDate(b.startDate)}</td>
                          <td>
                            <Badge status={b.phase} />
                          </td>
                          <td>
                            {b.isFull ? (
                              <Badge status="Full" />
                            ) : (
                              <span>
                                <strong>{b.seatsLeft}</strong> / {b.totalSeats}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-title">No ongoing or upcoming batches</div>
                  <div className="empty-state-desc">Open a course and add a batch with a future start date.</div>
                </div>
              )}
            </div>
          </div>

          {/* Recent enrollments */}
          <div className="card">
            <h2 className="card-title">Recent Enrollment Activity</h2>
            {recentEnrollments.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Batch</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEnrollments.map((e) => (
                      <tr key={e._id}>
                        <td>
                          <strong>{e.student.name}</strong>
                          <div className="cell-sub">{e.student.email}</div>
                        </td>
                        <td>
                          {e.course.title}
                          <div className="cell-sub">{e.course.code}</div>
                        </td>
                        <td>
                          {e.batch.name}
                          <div className="cell-sub">{e.batch.mode}</div>
                        </td>
                        <td>
                          <Badge status={e.status} />
                        </td>
                        <td className="cell-sub">{formatDateTime(e.updatedAt)}</td>
                        <td>
                          <Link to={`/admin/batches/${e.batch._id}/students`} className="btn btn-secondary btn-sm">
                            View Batch
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No enrollments recorded yet.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
