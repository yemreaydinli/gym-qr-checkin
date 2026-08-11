import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ownerApi } from '../../api/client';
import { useOwnerAuth } from '../../context/AuthContext';
import TopBar from '../../components/TopBar.jsx';

export default function OwnerDashboard() {
  const { session, logout } = useOwnerAuth();
  const navigate = useNavigate();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ownerApi.get('/gyms/mine')
      .then(({ data }) => setGyms(data.gyms))
      .catch((err) => setError(err.response?.data?.error || 'Salonlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <TopBar title={session?.user?.full_name || 'Panel'} onLogout={handleLogout} />
      <div className="page">
        <div className="card-title-row">
          <div>
            <h1>Salonlarım</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>Yönetmek istediğin salonu seç.</p>
          </div>
          <Link to="/owner/gyms/new" className="btn btn-primary btn-sm">+ Yeni salon</Link>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <p className="text-dim">Yükleniyor...</p>
        ) : gyms.length === 0 ? (
          <div className="card empty-state">
            <p>Henüz bir salon eklemedin.</p>
            <Link to="/owner/gyms/new" className="btn btn-primary" style={{ marginTop: 10, display: 'inline-flex' }}>İlk salonunu oluştur</Link>
          </div>
        ) : (
          <div className="card">
            {gyms.map((gym) => (
              <Link key={gym.id} to={`/owner/gyms/${gym.id}/live`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="avatar">{gym.name.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{gym.name}</div>
                  <div className="text-dim text-sm mono">
                    Yarıçap: {gym.allowed_radius_meters}m · Mükerrer bekleme: {gym.duplicate_check_minutes}dk
                  </div>
                </div>
                <span className={`badge ${gym.is_active ? 'badge-success' : 'badge-muted'}`}>
                  {gym.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
