import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCourseById, createCourse, updateCourse } from '../api/courses';
import CourseForm from '../components/CourseForm';
import Alert from '../components/Alert';

// One page for both /admin/courses/new and /admin/courses/:id/edit
export default function AdminCourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isEditMode) {
      setInitialData(null);
      return;
    }

    const fetchCourse = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const res = await getCourseById(id);
        setInitialData(res.data.course);
      } catch (err) {
        setLoadError(err.message || 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, isEditMode]);

  const handleSubmit = async (values) => {
    setErrorMessage('');
    setSubmitting(true);

    try {
      const res = isEditMode ? await updateCourse(id, values) : await createCourse(values);
      // Go to the course page so the admin can add batches right away
      navigate(`/courses/${res.data._id}`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save course');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container loading-container">Loading course form...</div>;
  }

  if (loadError) {
    return (
      <div className="container" style={{ marginTop: '30px', maxWidth: '720px' }}>
        <Alert type="error" message={loadError} />
        <Link to="/courses" className="btn btn-secondary">
          &larr; Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditMode ? 'Edit Course' : 'Create New Course'}</h1>
          <p className="page-subtitle">
            {isEditMode
              ? `Update details for ${initialData?.code || 'this course'}`
              : 'Set the title, unique code, duration, fee and description. Add batches after saving.'}
          </p>
        </div>
      </div>

      <CourseForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEditMode ? `/courses/${id}` : '/courses')}
        submitting={submitting}
        serverError={errorMessage}
        submitLabel={isEditMode ? 'Update Course' : 'Create Course'}
      />
    </div>
  );
}
