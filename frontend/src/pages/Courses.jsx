import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCourses, deleteCourse } from '../api/courses';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import { formatCurrency, formatDate, pluralize } from '../utils/format';

export default function Courses({ user }) {
  const isAdmin = user?.role === 'admin';

  // Search and sort live in the URL (?search=react&sort=fee_asc) so they survive refresh/share
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'title';

  const [searchInput, setSearchInput] = useState(search);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getCourses({ search, sort });
      setCourses(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search, sort]);

  // Keep the input in sync when the URL changes (back/forward buttons)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete course '${course.title}' and all of its batches?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await deleteCourse(course._id);
      setSuccess(res.message || 'Course deleted successfully');
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to delete course');
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'Courses & Batches' : 'Browse Courses'}</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Manage the course catalogue. Open a course to add or edit its batches.'
              : 'Find a course, open it to see its batches and seats left, then enroll.'}
          </p>
        </div>
        {isAdmin && (
          <Link to="/admin/courses/new" className="btn btn-primary">
            + Add New Course
          </Link>
        )}
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Search & Sort Toolbar */}
      <form className="filter-bar" onSubmit={handleSearchSubmit} role="search">
        <input
          type="search"
          className="form-control"
          style={{ flex: '1 1 260px' }}
          placeholder="Search by title, code or description..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search courses"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        <div>
          <label htmlFor="sort" style={{ fontSize: '13px', fontWeight: 600, marginRight: '8px' }}>
            Sort:
          </label>
          <select
            id="sort"
            className="form-select"
            style={{ width: 'auto', display: 'inline-block' }}
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value === 'title' ? '' : e.target.value })}
          >
            <option value="title">Title (A-Z)</option>
            <option value="fee_asc">Fee: Low to High</option>
            <option value="fee_desc">Fee: High to Low</option>
            <option value="duration">Duration: Shortest</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
        {search && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateParams({ search: '' })}>
            Clear Search
          </button>
        )}
      </form>

      {loading ? (
        <div className="card loading-container">Loading courses...</div>
      ) : courses.length > 0 ? (
        <>
          <p className="result-count">
            {pluralize(courses.length, 'course')} {search && <>matching &ldquo;{search}&rdquo;</>}
          </p>
          <div className="course-grid">
            {courses.map((course) => (
              <div key={course._id} className="course-card">
                <div className="course-card-head">
                  <span className="course-code">{course.code}</span>
                  {course.modes.map((m) => (
                    <Badge key={m} status={m} />
                  ))}
                </div>
                <Link to={`/courses/${course._id}`} className="course-card-title">
                  {course.title}
                </Link>
                <p className="course-card-desc">{course.description}</p>

                <div className="course-card-facts">
                  <div>
                    <div className="detail-label">Fee</div>
                    <div className="detail-value">{formatCurrency(course.fee)}</div>
                  </div>
                  <div>
                    <div className="detail-label">Duration</div>
                    <div className="detail-value">{pluralize(course.durationWeeks, 'week')}</div>
                  </div>
                  <div>
                    <div className="detail-label">Open Batches</div>
                    <div className="detail-value">{course.openBatchCount}</div>
                  </div>
                  <div>
                    <div className="detail-label">Seats Left</div>
                    <div className="detail-value" style={{ color: course.seatsLeft === 0 ? '#b91c1c' : '#15803d' }}>
                      {course.seatsLeft}
                    </div>
                  </div>
                </div>

                <div className="course-card-foot">
                  <span className="course-card-next">
                    {course.nextStartDate ? `Next batch starts ${formatDate(course.nextStartDate)}` : course.openBatchCount > 0 ? 'Batches running now' : 'No open batches'}
                  </span>
                  <div className="btn-group">
                    <Link to={`/courses/${course._id}`} className="btn btn-primary btn-sm">
                      {isAdmin ? 'Manage Batches' : 'View Batches'}
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to={`/admin/courses/${course._id}/edit`} className="btn btn-secondary btn-sm">
                          Edit
                        </Link>
                        <button onClick={() => handleDelete(course)} className="btn btn-danger btn-sm">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card empty-state">
          <div className="empty-state-title">{search ? 'No matching courses found' : 'No courses available yet'}</div>
          <div className="empty-state-desc">
            {search
              ? `Nothing matches "${search}". Try a different keyword or clear the search.`
              : isAdmin
              ? 'Create your first course to start adding batches.'
              : 'The institute has not published any courses yet. Please check back soon.'}
          </div>
          {search ? (
            <button className="btn btn-secondary btn-sm" onClick={() => updateParams({ search: '' })}>
              Clear Search
            </button>
          ) : (
            isAdmin && (
              <Link to="/admin/courses/new" className="btn btn-primary btn-sm">
                Add Course
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
