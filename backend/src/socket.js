const { verifyAccessToken } = require('./utils/jwt');
const { pool } = require('./config/db');

let ioInstance = null;

/**
 * Socket.io kurulumu.
 * Salon sahibi ekranı yalnızca kendi salonuna ait "gym:{id}" odasına
 * katılabilir. Odaya katılmadan önce JWT + owner_id doğrulaması yapılır
 * (madde 8'deki multi-tenant kuralının socket tarafındaki karşılığı) —
 * aksi halde biri gym_id'yi tahmin ederek başka salonun canlı ekranını izleyebilirdi.
 */
function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('join-gym-room', async ({ gymId, token }) => {
      try {
        if (!gymId || !token) return;

        const decoded = verifyAccessToken(token);
        if (decoded.role !== 'owner') return;

        const result = await pool.query('SELECT owner_id FROM gyms WHERE id = $1', [gymId]);
        if (result.rows.length === 0) return;
        if (result.rows[0].owner_id !== decoded.id) return; // sahiplik doğrulanmadı

        socket.join(`gym:${gymId}`);
        socket.emit('joined-gym-room', { gymId });
      } catch (err) {
        // sessizce yoksay - geçersiz token/salon
      }
    });

    socket.on('disconnect', () => {
      // temizlik gerekmiyor - socket.io odaları otomatik yönetir
    });
  });
}

/** Belirli bir salonun canlı ekranına olay yayınlar. */
function emitToGym(gymId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`gym:${gymId}`).emit(event, payload);
}

module.exports = { initSocket, emitToGym };
