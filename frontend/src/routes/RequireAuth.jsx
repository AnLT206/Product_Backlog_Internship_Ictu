import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Bảo vệ route theo đăng nhập + role.
 * @param {{ roles?: string[], children: import('react').ReactNode }} props
 */
export default function RequireAuth({ roles, children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
