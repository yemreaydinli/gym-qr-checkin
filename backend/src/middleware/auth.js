const { verifyAccessToken } = require('../utils/jwt');

/**
 * JWT doğrulama middleware'i.
 * Beklenen roller: 'owner' (salon sahibi) veya 'member' (üye).
 * Belirli bir rol zorunlu kılmak için requireRole ile birlikte kullanılır.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme token bulunamadı.' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, role, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

/** Belirtilen role sahip olmayanları reddeder. */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
