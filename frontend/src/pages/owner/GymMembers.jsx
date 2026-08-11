import { useEffect, useState } from 'react';
import { ownerApi, API_URL } from '../../api/client';

const STATUS_LABELS = {
  active: { label: 'Aktif', cls: 'badge-success' },
  expired: { label: 'Süresi dolmuş', cls: 'badge-danger' },
  frozen: { label: 'Dondurulmuş', cls: 'badge-warning' },
  unknown: { label: 'Paket yok', cls: 'badge-muted' },
};

export default function GymMembers({ gym }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    ownerApi.get(`/members/gym/${gym.id}`)
      .then(({ data }) => setMembers(data.members))
      .catch((err) => setError(err.response?.data?.error || 'Üyeler yüklenemedi.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [gym.id]);

  async function toggleStatus(member) {
    const newStatus = member.status === 'suspended' ? 'active' : 'suspended';
    try {
      await ownerApi.patch(`/members/gym/${gym.id}/member/${member.id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Durum güncellenemedi.');
    }
  }

  return (
    <div>
      <h2>Üyeler</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p className="text-dim">Yükleniyor...</p>
      ) : members.length === 0 ? (
        <div className="card empty-state"><p>Henüz üye eklenmedi. "Üye Davet Et" sekmesinden başla.</p></div>
      ) : (
        <div className="card">
          {members.map((m) => {
            const st = STATUS_LABELS[m.membership_status] || STATUS_LABELS.unknown;
            return (
              <div key={m.id} className="list-row">
                <div className="avatar">
                  {m.photo_url ? <img src={`${API_URL}${m.photo_url}`} alt={m.full_name} /> : m.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{m.full_name}</div>
                  <div className="text-dim text-sm mono">{m.phone_number} · {m.package_type || '—'}</div>
                </div>
                <span className={`badge ${st.cls}`} style={{ marginRight: 10 }}>{st.label}</span>
                <button
                  className={`btn btn-sm ${m.status === 'suspended' ? 'btn-secondary' : 'btn-danger'}`}
                  onClick={() => toggleStatus(m)}
                >
                  {m.status === 'suspended' ? 'Aktifleştir' : 'Askıya al'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
