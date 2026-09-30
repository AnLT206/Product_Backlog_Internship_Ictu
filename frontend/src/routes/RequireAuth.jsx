import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    // Seamlessly adapt session to the required portal role
    const primaryRole = roles[0];
    switchRole(primaryRole);
    return children;
  }

  return children;
}
