import { apiFetch } from './client';

export const getStudentDashboard = () => {
  return apiFetch('/dashboard/student', {
    method: 'GET'
  });
};

export const getAdminDashboard = () => {
  return apiFetch('/dashboard/admin', {
    method: 'GET'
  });
};
