import { Navigate } from 'react-router-dom';
import { useMemberAuth } from '../context/AuthContext';

export default function MemberProtectedRoute({ children }) {
  const { session } = useMemberAuth();
  if (!session) return <Navigate to="/member/login" replace />;
  return children;
}
