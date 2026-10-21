import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBatchStudents } from '../api/batches';
import { updateEnrollmentStatus } from '../api/enrollments';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import { formatDate, formatDateTime } from '../utils/format';

const ADMIN_STATUSES = ['Active', 'Completed', 'Dropped'];

export default function AdminBatchStudents() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getBatchStudents(id);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load batch students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [id]);

  const changeStatus = async (enrollment, status) => {
    if (status === enrollment.status) return;

    if (status === 'Dropped') {
      const msg =
        enrollment.status === 'Waitlisted'
          ? `Remove ${enrollment.student.name} from the waitlist?`
          : `Mark ${enrollment.student.name} as Dropped? Their seat will go to the next student on the waitlist.`;
      if (!window.confirm(msg)) return;
    }

    try {
      setUpdatingId(enrollment._id);
      setError('');
      setSuccess('');
      const res = await updateEnrollmentStatus(enrollment._id, status);
      setSuccess(`${enrollment.student.name}: ${res.message}`);
      await fetchRoster();
    } catch (err) {
      setError(err.message || 'Failed to update enrollment status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !data) {
    return <div className="container loading-container">Loading batch students...</div>;
  }

  if (!data) {
    return (
      <div className="container" style={{ marginTop: '30px' }}>
        <Alert type="error" message={error || 'Batch not found'} />
        <Link to="/courses" className="btn btn-secondary">
          &larr; Back to Courses
        </Link>
      </div>
    );
  }

  const { batch, counts, students, waitlist } = data;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <Link to={`/courses/${batch.course._id}`} className="btn btn-secondary btn-sm" style={{ marginBottom: '8px' }}>
            &larr; {batch.course.title}
          </Link>
          <h1 className="page-title">
            {batch.name} <Badge status={batch.phase} />
          </h1>
          <p className="page-subtitle">
            {batch.course.code} &bull; Starts {formatDate(batch.startDate)} &bull; {batch.timing} &bull; {batch.mode}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchRoster} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-label">Seats</div>
          <div className="metric-card-value">
            {batch.seatsFilled}
            <span className="metric-card-of">/{batch.totalSeats}</span>
          </div>
          <div className="metric-card-sub">{batch.isFull ? 'Batch is full' : `${batch.seatsLeft} seat(s) left`}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">Active</div>
          <div className="metric-card-value" style={{ color: '#2563eb' }}>
            {counts.Active}
          </div>
          <div className="metric-card-sub">Currently attending</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">Completed</div>
          <div className="metric-card-value" style={{ color: '#16a34a' }}>
            {counts.Completed}
          </div>
          <div className="metric-card-sub">Finished the course</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">Dropped / Waitlisted</div>
          <div className="metric-card-value">
            <span style={{ color: '#64748b' }}>{counts.Dropped}</span>
            <span className="metric-card-of"> / </span>
            <span style={{ color: '#d97706' }}>{counts.Waitlisted}</span>
          </div>
          <div className="metric-card-sub">Left the batch / waiting for a seat</div>
        </div>
      </div>

      {/* Enrolled students */}
      <div className="card">
        <h2 className="card-title">Enrolled Students ({students.length})</h2>
        {students.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Phone</th>
                  <th>Enrolled On</th>
                  <th>Current Status</th>
                  <th>Mark As</th>
                </tr>
              </thead>
              <tbody>
                {students.map((e, index) => (
                  <tr key={e._id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{e.student.name}</strong>
                      <div className="cell-sub">{e.student.email}</div>
                    </td>
                    <td>{e.student.phone || '—'}</td>
                    <td className="cell-sub">{formatDateTime(e.enrolledAt || e.createdAt)}</td>
                    <td>
                      <Badge status={e.status} />
                      {e.statusUpdatedBy && (
                        <div className="cell-sub">by {e.statusUpdatedBy.name}</div>
                      )}
                    </td>
                    <td>
                      <div className="status-toggle" role="group" aria-label={`Status for ${e.student.name}`}>
                        {ADMIN_STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`toggle-btn ${e.status === s ? `toggle-on-${s.toLowerCase()}` : ''}`}
                            onClick={() => changeStatus(e, s)}
                            disabled={updatingId === e._id || e.status === s}
                            aria-pressed={e.status === s}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No students enrolled yet</div>
            <div className="empty-state-desc">Students will appear here as soon as they enroll in this batch.</div>
          </div>
        )}
      </div>

      {/* Waitlist */}
      <div className="card">
        <h2 className="card-title">Waitlist ({waitlist.length})</h2>
        {waitlist.length > 0 ? (
          <>
            <p className="form-helper" style={{ marginTop: 0, marginBottom: '12px' }}>
              When a seat frees up (a student is dropped or seats are added), the first student in this list is
              enrolled automatically.
            </p>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Student</th>
                    <th>Phone</th>
                    <th>Joined Waitlist</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((e, index) => (
                    <tr key={e._id}>
                      <td>
                        <strong>#{index + 1}</strong>
                      </td>
                      <td>
                        <strong>{e.student.name}</strong>
                        <div className="cell-sub">{e.student.email}</div>
                      </td>
                      <td>{e.student.phone || '—'}</td>
                      <td className="cell-sub">{formatDateTime(e.waitlistedAt)}</td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => changeStatus(e, 'Active')}
                            disabled={updatingId === e._id || batch.isFull}
                            title={batch.isFull ? 'No free seat. Drop a student or add seats first.' : 'Enroll now'}
                          >
                            Enroll Now
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => changeStatus(e, 'Dropped')}
                            disabled={updatingId === e._id}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">Nobody is waiting</div>
            <div className="empty-state-desc">
              {batch.isFull
                ? 'This batch is full. New students can join the waitlist from the course page.'
                : 'The waitlist is only used once every seat is taken.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
