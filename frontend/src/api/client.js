// Backend base URL comes from VITE_API_URL.
// Trailing slashes are normalized and the /api suffix is added if missing, so both
// "https://api.example.com" and "https://api.example.com/api" work.
const rawBase = (import.meta.env.VITE_API_URL || '').trim();
const cleanedBase = rawBase.replace(/\/+$/, '');
const API_BASE_URL = cleanedBase.endsWith('/api') ? cleanedBase : `${cleanedBase}/api`;

if (!rawBase) {
  console.error('VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env and set the backend URL.');
}

/**
 * Universal API fetch helper. Always expects JSON back from the server.
 */
export async function apiFetch(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    const error = new Error('Network error: could not connect to the backend server. Please try again.');
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
