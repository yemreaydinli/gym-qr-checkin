const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireGymOwnership } = require('../middleware/ownership');
const { haversineDistanceMeters } = require('../utils/haversine');
const { emitToGym } = require('../socket');
const { checkinLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Geçersiz veri.', details: errors.array() });
  }
  next();
}

// Konum doğruluğu (accuracy) bu değerden (metre) kötüyse veya izin verilen
// yarıçaptan büyükse konum güvenilir sayılmaz.
const MAX_ACCEPTABLE_ACCURACY_METERS = 100;

/** Ortak yardımcı: bir check-in kaydı yazar ve ilgili salon canlı ekranına yayınlar. */
async function recordCheckin({ member_id, gym_id, latitude, longitude, accuracy_meters, distance_meters, result }) {
  const inserted = await pool.query(
    `INSERT INTO checkins (member_id, gym_id, latitude, longitude, accuracy_meters, distance_meters, result)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [member_id, gym_id, latitude, longitude, accuracy_meters, distance_meters, result]
  );
  return inserted.rows[0];
}

// ============= (ÜYE) QR OKUTUP GİRİŞ YAP =============
router.post(
  '/',
  checkinLimiter,
  authenticate,
  requireRole('member'),
  [
    body('qr_token').notEmpty().withMessage('QR verisi eksik.'),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('accuracy').isFloat({ min: 0 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { qr_token, latitude, longitude, accuracy } = req.body;

      // 1) QR token'dan salonu bul (gym_id doğrudan kullanılmıyor)
      const gymResult = await pool.query('SELECT * FROM gyms WHERE qr_token = $1', [qr_token]);
      if (gymResult.rows.length === 0 || !gymResult.rows[0].is_active) {
        const failed = await recordCheckin({
          member_id: req.user.id, gym_id: null, latitude, longitude,
          accuracy_meters: accuracy, distance_meters: null, result: 'failed_invalid_qr',
        });
        return res.status(404).json({ error: 'Geçersiz veya pasif QR kod.', checkin: failed });
      }
      const gym = gymResult.rows[0];

      // 2) Üyenin gerçekten BU salona ait olduğunu doğrula (yanlış salon QR'ı okutma senaryosu)
      const memberResult = await pool.query('SELECT * FROM members WHERE id = $1', [req.user.id]);
      const member = memberResult.rows[0];

      if (!member || member.gym_id !== gym.id) {
        const failed = await recordCheckin({
          member_id: req.user.id, gym_id: gym.id, latitude, longitude,
          accuracy_meters: accuracy, distance_meters: null, result: 'failed_wrong_gym',
        });
        return res.status(403).json({ error: 'Bu QR kod sizin üyesi olduğunuz salona ait değil.', checkin: failed });
      }

      if (member.status === 'suspended') {
        const failed = await recordCheckin({
          member_id: member.id, gym_id: gym.id, latitude, longitude,
          accuracy_meters: accuracy, distance_meters: null, result: 'failed_suspended',
        });
        return res.status(403).json({ error: 'Üyeliğiniz askıya alınmış.', checkin: failed });
      }

      // 3) Konum doğruluğu (accuracy) çok kötüyse konumu güvenilir sayma
      if (accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
        const failed = await recordCheckin({
          member_id: member.id, gym_id: gym.id, latitude, longitude,
          accuracy_meters: accuracy, distance_meters: null, result: 'failed_low_accuracy',
        });
        emitToGym(gym.id, 'checkin-result', buildBroadcast(member, failed, null));
        return res.status(400).json({
          error: `Konum doğruluğu yetersiz (±${Math.round(accuracy)}m). Açık bir alanda tekrar deneyin.`,
          checkin: failed,
        });
      }

      // 4) Mesafe hesapla (Haversine) ve izin verilen yarıçapla karşılaştır
      const distance = haversineDistanceMeters(latitude, longitude, gym.latitude, gym.longitude);
      if (distance > gym.allowed_radius_meters) {
        const failed = await recordCheckin({
          member_id: member.id, gym_id: gym.id, latitude, longitude,
          accuracy_meters: accuracy, distance_meters: distance, result: 'failed_out_of_range',
        });
        emitToGym(gym.id, 'checkin-result', buildBroadcast(member, failed, null));
        return res.status(400).json({
          error: `Salon dışındasınız (yaklaşık ${Math.round(distance)}m uzaklıkta, izin verilen ${gym.allowed_radius_meters}m).`,
          checkin: failed,
        });
      }

      // 5) Mükerrer giriş kontrolü (salon bazlı ayarlanabilir süre)
      const dupWindowMinutes = gym.duplicate_check_minutes;
      if (dupWindowMinutes > 0) {
        const recentResult = await pool.query(
          `SELECT id FROM checkins
           WHERE member_id = $1 AND gym_id = $2 AND result = 'success'
             AND "timestamp" > now() - ($3 || ' minutes')::interval
           ORDER BY "timestamp" DESC LIMIT 1`,
          [member.id, gym.id, dupWindowMinutes]
        );
        if (recentResult.rows.length > 0) {
          const failed = await recordCheckin({
            member_id: member.id, gym_id: gym.id, latitude, longitude,
            accuracy_meters: accuracy, distance_meters: distance, result: 'duplicate',
          });
          emitToGym(gym.id, 'checkin-result', buildBroadcast(member, failed, null));
          return res.status(429).json({
            error: `Zaten yakın zamanda giriş yaptınız. Lütfen ${dupWindowMinutes} dakika bekleyin.`,
            checkin: failed,
          });
        }
      }

      // 6) Üyelik durumunu tarihe göre otomatik hesapla
      const membershipResult = await pool.query(
        `SELECT *,
                CASE
                  WHEN frozen THEN 'frozen'
                  WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 'active'
                  ELSE 'expired'
                END AS computed_status
         FROM memberships WHERE member_id = $1 ORDER BY end_date DESC LIMIT 1`,
        [member.id]
      );
      const membership = membershipResult.rows[0];

      if (!membership || membership.computed_status !== 'active') {
        const failed = await recordCheckin({
          member_id: member.id, gym_id: gym.id, latitude, longitude,
          accuracy_meters: accuracy, distance_meters: distance, result: 'failed_expired_membership',
        });
        emitToGym(gym.id, 'checkin-result', buildBroadcast(member, failed, membership));
        return res.status(403).json({
          error: membership && membership.computed_status === 'frozen'
            ? 'Üyeliğiniz dondurulmuş.'
            : 'Üyeliğinizin süresi dolmuş. Lütfen salon ile iletişime geçin.',
          checkin: failed,
        });
      }

      // 7) BAŞARILI GİRİŞ
      const success = await recordCheckin({
        member_id: member.id, gym_id: gym.id, latitude, longitude,
        accuracy_meters: accuracy, distance_meters: distance, result: 'success',
      });

      emitToGym(gym.id, 'checkin-result', buildBroadcast(member, success, membership));

      res.status(201).json({ checkin: success, distance_meters: Math.round(distance), membership });
    } catch (err) {
      next(err);
    }
  }
);

function buildBroadcast(member, checkin, membership) {
  return {
    checkin_id: checkin.id,
    result: checkin.result,
    timestamp: checkin.timestamp,
    distance_meters: checkin.distance_meters,
    member: {
      id: member.id,
      full_name: member.full_name,
      photo_url: member.photo_url,
    },
    membership_status: membership ? membership.computed_status : null,
    membership_end_date: membership ? membership.end_date : null,
  };
}

// ============= (SALON SAHİBİ) GİRİŞ GEÇMİŞİ / RAPORLAMA (ownership korumalı) =============
router.get('/gym/:gymId', authenticate, requireRole('owner'), requireGymOwnership, async (req, res, next) => {
  try {
    const { limit = 100, offset = 0, result } = req.query;

    const params = [req.params.gymId];
    let filter = '';
    if (result) {
      params.push(result);
      filter = `AND c.result = $${params.length}`;
    }
    params.push(Math.min(Number(limit) || 100, 500));
    params.push(Number(offset) || 0);

    const query = `
      SELECT c.*, m.full_name, m.photo_url
      FROM checkins c
      LEFT JOIN members m ON m.id = c.member_id
      WHERE c.gym_id = $1 ${filter}
      ORDER BY c."timestamp" DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const historyResult = await pool.query(query, params);
    res.json({ checkins: historyResult.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
