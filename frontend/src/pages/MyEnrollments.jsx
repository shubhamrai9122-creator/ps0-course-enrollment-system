import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMyEnrollments, dropEnrollment } from '../api/enrollments';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import { formatDate, formatDateTime } from '../utils/format';

const STATUSES = ['Active', 'Waitlisted', 'Completed', 'Dropped'];

export default function MyEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Status filter is kept in the URL: /my-enrollments?status=Active
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = STATUSES.includes(searchParams.get('status')) ? searchParams.get('status') : 'ALL';

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getMyEnrollments();
      setEnrollments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleFilterChange = (value) => {
    setSearchParams(value === 'ALL' ? {} : { status: value });
  };

  const handleDrop = async (enrollment) => {
    const isWaitlisted = enrollment.status === 'Waitlisted';
    const question = isWaitlisted
      ? `Leave the waitlist for ${enrollment.course.title} (${enrollment.batch.name})?`
      : `Drop your enrollment in ${enrollment.course.title} (${enrollment.batch.name})? Your seat will go to the next student on the waitlist.`;
    if (!window.confirm(question)) return;

    try {
      setError('');
      setSuccess('');
      const res = await dropEnrollment(enrollment._id);
      setSuccess(res.message || 'Enrollment updated');
      fetchEnrollments();
    } catch (err) {
      setError(err.message || 'Failed to update enrollment');
    }
  };

  const countFor = (status) => enrollments.filter((e) => e.status === status).length;
  const filtered = statusFilter === 'ALL' ? enrollments : enrollments.filter((e) => e.status === statusFilter);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Enrollments</h1>
          <p className="page-subtitle">Every course you have enrolled in, completed, dropped or are waiting for</p>
        </div>
        <Link to="/courses" className="btn btn-primary">
          + Enroll in a Course
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Filter Bar */}
      <div className="filter-bar">
        <label htmlFor="statusFilter" style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          Filter by Status:
        </label>
        <select
          id="statusFilter"
          className="form-select"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          <option value="ALL">All Enrollments ({enrollments.length})</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({countFor(s)})
            </option>
          ))}
        </select>
        {statusFilter !== 'ALL' && (
          <button className="btn btn-secondary btn-sm" onClick={() => handleFilterChange('ALL')}>
            Clear Filter
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container">Loading your enrollments...</div>
        ) : filtered.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Start Date</th>
                  <th>Timing</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((enrollment) => (
                  <tr key={enrollment._id}>
                    <td>
                      <strong>{enrollment.course.title}</strong>
                      <div className="cell-sub">{enrollment.course.code}</div>
                    </td>
                    <td>
                      {enrollment.batch.name}
                      <div className="cell-sub">
                        <Badge status={enrollment.batch.phase} />
                      </div>
                    </td>
                    <td>{formatDate(enrollment.batch.startDate)}</td>
                    <td>{enrollment.batch.timing}</td>
                    <td>
                      <Badge status={enrollment.batch.mode} />
                    </td>
                    <td>
                      <Badge status={enrollment.status} />
                      {enrollment.status === 'Waitlisted' && (
                        <div className="cell-sub">Position #{enrollment.waitlistPosition}</div>
                      )}
                    </td>
                    <td className="cell-sub">{formatDateTime(enrollment.statusUpdatedAt || enrollment.updatedAt)}</td>
                    <td>
                      <div className="btn-group">
                        <Link to={`/courses/${enrollment.course._id}`} className="btn btn-secondary btn-sm">
                          View Course
                        </Link>
                        {['Active', 'Waitlisted'].includes(enrollment.status) && (
                          <button onClick={() => handleDrop(enrollment)} className="btn btn-danger btn-sm">
                            {enrollment.status === 'Waitlisted' ? 'Leave Waitlist' : 'Drop'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No enrollments found</div>
            <div className="empty-state-desc">
              {statusFilter === 'ALL'
                ? "You haven't enrolled in any course yet."
                : `You have no enrollments with status '${statusFilter}'.`}
            </div>
            {statusFilter === 'ALL' ? (
              <Link to="/courses" className="btn btn-primary btn-sm">
                Browse Courses
              </Link>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => handleFilterChange('ALL')}>
                Show All
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
