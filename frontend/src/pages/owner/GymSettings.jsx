import { useState } from 'react';
import { ownerApi, API_URL, getStoredTokens } from '../../api/client';

export default function GymSettings({ gym, onUpdated }) {
  const [form, setForm] = useState({
    name: gym.name,
    allowed_radius_meters: gym.allowed_radius_meters,
    duplicate_check_minutes: gym.duplicate_check_minutes,
    is_active: gym.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const { data } = await ownerApi.patch(`/gyms/${gym.id}`, {
        ...form,
        allowed_radius_meters: Number(form.allowed_radius_meters),
        duplicate_check_minutes: Number(form.duplicate_check_minutes),
      });
      onUpdated(data.gym);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadQr() {
    const tokens = getStoredTokens('owner');
    const res = await fetch(`${API_URL}/api/gyms/${gym.id}/qr`, {
      headers: { Authorization: `Bearer ${tokens?.accessToken}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gym.name.replace(/\s+/g, '-')}-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h2>Salon Ayarları</h2>

      <div className="card">
        <div className="card-title-row"><h3 style={{ margin: 0 }}>Sabit giriş QR kodu</h3></div>
        <p className="text-dim text-sm">Bu QR'ı yazdırıp salon girişine asın. İçeriği tahmin edilemez bir token'dır, salon ID'si değil.</p>
        <button className="btn btn-secondary" onClick={downloadQr}>QR kodunu indir (PNG)</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {saved && <div className="alert alert-success">Ayarlar kaydedildi.</div>}

      <form onSubmit={handleSave} className="card">
        <div className="field">
          <label>Salon adı</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>GPS yarıçapı (metre)</label>
            <input type="number" min={5} max={5000} value={form.allowed_radius_meters} onChange={(e) => setForm({ ...form, allowed_radius_meters: e.target.value })} />
          </div>
          <div className="field">
            <label>Mükerrer bekleme (dk)</label>
            <input type="number" min={0} max={1440} value={form.duplicate_check_minutes} onChange={(e) => setForm({ ...form, duplicate_check_minutes: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Durum</label>
          <select value={form.is_active ? '1' : '0'} onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 12px' }}>
            <option value="1">Aktif</option>
            <option value="0">Pasif (girişler reddedilir)</option>
          </select>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
      </form>
    </div>
  );
}
