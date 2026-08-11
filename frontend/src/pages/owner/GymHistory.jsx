import { useEffect, useState } from 'react';
import { ownerApi } from '../../api/client';

const RESULT_LABELS = {
  success: { label: 'Başarılı', cls: 'badge-success' },
  failed_out_of_range: { label: 'Salon dışında', cls: 'badge-danger' },
  failed_low_accuracy: { label: 'Düşük konum doğruluğu', cls: 'badge-danger' },
  failed_expired_membership: { label: 'Üyelik dolmuş', cls: 'badge-danger' },
  duplicate: { label: 'Mükerrer', cls: 'badge-warning' },
  failed_wrong_gym: { label: 'Yanlış salon', cls: 'badge-danger' },
  failed_invalid_qr: { label: 'Geçersiz QR', cls: 'badge-danger' },
  failed_suspended: { label: 'Askıda üye', cls: 'badge-danger' },
};

export default function GymHistory({ gym }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = filter ? { result: filter } : {};
    ownerApi.get(`/checkins/gym/${gym.id}`, { params })
      .then(({ data }) => setCheckins(data.checkins))
      .catch((err) => setError(err.response?.data?.error || 'Geçmiş yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [gym.id, filter]);

  return (
    <div>
      <div className="card-title-row">
        <h2>Giriş geçmişi</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
          <option value="">Tümü</option>
          <option value="success">Sadece başarılı</option>
          <option value="duplicate">Mükerrer</option>
          <option value="failed_out_of_range">Salon dışı</option>
          <option value="failed_expired_membership">Üyelik dolmuş</option>
        </select>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p className="text-dim">Yükleniyor...</p>
      ) : checkins.length === 0 ? (
        <div className="card empty-state"><p>Kayıt bulunamadı.</p></div>
      ) : (
        <div className="card">
          {checkins.map((c) => {
            const r = RESULT_LABELS[c.result] || { label: c.result, cls: 'badge-muted' };
            return (
              <div key={c.id} className="list-row">
                <div className="avatar">{(c.full_name || '?').slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{c.full_name || 'Bilinmeyen üye'}</div>
                  <div className="text-dim text-sm mono">
                    {new Date(c.timestamp).toLocaleString('tr-TR')}
                    {c.distance_meters != null && ` · ${Math.round(c.distance_meters)}m`}
                  </div>
                </div>
                <span className={`badge ${r.cls}`}>{r.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
