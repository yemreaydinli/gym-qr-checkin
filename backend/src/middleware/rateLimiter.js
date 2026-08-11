const rateLimit = require('express-rate-limit');

// Genel API sınırı
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' },
});

// Auth (login/register) uç noktaları için daha sıkı sınır — brute-force koruması
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.' },
});

// Check-in uç noktası için sınır (spam/QR brute-force koruması)
const checkinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla giriş denemesi yapıldı, kısa bir süre bekleyin.' },
});

module.exports = { generalLimiter, authLimiter, checkinLimiter };
