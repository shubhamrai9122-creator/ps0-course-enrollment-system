import { apiFetch } from './client';

export const getBatches = (courseId) => {
  const queryString = courseId ? `?course=${encodeURIComponent(courseId)}` : '';
  return apiFetch(`/batches${queryString}`, {
    method: 'GET'
  });
};

export const createBatch = (data) => {
  return apiFetch('/batches', {
    method: 'POST',
    body: data
  });
};

export const updateBatch = (id, data) => {
  return apiFetch(`/batches/${id}`, {
    method: 'PUT',
    body: data
  });
};

export const deleteBatch = (id) => {
  return apiFetch(`/batches/${id}`, {
    method: 'DELETE'
  });
};

export const getBatchStudents = (id) => {
  return apiFetch(`/batches/${id}/students`, {
    method: 'GET'
  });
};
