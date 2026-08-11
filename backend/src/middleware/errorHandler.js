// Merkezi hata yakalayıcı - beklenmeyen hatalarda tutarlı JSON yanıtı döner.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Geçersiz JSON gövdesi.' });
  }

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Sunucu hatası oluştu.'
    : err.message || 'Sunucu hatası oluştu.';

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
