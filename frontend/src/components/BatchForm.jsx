import React, { useState, useEffect } from 'react';
import Alert from './Alert';
import { toDateInputValue } from '../utils/format';

const EMPTY_BATCH = {
  name: '',
  startDate: '',
  timing: '',
  mode: 'Online',
  totalSeats: 30
};

/**
 * Shared form for Add Batch and Edit Batch under a course.
 * Pass initialData (a batch) to edit it.
 */
export default function BatchForm({ initialData, onSubmit, onCancel, submitting, serverError }) {
  const isEditMode = Boolean(initialData);
  const [formData, setFormData] = useState(EMPTY_BATCH);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        startDate: toDateInputValue(initialData.startDate),
        timing: initialData.timing || '',
        mode: initialData.mode || 'Online',
        totalSeats: initialData.totalSeats ?? 30
      });
    } else {
      setFormData(EMPTY_BATCH);
    }
    setFieldErrors({});
  }, [initialData]);

  const seatsFilled = initialData?.seatsFilled || 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    const seats = Number(formData.totalSeats);

    if (!formData.name.trim()) errors.name = 'Batch name is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.timing.trim()) errors.timing = 'Timing is required';
    if (!['Online', 'Offline'].includes(formData.mode)) errors.mode = 'Choose Online or Offline';
    if (!Number.isInteger(seats) || seats < 1 || seats > 500) {
      errors.totalSeats = 'Seats must be a whole number between 1 and 500';
    } else if (seats < seatsFilled) {
      errors.totalSeats = `Cannot be less than the ${seatsFilled} seat(s) already filled`;
    }
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
      name: formData.name.trim(),
      startDate: formData.startDate,
      timing: formData.timing.trim(),
      mode: formData.mode,
      totalSeats: Number(formData.totalSeats)
    });
  };

  return (
    <div className="card form-panel">
      <h2 className="card-title">{isEditMode ? `Edit Batch: ${initialData.name}` : 'Add New Batch'}</h2>

      {serverError && <Alert type="error" message={serverError} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="batchName">
              Batch Name <span className="required">*</span>
            </label>
            <input
              id="batchName"
              name="name"
              type="text"
              className="form-control"
              placeholder="e.g. Weekend Batch"
              value={formData.name}
              onChange={handleChange}
              maxLength={60}
            />
            {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="startDate">
              Start Date <span className="required">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="form-control"
              value={formData.startDate}
              onChange={handleChange}
            />
            {fieldErrors.startDate && <div className="form-error">{fieldErrors.startDate}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="timing">
              Timing <span className="required">*</span>
            </label>
            <input
              id="timing"
              name="timing"
              type="text"
              className="form-control"
              placeholder="e.g. Sat-Sun, 10:00 AM - 1:00 PM"
              value={formData.timing}
              onChange={handleChange}
              maxLength={80}
            />
            {fieldErrors.timing && <div className="form-error">{fieldErrors.timing}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mode">
              Mode <span className="required">*</span>
            </label>
            <select id="mode" name="mode" className="form-select" value={formData.mode} onChange={handleChange}>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
            {fieldErrors.mode && <div className="form-error">{fieldErrors.mode}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="totalSeats">
              Total Seats <span className="required">*</span>
            </label>
            <input
              id="totalSeats"
              name="totalSeats"
              type="number"
              min={Math.max(1, seatsFilled)}
              max="500"
              className="form-control"
              value={formData.totalSeats}
              onChange={handleChange}
            />
            {fieldErrors.totalSeats ? (
              <div className="form-error">{fieldErrors.totalSeats}</div>
            ) : (
              isEditMode && <div className="form-helper">{seatsFilled} seat(s) already filled.</div>
            )}
          </div>
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditMode ? 'Update Batch' : 'Create Batch'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
