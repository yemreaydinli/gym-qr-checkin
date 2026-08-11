require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Server } = require('socket.io');

const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./socket');

const authRoutes = require('./routes/auth.routes');
const gymRoutes = require('./routes/gym.routes');
const memberRoutes = require('./routes/member.routes');
const checkinRoutes = require('./routes/checkin.routes');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});
initSocket(io);

// ---- Güvenlik middleware'leri ----
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(generalLimiter);

// Yüklenen fotoğraflar (statik)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Sağlık kontrolü ----
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- Route'lar ----
app.use('/api/auth', authRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/checkins', checkinRoutes);

// ---- 404 ----
app.use((req, res) => res.status(404).json({ error: 'Uç nokta bulunamadı.' }));

// ---- Merkezi hata yakalayıcı ----
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🏋️  QR Gym backend ${PORT} portunda çalışıyor (${process.env.NODE_ENV || 'development'})`);
});
