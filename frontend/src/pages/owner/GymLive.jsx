import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, getStoredTokens } from '../../api/client';

const RESULT_LABELS = {
  success: 'Giriş başarılı',
  failed_out_of_range: 'Salon dışında',
  failed_low_accuracy: 'Konum doğruluğu düşük',
  failed_expired_membership: 'Üyelik süresi dolmuş',
  duplicate: 'Mükerrer giriş denemesi',
  failed_wrong_gym: 'Yanlış salon QR\'ı',
  failed_invalid_qr: 'Geçersiz QR',
  failed_suspended: 'Üyelik askıya alınmış',
};

export default function GymLive({ gym }) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const tokens = getStoredTokens('owner');
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-gym-room', { gymId: gym.id, token: tokens?.accessToken });
    });

    socket.on('joined-gym-room', () => setConnected(true));

    socket.on('checkin-result', (payload) => {
      setEvents((prev) => [payload, ...prev].slice(0, 50));
    });

    socket.on('disconnect', () => setConnected(false));

    return () => socket.disconnect();
  }, [gym.id]);

  return (
    <div>
      <div className="card-title-row">
        <h2>Anlık giriş akışı</h2>
        <span className={`badge ${connected ? 'badge-success' : 'badge-muted'}`}>
          {connected ? '● Canlı' : '○ Bağlanıyor...'}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="card empty-state">
          <p>Henüz bir giriş denemesi yok. Bir üye QR kodu okuttuğunda burada anında görünecek.</p>
        </div>
      ) : (
        <div className="live-feed">
          {events.map((ev) => {
            const isSuccess = ev.result === 'success';
            return (
              <div key={ev.checkin_id} className={`live-card ${isSuccess ? 'success' : 'failed'}`}>
                <div className="live-avatar">
                  {ev.member?.photo_url
                    ? <img src={`${API_URL}${ev.member.photo_url}`} alt={ev.member.full_name} />
                    : (ev.member?.full_name || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{ev.member?.full_name || 'Bilinmeyen üye'}</div>
                  <div className="text-dim text-sm mono">
                    {new Date(ev.timestamp).toLocaleTimeString('tr-TR')}
                    {ev.distance_meters != null && ` · ${Math.round(ev.distance_meters)}m`}
                  </div>
                </div>
                <span className={`badge ${isSuccess ? 'badge-success' : 'badge-danger'}`}>
                  {RESULT_LABELS[ev.result] || ev.result}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
