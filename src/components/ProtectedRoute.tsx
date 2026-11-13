import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './ui';

export default function ProtectedRoute() {
  const { session, loading, recovery } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (recovery) return <Navigate to="/reset-password" replace />;
  return <Outlet />;
}
