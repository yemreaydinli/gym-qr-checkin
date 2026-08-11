const { pool } = require('../config/db');

/**
 * KRİTİK GÜVENLİK KURALI (proje ana hattı madde 8):
 * Hiçbir kullanıcı, istekteki gym_id'yi değiştirerek başka bir salonun
 * verisine erişememeli. Bu middleware, JWT'deki user_id'nin, istekte
 * belirtilen (params/body) gym_id'nin sahibiyle eşleştiğini doğrular.
 *
 * Sadece JWT'nin geçerli olması yeterli değildir — her istekte
 * "gym.owner_id === req.user.id" kontrolü mutlaka yapılır.
 */
async function requireGymOwnership(req, res, next) {
  try {
    const gymId = req.params.gymId || req.body.gym_id || req.query.gym_id;

    if (!gymId) {
      return res.status(400).json({ error: 'gym_id belirtilmedi.' });
    }

    const result = await pool.query('SELECT id, owner_id FROM gyms WHERE id = $1', [gymId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salon bulunamadı.' });
    }

    const gym = result.rows[0];

    if (gym.owner_id !== req.user.id) {
      // Bilinçli olarak "403 forbidden" değil "404 not found" ile karışık
      // bilgi sızdırmamak da tercih edilebilir; burada net 403 kullanıyoruz.
      return res.status(403).json({ error: 'Bu salona erişim yetkiniz yok.' });
    }

    req.gym = gym;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireGymOwnership };
