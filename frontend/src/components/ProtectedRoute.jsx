import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Guards a route by login and (optionally) role.
 * - Not logged in  -> /login (remembering where the user wanted to go)
 * - Wrong role     -> that role's home page
 */
export default function ProtectedRoute({ user, role, children }) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/'} replace />;
  }

  return children;
}
