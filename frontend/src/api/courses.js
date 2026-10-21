import { apiFetch } from './client';

export const getCourses = (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.search) query.append('search', filters.search);
  if (filters.sort) query.append('sort', filters.sort);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/courses${queryString}`, {
    method: 'GET'
  });
};

export const getCourseById = (id) => {
  return apiFetch(`/courses/${id}`, {
    method: 'GET'
  });
};

export const createCourse = (data) => {
  return apiFetch('/courses', {
    method: 'POST',
    body: data
  });
};

export const updateCourse = (id, data) => {
  return apiFetch(`/courses/${id}`, {
    method: 'PUT',
    body: data
  });
};

export const deleteCourse = (id) => {
  return apiFetch(`/courses/${id}`, {
    method: 'DELETE'
  });
};
