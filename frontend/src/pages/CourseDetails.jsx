import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getCourseById, deleteCourse } from '../api/courses';
import { createBatch, updateBatch, deleteBatch } from '../api/batches';
import { enrollInBatch, dropEnrollment } from '../api/enrollments';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import BatchForm from '../components/BatchForm';
import { formatCurrency, formatDate, pluralize } from '../utils/format';

export default function CourseDetails({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Admin batch form state: null = closed, 'new' = add, batch object = edit
  const [batchFormTarget, setBatchFormTarget] = useState(null);
  const [batchFormError, setBatchFormError] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getCourseById(id);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load course details');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const runAction = async (action) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await action();
      setSuccess(res.message);
      await fetchDetails();
    } catch (err) {
      setError(err.message || 'Action failed');
      fetchDetails();
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Student actions ----------
  const handleEnroll = (batch) => {
    const fee = formatCurrency(data.course.fee);
    if (!window.confirm(`Enroll in ${data.course.title} - ${batch.name} (${fee})?`)) return;
    runAction(() => enrollInBatch(batch._id));
  };

  const handleJoinWaitlist = (batch) => {
    if (!window.confirm(`'${batch.name}' is full. Join the waitlist? You will be enrolled automatically when a seat frees up.`)) return;
    runAction(() => enrollInBatch(batch._id, true));
  };

  const handleLeave = () => {
    const enrollment = data.myEnrollment;
    const label = enrollment.status === 'Waitlisted' ? 'leave the waitlist for' : 'drop your enrollment in';
    if (!window.confirm(`Are you sure you want to ${label} ${enrollment.batch?.name}?`)) return;
    runAction(() => dropEnrollment(enrollment._id));
  };

  // ---------- Admin actions ----------
  const openBatchForm = (target) => {
    setBatchFormTarget(target);
    setBatchFormError('');
    setSuccess('');
    setError('');
  };

  const handleBatchSubmit = async (values) => {
    try {
      setSavingBatch(true);
      setBatchFormError('');
      const res =
        batchFormTarget === 'new'
          ? await createBatch({ ...values, course: id })
          : await updateBatch(batchFormTarget._id, values);
      setBatchFormTarget(null);
      setSuccess(res.message);
      fetchDetails();
    } catch (err) {
      setBatchFormError(err.message || 'Failed to save batch');
    } finally {
      setSavingBatch(false);
    }
  };

  const handleDeleteBatch = (batch) => {
    if (!window.confirm(`Delete batch '${batch.name}'? This cannot be undone.`)) return;
    runAction(() => deleteBatch(batch._id));
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm(`Delete course '${data.course.title}' and all of its batches?`)) return;
    try {
      setActionLoading(true);
      setError('');
      await deleteCourse(id);
      navigate('/courses', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to delete course');
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return <div className="container loading-container">Loading course details...</div>;
  }

  if (!data) {
    return (
      <div className="container" style={{ marginTop: '30px' }}>
        <Alert type="error" message={error || 'Course not found'} />
        <Link to="/courses" className="btn btn-secondary">
          &larr; Back to Courses
        </Link>
      </div>
    );
  }

  const { course, batches, enrolledCount, myEnrollment } = data;
  const liveEnrollment = myEnrollment && myEnrollment.status !== 'Dropped' ? myEnrollment : null;

  // What a student can do on one batch row
  const renderStudentAction = (batch) => {
    const isMyBatch = liveEnrollment && liveEnrollment.batch?._id === batch._id;

    if (isMyBatch) {
      if (liveEnrollment.status === 'Waitlisted') {
        return <span className="row-note">Waitlist #{liveEnrollment.waitlistPosition}</span>;
      }
      return <Badge status={liveEnrollment.status} />;
    }
    if (liveEnrollment) {
      return <span className="row-note">Already {liveEnrollment.status === 'Waitlisted' ? 'waitlisted' : 'enrolled'} in this course</span>;
    }
    if (batch.phase === 'Ended') {
      return <span className="row-note">Batch ended</span>;
    }
    if (batch.isFull) {
      return (
        <button className="btn btn-warning btn-sm" onClick={() => handleJoinWaitlist(batch)} disabled={actionLoading}>
          Join Waitlist
        </button>
      );
    }
    return (
      <button className="btn btn-primary btn-sm" onClick={() => handleEnroll(batch)} disabled={actionLoading}>
        Enroll
      </button>
    );
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <Link to="/courses" className="btn btn-secondary btn-sm" style={{ marginBottom: '8px' }}>
            &larr; All Courses
          </Link>
          <h1 className="page-title">
            {course.title} <span className="course-code">{course.code}</span>
          </h1>
          <p className="page-subtitle">
            {pluralize(course.durationWeeks, 'week')} &bull; {formatCurrency(course.fee)} &bull;{' '}
            {pluralize(enrolledCount, 'student')} enrolled
          </p>
        </div>
        {isAdmin && (
          <div className="btn-group">
            <Link to={`/admin/courses/${course._id}/edit`} className="btn btn-secondary">
              Edit Course
            </Link>
            <button className="btn btn-danger" onClick={handleDeleteCourse} disabled={actionLoading}>
              Delete Course
            </button>
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Student's own status for this course */}
      {!isAdmin && liveEnrollment && (
        <div className={`status-banner status-banner-${liveEnrollment.status.toLowerCase()}`}>
          <div>
            {liveEnrollment.status === 'Waitlisted' ? (
              <>
                You are <strong>#{liveEnrollment.waitlistPosition}</strong> on the waitlist for{' '}
                <strong>{liveEnrollment.batch?.name}</strong>. You will be enrolled automatically when a seat frees up.
              </>
            ) : liveEnrollment.status === 'Completed' ? (
              <>
                You completed this course in <strong>{liveEnrollment.batch?.name}</strong>.
              </>
            ) : (
              <>
                You are enrolled in <strong>{liveEnrollment.batch?.name}</strong> ({liveEnrollment.batch?.timing},{' '}
                {liveEnrollment.batch?.mode}), starting {formatDate(liveEnrollment.batch?.startDate)}.
              </>
            )}
          </div>
          {['Active', 'Waitlisted'].includes(liveEnrollment.status) && (
            <button className="btn btn-secondary btn-sm" onClick={handleLeave} disabled={actionLoading}>
              {liveEnrollment.status === 'Waitlisted' ? 'Leave Waitlist' : 'Drop Enrollment'}
            </button>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="card-title">About this Course</h2>
        <p className="course-description">{course.description}</p>
        <div className="detail-grid" style={{ marginTop: '16px', marginBottom: 0 }}>
          <div className="detail-item">
            <div className="detail-label">Course Code</div>
            <div className="detail-value">{course.code}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Duration</div>
            <div className="detail-value">{pluralize(course.durationWeeks, 'week')}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Fee</div>
            <div className="detail-value">{formatCurrency(course.fee)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Batches</div>
            <div className="detail-value">{batches.length}</div>
          </div>
        </div>
      </div>

      {/* Admin: add / edit batch */}
      {isAdmin && batchFormTarget && (
        <BatchForm
          initialData={batchFormTarget === 'new' ? null : batchFormTarget}
          onSubmit={handleBatchSubmit}
          onCancel={() => setBatchFormTarget(null)}
          submitting={savingBatch}
          serverError={batchFormError}
        />
      )}

      <div className="card">
        <div className="card-header-row">
          <h2>Batches ({batches.length})</h2>
          {isAdmin && !batchFormTarget && (
            <button className="btn btn-primary btn-sm" onClick={() => openBatchForm('new')}>
              + Add Batch
            </button>
          )}
        </div>

        {loading && <div className="loading-inline">Refreshing...</div>}

        {batches.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Start Date</th>
                  <th>Timing</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Seats Left</th>
                  <th>{isAdmin ? 'Actions' : 'Enroll'}</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const fillPct = Math.round((batch.seatsFilled / batch.totalSeats) * 100);
                  return (
                    <tr key={batch._id}>
                      <td>
                        <strong>{batch.name}</strong>
                        <div className="cell-sub">Ends {formatDate(batch.endDate)}</div>
                      </td>
                      <td>{formatDate(batch.startDate)}</td>
                      <td>{batch.timing}</td>
                      <td>
                        <Badge status={batch.mode} />
                      </td>
                      <td>
                        <Badge status={batch.phase} />
                      </td>
                      <td style={{ minWidth: '140px' }}>
                        <div className="seats-text">
                          {batch.phase === 'Ended' ? (
                            <span className="row-note">Closed</span>
                          ) : batch.isFull ? (
                            <Badge status="Full" />
                          ) : (
                            <strong style={{ color: batch.seatsLeft <= 3 ? '#b45309' : '#15803d' }}>
                              {batch.seatsLeft} left
                            </strong>
                          )}
                          <span className="cell-sub">
                            {batch.seatsFilled}/{batch.totalSeats} filled
                          </span>
                        </div>
                        <div className="seat-bar" aria-hidden="true">
                          <div
                            className={`seat-bar-fill ${fillPct >= 100 ? 'full' : fillPct >= 80 ? 'warn' : ''}`}
                            style={{ width: `${Math.min(fillPct, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td>
                        {isAdmin ? (
                          <div className="btn-group">
                            <Link to={`/admin/batches/${batch._id}/students`} className="btn btn-primary btn-sm">
                              Students
                            </Link>
                            <button className="btn btn-secondary btn-sm" onClick={() => openBatchForm(batch)}>
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteBatch(batch)}
                              disabled={actionLoading}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          renderStudentAction(batch)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No batches scheduled yet</div>
            <div className="empty-state-desc">
              {isAdmin
                ? 'Add the first batch with its start date, timing, mode and seats.'
                : 'The institute has not opened any batches for this course yet. Please check back soon.'}
            </div>
            {isAdmin && !batchFormTarget && (
              <button className="btn btn-primary btn-sm" onClick={() => openBatchForm('new')}>
                + Add Batch
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
