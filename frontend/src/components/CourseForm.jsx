import React, { useState, useEffect } from 'react';
import Alert from './Alert';

const EMPTY_COURSE = {
  title: '',
  code: '',
  durationWeeks: 12,
  fee: '',
  description: ''
};

/**
 * Shared form for Add Course and Edit Course.
 * Pass initialData to pre-fill (edit mode); onSubmit receives cleaned values.
 */
export default function CourseForm({ initialData, onSubmit, onCancel, submitting, serverError, submitLabel }) {
  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        code: initialData.code || '',
        durationWeeks: initialData.durationWeeks ?? 12,
        fee: initialData.fee ?? '',
        description: initialData.description || ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'code' ? value.toUpperCase() : value
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    const weeks = Number(formData.durationWeeks);
    const fee = Number(formData.fee);

    if (!formData.title.trim()) errors.title = 'Course title is required';
    if (!/^[A-Z0-9-]{3,12}$/.test(formData.code.trim())) {
      errors.code = 'Use 3-12 letters, digits or hyphens (e.g. FSWD101)';
    }
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 104) {
      errors.durationWeeks = 'Duration must be a whole number between 1 and 104 weeks';
    }
    if (formData.fee === '' || isNaN(fee) || fee < 0 || fee > 1000000) {
      errors.fee = 'Fee must be between ₹0 and ₹10,00,000';
    }
    if (!formData.description.trim()) errors.description = 'Description is required';
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      code: formData.code.trim(),
      durationWeeks: Number(formData.durationWeeks),
      fee: Number(formData.fee),
      description: formData.description.trim()
    });
  };

  return (
    <div className="card">
      {serverError && <Alert type="error" message={serverError} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="title">
            Course Title <span className="required">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            className="form-control"
            placeholder="e.g. Full Stack Web Development (MERN)"
            value={formData.title}
            onChange={handleChange}
            maxLength={120}
          />
          {fieldErrors.title && <div className="form-error">{fieldErrors.title}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="code">
              Course Code <span className="required">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              className="form-control"
              placeholder="e.g. FSWD101"
              value={formData.code}
              onChange={handleChange}
              maxLength={12}
            />
            {fieldErrors.code ? (
              <div className="form-error">{fieldErrors.code}</div>
            ) : (
              <div className="form-helper">Must be unique across all courses.</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="durationWeeks">
              Duration (weeks) <span className="required">*</span>
            </label>
            <input
              id="durationWeeks"
              name="durationWeeks"
              type="number"
              min="1"
              max="104"
              className="form-control"
              value={formData.durationWeeks}
              onChange={handleChange}
            />
            {fieldErrors.durationWeeks && <div className="form-error">{fieldErrors.durationWeeks}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fee">
              Fee (₹) <span className="required">*</span>
            </label>
            <input
              id="fee"
              name="fee"
              type="number"
              min="0"
              max="1000000"
              className="form-control"
              placeholder="e.g. 45000"
              value={formData.fee}
              onChange={handleChange}
            />
            {fieldErrors.fee && <div className="form-error">{fieldErrors.fee}</div>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            className="form-textarea"
            rows="4"
            placeholder="What students will learn, prerequisites, projects..."
            value={formData.description}
            onChange={handleChange}
            maxLength={1000}
          ></textarea>
          {fieldErrors.description ? (
            <div className="form-error">{fieldErrors.description}</div>
          ) : (
            <div className="form-helper">{formData.description.length}/1000 characters</div>
          )}
        </div>

        <div className="btn-group" style={{ marginTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
