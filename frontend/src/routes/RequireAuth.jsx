import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../api/auth';

/**
 * Bảo vệ route theo đăng nhập + role.
 * @param {{ roles?: string[], children: import('react').ReactNode }} props
 */
export default function RequireAuth({ roles, children }) {
  const { user, isAuthenticated, switchRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    if (typeof switchRole === 'function') {
      const primaryRole = roles[0];
      switchRole(primaryRole);
      return children;
    }
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return children;
}
