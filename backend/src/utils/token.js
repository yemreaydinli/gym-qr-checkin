const crypto = require('crypto');

/** Tahmin edilemez, URL güvenli rastgele token üretir (QR ve davet kodları için). */
function generateRandomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** İnsan tarafından okunabilir daha kısa davet kodu (örn. 8 karakter). */
function generateInviteCode() {
  return crypto.randomBytes(6).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

module.exports = { generateRandomToken, generateInviteCode };
