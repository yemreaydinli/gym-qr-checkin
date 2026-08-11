export default function TopBar({ title, onLogout, right }) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-mark">Q</span>
        <span>{title || 'QR Giriş'}</span>
      </div>
      <div className="topbar-actions">
        {right}
        {onLogout && (
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Çıkış yap</button>
        )}
      </div>
    </div>
  );
}
