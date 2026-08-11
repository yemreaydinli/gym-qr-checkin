const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireGymOwnership } = require('../middleware/ownership');
const { generateInviteCode } = require('../utils/token');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

const router = express.Router();
const SALT_ROUNDS = 12;

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Sadece resim dosyaları yüklenebilir.'));
    }
    cb(null, true);
  },
});

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Geçersiz veri.', details: errors.array() });
  }
  next();
}

// ============= (SALON SAHİBİ) ÜYE OLUŞTUR + DAVET KODU ÜRET =============
router.post(
  '/gym/:gymId/invite',
  authenticate,
  requireRole('owner'),
  requireGymOwnership,
  [
    body('full_name').trim().notEmpty(),
    body('phone_number').trim().notEmpty(),
    body('package_type').trim().notEmpty(),
    body('start_date').isISO8601(),
    body('end_date').isISO8601(),
    body('invite_expires_hours').optional().isInt({ min: 1, max: 720 }),
  ],
  handleValidation,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { full_name, phone_number, package_type, start_date, end_date, invite_expires_hours = 72 } = req.body;
      const invite_code = generateInviteCode();
      const expiresAt = new Date(Date.now() + invite_expires_hours * 3600 * 1000);

      await client.query('BEGIN');

      const memberResult = await client.query(
        `INSERT INTO members (gym_id, full_name, phone_number, invite_code, invite_code_expires_at, status)
         VALUES ($1, $2, $3, $4, $5, 'invited') RETURNING *`,
        [req.params.gymId, full_name, phone_number, invite_code, expiresAt]
      );

      const member = memberResult.rows[0];

      await client.query(
        `INSERT INTO memberships (member_id, package_type, start_date, end_date)
         VALUES ($1, $2, $3, $4)`,
        [member.id, package_type, start_date, end_date]
      );

      await client.query('COMMIT');

      res.status(201).json({ member, invite_code, invite_expires_at: expiresAt });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Bu telefon numarasıyla salonda zaten bir üye var.' });
      }
      next(err);
    } finally {
      client.release();
    }
  }
);

// ============= (ÜYE) DAVET KODUYLA HESAP OLUŞTURMA =============
router.post(
  '/register',
  [
    body('invite_code').trim().notEmpty(),
    body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı.'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { invite_code, password } = req.body;

      const result = await pool.query('SELECT * FROM members WHERE invite_code = $1', [invite_code]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Geçersiz davet kodu.' });
      }

      const member = result.rows[0];

      if (member.invite_used_at) {
        return res.status(409).json({ error: 'Bu davet kodu daha önce kullanılmış.' });
      }
      if (new Date(member.invite_code_expires_at) < new Date()) {
        return res.status(410).json({ error: 'Davet kodunun süresi dolmuş. Salon ile iletişime geçin.' });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      const updated = await pool.query(
        `UPDATE members
         SET password_hash = $1, status = 'active', invite_used_at = now(), updated_at = now()
         WHERE id = $2 RETURNING id, full_name, gym_id, status`,
        [password_hash, member.id]
      );

      const newMember = updated.rows[0];
      const accessToken = signAccessToken({ id: newMember.id, role: 'member', gym_id: newMember.gym_id });
      const refreshToken = signRefreshToken({ id: newMember.id, role: 'member', gym_id: newMember.gym_id });

      res.status(201).json({ member: newMember, accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }
);

// ============= (ÜYE) KENDİ PROFİLİNİ GÖRÜNTÜLE =============
router.get('/me', authenticate, requireRole('member'), async (req, res, next) => {
  try {
    const memberResult = await pool.query(
      `SELECT m.id, m.full_name, m.phone_number, m.photo_url, m.status, m.gym_id, g.name AS gym_name
       FROM members m JOIN gyms g ON g.id = m.gym_id
       WHERE m.id = $1`,
      [req.user.id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Üye bulunamadı.' });
    }

    const membershipResult = await pool.query(
      `SELECT package_type, start_date, end_date, frozen,
              CASE
                WHEN frozen THEN 'frozen'
                WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 'active'
                ELSE 'expired'
              END AS computed_status
       FROM memberships WHERE member_id = $1
       ORDER BY end_date DESC LIMIT 1`,
      [req.user.id]
    );

    res.json({ member: memberResult.rows[0], membership: membershipResult.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// ============= (ÜYE) PROFİL FOTOĞRAFI YÜKLE =============
router.post('/me/photo', authenticate, requireRole('member'), upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fotoğraf yüklenmedi.' });

    const photo_url = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE members SET photo_url = $1, updated_at = now() WHERE id = $2', [photo_url, req.user.id]);

    res.json({ photo_url });
  } catch (err) {
    next(err);
  }
});

// ============= (SALON SAHİBİ) ÜYE LİSTESİ (ownership korumalı) =============
router.get('/gym/:gymId', authenticate, requireRole('owner'), requireGymOwnership, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.full_name, m.phone_number, m.photo_url, m.status, m.created_at,
              ms.package_type, ms.start_date, ms.end_date, ms.frozen,
              CASE
                WHEN ms.frozen THEN 'frozen'
                WHEN CURRENT_DATE BETWEEN ms.start_date AND ms.end_date THEN 'active'
                WHEN ms.end_date IS NULL THEN 'unknown'
                ELSE 'expired'
              END AS membership_status
       FROM members m
       LEFT JOIN LATERAL (
         SELECT * FROM memberships WHERE member_id = m.id ORDER BY end_date DESC LIMIT 1
       ) ms ON true
       WHERE m.gym_id = $1
       ORDER BY m.created_at DESC`,
      [req.params.gymId]
    );

    res.json({ members: result.rows });
  } catch (err) {
    next(err);
  }
});

// ============= (SALON SAHİBİ) ÜYE ASKIYA AL / AKTİFLEŞTİR (ownership korumalı) =============
router.patch(
  '/gym/:gymId/member/:memberId/status',
  authenticate,
  requireRole('owner'),
  requireGymOwnership,
  [body('status').isIn(['active', 'suspended'])],
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `UPDATE members SET status = $1, updated_at = now()
         WHERE id = $2 AND gym_id = $3 RETURNING id, full_name, status`,
        [req.body.status, req.params.memberId, req.params.gymId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Üye bu salonda bulunamadı.' });
      }

      res.json({ member: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
