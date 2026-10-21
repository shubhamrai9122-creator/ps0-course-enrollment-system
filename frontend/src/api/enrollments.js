import { apiFetch } from './client';

export const enrollInBatch = (batchId, joinWaitlist = false) => {
  return apiFetch('/enrollments', {
    method: 'POST',
    body: { batchId, joinWaitlist }
  });
};

export const getMyEnrollments = () => {
  return apiFetch('/enrollments/my', {
    method: 'GET'
  });
};

export const dropEnrollment = (id) => {
  return apiFetch(`/enrollments/${id}/drop`, {
    method: 'PATCH'
  });
};

export const updateEnrollmentStatus = (id, status) => {
  return apiFetch(`/enrollments/${id}/status`, {
    method: 'PATCH',
    body: { status }
  });
};
