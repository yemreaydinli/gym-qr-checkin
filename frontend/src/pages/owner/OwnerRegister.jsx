import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ownerApi } from '../../api/client';
import { useOwnerAuth } from '../../context/AuthContext';

export default function OwnerRegister() {
  const navigate = useNavigate();
  const { login } = useOwnerAuth();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await ownerApi.post('/auth/owner/register', form);
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      navigate('/owner/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">Q</span><span>Salon Kaydı</span></div>
      </div>
      <div className="page page-narrow">
        <h1>Salonunu kaydet</h1>
        <p className="subtitle">Salon sahibi hesabı oluştur, sonra salon bilgilerini gireceksin.</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label>Ad Soyad</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="field">
            <label>E-posta</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Şifre (en az 8 karakter)</label>
            <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Oluşturuluyor...' : 'Hesap oluştur'}</button>
        </form>

        <p className="text-dim text-sm">
          Zaten hesabın var mı? <Link className="link-muted" to="/owner/login">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
