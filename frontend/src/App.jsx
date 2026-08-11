import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OwnerAuthProvider, MemberAuthProvider } from './context/AuthContext';

import Landing from './pages/Landing.jsx';

import OwnerRegister from './pages/owner/OwnerRegister.jsx';
import OwnerLogin from './pages/owner/OwnerLogin.jsx';
import OwnerDashboard from './pages/owner/OwnerDashboard.jsx';
import GymCreate from './pages/owner/GymCreate.jsx';
import GymWorkspace from './pages/owner/GymWorkspace.jsx';
import OwnerProtectedRoute from './components/OwnerProtectedRoute.jsx';

import MemberRegister from './pages/member/MemberRegister.jsx';
import MemberLogin from './pages/member/MemberLogin.jsx';
import MemberHome from './pages/member/MemberHome.jsx';
import MemberScan from './pages/member/MemberScan.jsx';
import MemberProtectedRoute from './components/MemberProtectedRoute.jsx';

export default function App() {
  return (
    <OwnerAuthProvider>
      <MemberAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />

            {/* ---- Salon Sahibi ---- */}
            <Route path="/owner/register" element={<OwnerRegister />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/owner/dashboard" element={<OwnerProtectedRoute><OwnerDashboard /></OwnerProtectedRoute>} />
            <Route path="/owner/gyms/new" element={<OwnerProtectedRoute><GymCreate /></OwnerProtectedRoute>} />
            <Route path="/owner/gyms/:gymId/*" element={<OwnerProtectedRoute><GymWorkspace /></OwnerProtectedRoute>} />

            {/* ---- Üye ---- */}
            <Route path="/member/register" element={<MemberRegister />} />
            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/member/home" element={<MemberProtectedRoute><MemberHome /></MemberProtectedRoute>} />
            <Route path="/member/scan" element={<MemberProtectedRoute><MemberScan /></MemberProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MemberAuthProvider>
    </OwnerAuthProvider>
  );
}
