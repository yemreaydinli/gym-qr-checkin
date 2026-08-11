const express = require('express');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireGymOwnership } = require('../middleware/ownership');
const { generateRandomToken } = require('../utils/token');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Geçersiz veri.', details: errors.array() });
  }
  next();
}

// ============= SALON OLUŞTUR =============
router.post(
  '/',
  authenticate,
  requireRole('owner'),
  [
    body('name').trim().notEmpty().withMessage('Salon adı zorunlu.'),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('allowed_radius_meters').optional().isInt({ min: 5, max: 5000 }),
    body('duplicate_check_minutes').optional().isInt({ min: 0, max: 1440 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const {
        name,
        latitude,
        longitude,
        allowed_radius_meters = 100,
        duplicate_check_minutes = 5,
      } = req.body;

      const qr_token = generateRandomToken(24);

      const result = await pool.query(
        `INSERT INTO gyms (owner_id, name, latitude, longitude, allowed_radius_meters, duplicate_check_minutes, qr_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.id, name, latitude, longitude, allowed_radius_meters, duplicate_check_minutes, qr_token]
      );

      res.status(201).json({ gym: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ============= BENİM SALONLARIM =============
router.get('/mine', authenticate, requireRole('owner'), async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM gyms WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ gyms: result.rows });
  } catch (err) {
    next(err);
  }
});

// ============= SALON DETAYI (ownership korumalı) =============
router.get('/:gymId', authenticate, requireRole('owner'), requireGymOwnership, async (req, res, next) => {
  try {
    res.json({ gym: req.gym });
  } catch (err) {
    next(err);
  }
});

// ============= SALON AYARLARINI GÜNCELLE (ownership korumalı) =============
router.patch(
  '/:gymId',
  authenticate,
  requireRole('owner'),
  requireGymOwnership,
  [
    body('name').optional().trim().notEmpty(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('allowed_radius_meters').optional().isInt({ min: 5, max: 5000 }),
    body('duplicate_check_minutes').optional().isInt({ min: 0, max: 1440 }),
    body('is_active').optional().isBoolean(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const fields = ['name', 'latitude', 'longitude', 'allowed_radius_meters', 'duplicate_check_minutes', 'is_active'];
      const updates = [];
      const values = [];
      let idx = 1;

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Güncellenecek alan bulunamadı.' });
      }

      values.push(req.params.gymId);
      const result = await pool.query(
        `UPDATE gyms SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`,
        values
      );

      res.json({ gym: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ============= SABİT QR KODU PNG OLARAK İNDİR (ownership korumalı) =============
router.get('/:gymId/qr', authenticate, requireRole('owner'), requireGymOwnership, async (req, res, next) => {
  try {
    // QR içeriği doğrudan gym_id değil, tahmin edilemez qr_token'dır.
    const qrPayload = JSON.stringify({ t: req.gym.qr_token });
    const pngBuffer = await QRCode.toBuffer(qrPayload, { width: 512, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="gym-qr-${req.params.gymId}.png"`);
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
});

// ============= QR TOKEN'DAN SALON BUL (üye tarafı, herkese açık - sadece temel bilgi döner) =============
router.get('/resolve/:qrToken', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, is_active FROM gyms WHERE qr_token = $1',
      [req.params.qrToken]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geçersiz QR kod.' });
    }

    res.json({ gym: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
