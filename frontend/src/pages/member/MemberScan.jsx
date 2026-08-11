import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { memberApi } from '../../api/client';
import TopBar from '../../components/TopBar.jsx';

// Akış: 'scanning' -> 'locating' -> 'submitting' -> 'success' | 'failed'
export default function MemberScan() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('scanning');
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);
  const scannerRef = useRef(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'scanning') return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    stoppedRef.current = false;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async (decodedText) => {
        if (stoppedRef.current) return;
        stoppedRef.current = true;
        await stopScanner();
        handleDecoded(decodedText);
      },
      () => {} // tarama sırasında bulunamayan frame hataları - yoksay
    ).catch(() => {
      setPhase('failed');
      setMessage('Kamera başlatılamadı. Kamera izni verildiğinden emin olun.');
    });

    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function stopScanner() {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch { /* zaten durmuş olabilir */ }
  }

  function handleDecoded(decodedText) {
    let qrToken;
    try {
      const parsed = JSON.parse(decodedText);
      qrToken = parsed.t;
    } catch {
      qrToken = decodedText; // düz metin QR de destekle
    }
    if (!qrToken) {
      setPhase('failed');
      setMessage('QR kod okunamadı.');
      return;
    }

    setPhase('locating');

    if (!navigator.geolocation) {
      setPhase('failed');
      setMessage('Cihazınız konum servisini desteklemiyor.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => submitCheckin(qrToken, pos.coords),
      () => {
        setPhase('failed');
        setMessage('Konum izni verilmedi. Giriş yapabilmek için konum gereklidir.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function submitCheckin(qr_token, coords) {
    setPhase('submitting');
    try {
      const { data } = await memberApi.post('/checkins', {
        qr_token,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });
      setPhase('success');
      setDetail({ distance: data.distance_meters });
      setMessage('Giriş başarılı!');
    } catch (err) {
      setPhase('failed');
      setMessage(err.response?.data?.error || 'Giriş yapılamadı.');
    }
  }

  function retry() {
    setMessage('');
    setDetail(null);
    setPhase('scanning');
  }

  return (
    <div className="app-shell">
      <TopBar title="QR Okut" />
      <div className="page page-narrow">
        {phase === 'scanning' && (
          <>
            <h1>QR kodu okut</h1>
            <p className="subtitle">Salon girişindeki sabit QR kodu kameraya göster.</p>
            <div id="qr-reader" style={{ width: '100%' }} />
          </>
        )}

        {phase === 'locating' && (
          <div className="scan-status">
            <div className="icon-circle loading">📍</div>
            <h2>Konum alınıyor...</h2>
            <p className="text-dim">Doğru sonuç için açık bir alanda olduğundan emin olun.</p>
          </div>
        )}

        {phase === 'submitting' && (
          <div className="scan-status">
            <div className="icon-circle loading">⏳</div>
            <h2>Doğrulanıyor...</h2>
          </div>
        )}

        {phase === 'success' && (
          <div className="scan-status">
            <div className="icon-circle success">✓</div>
            <h2>{message}</h2>
            {detail?.distance != null && <p className="text-dim mono">Salona uzaklık: ~{detail.distance}m</p>}
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/member/home')}>Ana ekrana dön</button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="scan-status">
            <div className="icon-circle failed">✕</div>
            <h2>Giriş yapılamadı</h2>
            <p className="text-dim">{message}</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={retry}>Tekrar dene</button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/member/home')}>Ana ekrana dön</button>
          </div>
        )}
      </div>
    </div>
  );
}
