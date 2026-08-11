import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <span>Spor Salonu QR Giriş</span>
        </div>
      </div>
      <div className="page" style={{ maxWidth: 640 }}>
        <h1>Turnikesiz üyelik doğrulama</h1>
        <p className="subtitle">
          Sabit bir QR kod + konum doğrulaması ile ek donanım maliyeti olmadan giriş kontrolü.
        </p>

        <div className="grid-2">
          <div className="card">
            <h2>Salon Sahibiyim</h2>
            <p className="text-dim text-sm" style={{ marginBottom: 16 }}>
              Salonunu kaydet, QR kodunu oluştur, üyelerini davet et ve canlı giriş ekranını izle.
            </p>
            <Link to="/owner/login" className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>Giriş yap</Link>
            <Link to="/owner/register" className="btn btn-secondary btn-block">Salon kaydı oluştur</Link>
          </div>

          <div className="card">
            <h2>Üyeyim</h2>
            <p className="text-dim text-sm" style={{ marginBottom: 16 }}>
              Davet kodunla hesabını oluştur, salona vardığında QR'ı okut ve gir.
            </p>
            <Link to="/member/login" className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>Giriş yap</Link>
            <Link to="/member/register" className="btn btn-secondary btn-block">Davet koduyla kaydol</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
