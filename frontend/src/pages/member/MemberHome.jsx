import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { memberApi, API_URL } from '../../api/client';
import { useMemberAuth } from '../../context/AuthContext';
import TopBar from '../../components/TopBar.jsx';

const STATUS_LABELS = {
  active: { label: 'Aktif', cls: 'badge-success' },
  expired: { label: 'Süresi dolmuş', cls: 'badge-danger' },
  frozen: { label: 'Dondurulmuş', cls: 'badge-warning' },
};

export default function MemberHome() {
  const { session, logout } = useMemberAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  function load() {
    memberApi.get('/members/me')
      .then(({ data }) => { setProfile(data.member); setMembership(data.membership); })
      .catch((err) => setError(err.response?.data?.error || 'Profil yüklenemedi.'));
  }

  useEffect(() => { load(); }, []);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      await memberApi.post('/members/me/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Fotoğraf yüklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const st = membership ? STATUS_LABELS[membership.computed_status] : null;

  return (
    <div className="app-shell">
      <TopBar title={profile?.gym_name || 'Üyelik'} onLogout={handleLogout} />
      <div className="page page-narrow">
        {error && <div className="alert alert-danger">{error}</div>}

        {profile && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="avatar" style={{ width: 88, height: 88, margin: '0 auto 14px', fontSize: '1.4rem' }}
              onClick={() => fileRef.current?.click()}>
              {profile.photo_url ? <img src={`${API_URL}${profile.photo_url}`} alt={profile.full_name} /> : profile.full_name.slice(0, 2).toUpperCase()}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            <button className="link-muted" style={{ background: 'none', border: 'none', marginBottom: 14 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Yükleniyor...' : (profile.photo_url ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle')}
            </button>

            <h1 style={{ marginBottom: 4 }}>{profile.full_name}</h1>
            <p className="text-dim mono" style={{ marginBottom: 16 }}>{profile.phone_number}</p>

            {membership && (
              <div style={{ marginBottom: 20 }}>
                <span className={`badge ${st.cls}`}>{st.label}</span>
                <p className="text-dim text-sm mono" style={{ marginTop: 8 }}>
                  {membership.package_type} · {membership.start_date} → {membership.end_date}
                </p>
              </div>
            )}

            <button className="btn btn-primary" onClick={() => navigate('/member/scan')}>
              📷 QR okut ve giriş yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
