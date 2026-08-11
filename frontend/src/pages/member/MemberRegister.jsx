import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { memberApi } from '../../api/client';
import { useMemberAuth } from '../../context/AuthContext';

export default function MemberRegister() {
  const navigate = useNavigate();
  const { login } = useMemberAuth();
  const [form, setForm] = useState({ invite_code: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await memberApi.post('/members/register', form);
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.member);
      navigate('/member/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">Q</span><span>Üye Kaydı</span></div>
      </div>
      <div className="page page-narrow">
        <h1>Davet koduyla kaydol</h1>
        <p className="subtitle">Salon sahibinden aldığın davet kodunu ve yeni bir şifre belirle.</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label>Davet kodu</label>
            <input required className="mono" style={{ textTransform: 'uppercase' }} value={form.invite_code}
              onChange={(e) => setForm({ ...form, invite_code: e.target.value.toUpperCase() })} />
          </div>
          <div className="field">
            <label>Şifre (en az 6 karakter)</label>
            <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Oluşturuluyor...' : 'Hesabı oluştur'}</button>
        </form>

        <p className="text-dim text-sm">
          Zaten hesabın var mı? <Link className="link-muted" to="/member/login">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
