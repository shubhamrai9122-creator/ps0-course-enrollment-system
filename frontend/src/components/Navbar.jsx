import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#2563eb" aria-hidden="true">
            <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zm-6.82 9.74v4L12 21l6.82-4.26v-4L12 16.5l-6.82-3.76z" />
          </svg>
          Course Enrollment System
        </Link>

        <nav>
          <ul className="navbar-links">
            {user ? (
              <>
                {isAdmin ? (
                  <>
                    <li>
                      <NavLink to="/admin/dashboard" className={linkClass}>
                        Admin Dashboard
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/courses" className={linkClass}>
                        Courses & Batches
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/courses/new" className={linkClass}>
                        Add Course
                      </NavLink>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <NavLink to="/" end className={linkClass}>
                        My Dashboard
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/courses" className={linkClass}>
                        Browse Courses
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/my-enrollments" className={linkClass}>
                        My Enrollments
                      </NavLink>
                    </li>
                  </>
                )}

                <li className="navbar-user">
                  <span className="user-tag">
                    {user.name}
                    <span className={isAdmin ? 'role-tag-admin' : 'role-tag-student'}>{user.role}</span>
                  </span>
                  <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink to="/login" className={linkClass}>
                    Login
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className={linkClass}>
                    Register as Student
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
