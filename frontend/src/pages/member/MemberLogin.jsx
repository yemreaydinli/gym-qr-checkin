import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { memberApi } from '../../api/client';
import { useMemberAuth } from '../../context/AuthContext';

export default function MemberLogin() {
  const navigate = useNavigate();
  const { login } = useMemberAuth();
  const [form, setForm] = useState({ gym_id: '', phone_number: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await memberApi.post('/auth/member/login', form);
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.member);
      navigate('/member/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">Q</span><span>Üye Girişi</span></div>
      </div>
      <div className="page page-narrow">
        <h1>Tekrar hoş geldin</h1>
        <p className="subtitle">Salon ID'ni salon sahibinden öğrenebilirsin (ilk kayıtta otomatik hatırlanır).</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label>Salon ID</label>
            <input required className="mono" value={form.gym_id} onChange={(e) => setForm({ ...form, gym_id: e.target.value })} />
          </div>
          <div className="field">
            <label>Telefon numarası</label>
            <input required value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </div>
          <div className="field">
            <label>Şifre</label>
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Giriş yapılıyor...' : 'Giriş yap'}</button>
        </form>

        <p className="text-dim text-sm">
          Hesabın yok mu? <Link className="link-muted" to="/member/register">Davet koduyla kaydol</Link>
        </p>
      </div>
    </div>
  );
}
