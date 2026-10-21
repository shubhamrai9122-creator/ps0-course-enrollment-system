// Dates from the API are stored as UTC midnight, so format them in UTC
// to avoid showing the previous day in timezones west of UTC.
export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
};

// For timestamps (createdAt, statusUpdatedAt) shown in the viewer's local time
export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

// 'YYYY-MM-DD' for <input type="date">
export const toDateInputValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

export const pluralize = (count, word, plural = `${word}s`) => `${count} ${count === 1 ? word : plural}`;
