import React from 'react';

// Enrollment statuses, batch modes and batch phases share one badge component
const BADGE_CLASSES = {
  active: 'badge-active',
  completed: 'badge-completed',
  dropped: 'badge-dropped',
  waitlisted: 'badge-waitlisted',
  online: 'badge-online',
  offline: 'badge-offline',
  upcoming: 'badge-upcoming',
  ongoing: 'badge-ongoing',
  ended: 'badge-ended',
  full: 'badge-full'
};

export default function Badge({ status }) {
  if (!status) return null;

  const badgeClass = BADGE_CLASSES[String(status).toLowerCase()] || 'badge-dropped';

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}
