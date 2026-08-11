import { useState } from 'react';
import { ownerApi } from '../../api/client';

export default function GymInvite({ gym }) {
  const [form, setForm] = useState({
    full_name: '', phone_number: '', package_type: 'Aylık', start_date: '', end_date: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await ownerApi.post(`/members/gym/${gym.id}/invite`, form);
      setResult(data);
      setForm({ full_name: '', phone_number: '', package_type: 'Aylık', start_date: '', end_date: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Üye oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Yeni üye davet et</h2>
      <p className="subtitle">Üye bilgilerini gir, üyenin hesabını kurması için tek kullanımlık bir davet kodu üretilir.</p>

      {error && <div className="alert alert-danger">{error}</div>}
      {result && (
        <div className="alert alert-success">
          <strong>{result.member.full_name}</strong> davet edildi. Davet kodu:{' '}
          <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{result.invite_code}</span>
          <br />
          <span className="text-sm">Bu kodu üyeyle paylaş — {new Date(result.invite_expires_at).toLocaleString('tr-TR')} tarihine kadar geçerli.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Ad Soyad</label>
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Telefon numarası</label>
          <input required value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
        </div>
        <div className="field">
          <label>Paket türü</label>
          <input required value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Başlangıç tarihi</label>
            <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="field">
            <label>Bitiş tarihi</label>
            <input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Oluşturuluyor...' : 'Davet kodu oluştur'}</button>
      </form>
    </div>
  );
}
