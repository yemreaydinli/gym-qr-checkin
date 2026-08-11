const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const SALT_ROUNDS = 12;

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Geçersiz veri.', details: errors.array() });
  }
  next();
}

// ============= SALON SAHİBİ KAYIT =============
router.post(
  '/owner/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Geçerli bir e-posta girin.'),
    body('password').isLength({ min: 8 }).withMessage('Şifre en az 8 karakter olmalı.'),
    body('full_name').trim().notEmpty().withMessage('Ad soyad zorunlu.'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password, full_name } = req.body;

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Bu e-posta ile zaten bir hesap var.' });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at`,
        [email.toLowerCase(), password_hash, full_name]
      );

      const user = result.rows[0];
      const accessToken = signAccessToken({ id: user.id, role: 'owner', email: user.email });
      const refreshToken = signRefreshToken({ id: user.id, role: 'owner' });

      res.status(201).json({ user, accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }
);

// ============= SALON SAHİBİ GİRİŞ =============
router.post(
  '/owner/login',
  authLimiter,
  [body('email').isEmail(), body('password').notEmpty()],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
      }

      const accessToken = signAccessToken({ id: user.id, role: 'owner', email: user.email });
      const refreshToken = signRefreshToken({ id: user.id, role: 'owner' });

      res.json({
        user: { id: user.id, email: user.email, full_name: user.full_name },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============= ÜYE GİRİŞ (telefon + şifre, SMS doğrulama yok) =============
router.post(
  '/member/login',
  authLimiter,
  [body('phone_number').notEmpty(), body('password').notEmpty(), body('gym_id').notEmpty()],
  handleValidation,
  async (req, res, next) => {
    try {
      const { phone_number, password, gym_id } = req.body;

      const result = await pool.query(
        'SELECT * FROM members WHERE phone_number = $1 AND gym_id = $2',
        [phone_number, gym_id]
      );

      if (result.rows.length === 0 || !result.rows[0].password_hash) {
        return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı.' });
      }

      const member = result.rows[0];

      if (member.status === 'suspended') {
        return res.status(403).json({ error: 'Üyeliğiniz askıya alınmış. Lütfen salon ile iletişime geçin.' });
      }

      const match = await bcrypt.compare(password, member.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı.' });
      }

      const accessToken = signAccessToken({ id: member.id, role: 'member', gym_id: member.gym_id });
      const refreshToken = signRefreshToken({ id: member.id, role: 'member', gym_id: member.gym_id });

      res.json({
        member: { id: member.id, full_name: member.full_name, gym_id: member.gym_id },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============= TOKEN YENİLEME =============
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken zorunlu.' });

    const decoded = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({
      id: decoded.id,
      role: decoded.role,
      gym_id: decoded.gym_id,
      email: decoded.email,
    });

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş refresh token.' });
  }
});

module.exports = router;
