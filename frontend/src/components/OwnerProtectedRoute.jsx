import { Navigate } from 'react-router-dom';
import { useOwnerAuth } from '../context/AuthContext';

export default function OwnerProtectedRoute({ children }) {
  const { session } = useOwnerAuth();
  if (!session) return <Navigate to="/owner/login" replace />;
  return children;
}
