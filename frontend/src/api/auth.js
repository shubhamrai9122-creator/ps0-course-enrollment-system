import { apiFetch } from './client';

export const loginUser = (credentials) => {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: credentials
  });
};

export const registerUser = (userData) => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: userData
  });
};

export const getCurrentUser = () => {
  return apiFetch('/auth/me', {
    method: 'GET'
  });
};
