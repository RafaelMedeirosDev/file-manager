import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function HomeRedirectPage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/users" replace />;
  }

  return <Navigate to="/folders" replace />;
}
