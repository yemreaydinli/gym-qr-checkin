import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ownerApi } from '../../api/client';
import { useOwnerAuth } from '../../context/AuthContext';

export default function OwnerLogin() {
  const navigate = useNavigate();
  const { login } = useOwnerAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await ownerApi.post('/auth/owner/login', form);
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      navigate('/owner/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">Q</span><span>Salon Sahibi Girişi</span></div>
      </div>
      <div className="page page-narrow">
        <h1>Tekrar hoş geldin</h1>
        <p className="subtitle">Salonunu yönetmek için giriş yap.</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label>E-posta</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Şifre</label>
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Giriş yapılıyor...' : 'Giriş yap'}</button>
        </form>

        <p className="text-dim text-sm">
          Hesabın yok mu? <Link className="link-muted" to="/owner/register">Salon kaydı oluştur</Link>
        </p>
      </div>
    </div>
  );
}
