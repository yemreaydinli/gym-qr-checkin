import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ownerApi } from '../../api/client';
import TopBar from '../../components/TopBar.jsx';
import { useOwnerAuth } from '../../context/AuthContext';

export default function GymCreate() {
  const navigate = useNavigate();
  const { logout } = useOwnerAuth();
  const [form, setForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    allowed_radius_meters: 100,
    duplicate_check_minutes: 5,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servislerini desteklemiyor.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setLocLoading(false);
      },
      () => {
        setError('Konum alınamadı. Lütfen izin verin veya elle girin.');
        setLocLoading(false);
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await ownerApi.post('/gyms', {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        allowed_radius_meters: Number(form.allowed_radius_meters),
        duplicate_check_minutes: Number(form.duplicate_check_minutes),
      });
      navigate(`/owner/gyms/${data.gym.id}/live`);
    } catch (err) {
      setError(err.response?.data?.error || 'Salon oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <TopBar title="Yeni Salon" onLogout={() => { logout(); navigate('/'); }} />
      <div className="page page-narrow">
        <Link to="/owner/dashboard" className="link-muted text-sm">← Salonlarım</Link>
        <h1 style={{ marginTop: 12 }}>Salon bilgilerini gir</h1>
        <p className="subtitle">
          Konum, üyelerin giriş yapabileceği GPS yarıçapını belirlemek için kullanılır.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label>Salon adı</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Enlem (latitude)</label>
              <input required type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </div>
            <div className="field">
              <label>Boylam (longitude)</label>
              <input required type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </div>
          </div>

          <button type="button" className="btn btn-secondary btn-block" style={{ marginBottom: 14 }} onClick={useMyLocation} disabled={locLoading}>
            {locLoading ? 'Konum alınıyor...' : '📍 Mevcut konumumu kullan'}
          </button>

          <div className="field-row">
            <div className="field">
              <label>GPS yarıçapı (metre)</label>
              <input required type="number" min={5} max={5000} value={form.allowed_radius_meters} onChange={(e) => setForm({ ...form, allowed_radius_meters: e.target.value })} />
            </div>
            <div className="field">
              <label>Mükerrer bekleme (dk)</label>
              <input required type="number" min={0} max={1440} value={form.duplicate_check_minutes} onChange={(e) => setForm({ ...form, duplicate_check_minutes: e.target.value })} />
            </div>
          </div>

          <button className="btn btn-primary" disabled={loading}>{loading ? 'Oluşturuluyor...' : 'Salonu oluştur'}</button>
        </form>
      </div>
    </div>
  );
}
