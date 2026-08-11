import { useEffect, useState } from 'react';
import { Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ownerApi } from '../../api/client';
import { useOwnerAuth } from '../../context/AuthContext';
import TopBar from '../../components/TopBar.jsx';

import GymLive from './GymLive.jsx';
import GymMembers from './GymMembers.jsx';
import GymInvite from './GymInvite.jsx';
import GymHistory from './GymHistory.jsx';
import GymSettings from './GymSettings.jsx';

const TABS = [
  { key: 'live', label: 'Canlı Ekran' },
  { key: 'members', label: 'Üyeler' },
  { key: 'invite', label: 'Üye Davet Et' },
  { key: 'history', label: 'Giriş Geçmişi' },
  { key: 'settings', label: 'Ayarlar & QR' },
];

export default function GymWorkspace() {
  const { gymId } = useParams();
  const { logout } = useOwnerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [gym, setGym] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setGym(null);
    ownerApi.get(`/gyms/${gymId}`)
      .then(({ data }) => setGym(data.gym))
      .catch((err) => setError(err.response?.data?.error || 'Salon yüklenemedi.'));
  }, [gymId]);

  const activeTab = TABS.find((t) => location.pathname.endsWith(`/${t.key}`))?.key || 'live';

  return (
    <div className="app-shell">
      <TopBar title={gym?.name || 'Salon'} onLogout={() => { logout(); navigate('/'); }} />
      <div className="page">
        <Link to="/owner/dashboard" className="link-muted text-sm">← Salonlarım</Link>

        {error && <div className="alert alert-danger" style={{ marginTop: 16 }}>{error}</div>}

        {gym && (
          <>
            <h1 style={{ marginTop: 12 }}>{gym.name}</h1>
            <div className="tabs">
              {TABS.map((t) => (
                <Link key={t.key} to={`/owner/gyms/${gymId}/${t.key}`} className={`tab ${activeTab === t.key ? 'active' : ''}`}>
                  {t.label}
                </Link>
              ))}
            </div>

            <Routes>
              <Route index element={<GymLive gym={gym} />} />
              <Route path="live" element={<GymLive gym={gym} />} />
              <Route path="members" element={<GymMembers gym={gym} />} />
              <Route path="invite" element={<GymInvite gym={gym} />} />
              <Route path="history" element={<GymHistory gym={gym} />} />
              <Route path="settings" element={<GymSettings gym={gym} onUpdated={setGym} />} />
            </Routes>
          </>
        )}
      </div>
    </div>
  );
}
