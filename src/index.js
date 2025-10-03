// src/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();

// --- Env guards (helpful for Stripe setup) ---
if (!process.env.STRIPE_SECRET) console.warn('⚠️  STRIPE_SECRET is not set');
if (!process.env.STRIPE_WEBHOOK_SECRET) console.warn('⚠️  STRIPE_WEBHOOK_SECRET is not set');
if (!process.env.JWT_SECRET) console.warn('⚠️  JWT_SECRET is not set');

// --- Trust proxy (Heroku/Proxies) ---
app.set('trust proxy', 1);

// --- Pre-seed locals to avoid race before IO wiring ---
app.locals.emitToUser = () => {};
app.locals.io = null;

// --- CORS (MUST be before routes) ---
const baseAllowed = new Set([
  'https://wordto3d.com',
  'https://www.wordto3d.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://prompt-to-3d-spark.lovable.app',
  'https://bright-logic-nexus.lovable.app',
  'https://techsoftbg.com',
  'https://super-deteto-magic.lovable.app',
  'https://super-deteto.com'

]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (baseAllowed.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith('.lovable.app')) return true;
  } catch {}
  return false;
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.warn('HTTP CORS blocked origin:', origin);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  exposedHeaders: ['Content-Length','Content-Type'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// --- 🔒 Stripe webhook MUST be first and use RAW BODY ---
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/webhook')
);

// --- Parsers & logging (AFTER webhook) ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// --- MongoDB connect (fail fast) ---
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI/MONGODB_URI');
  process.exit(1);
}
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);

async function connectDB() {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
    maxPoolSize: 10
  });
  console.log('✅ MongoDB connected');
}

// --- Health endpoints ---
app.get('/', (_req, res) => res.json({ ok: true }));
app.get('/healthz', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  res.status(dbState === 'connected' ? 200 : 503).json({ db: dbState });
});

// --- Routes ---
app.use('/api', require('./routes/stripe'));
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/kidsgenerations'));

// --- 404 & error handler ---
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: 'Server error', details: err.message });
});

// --- Start server + Socket.IO ---
const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin(origin, cb) {
          if (isAllowedOrigin(origin)) return cb(null, true);
          console.warn('WS CORS blocked origin:', origin);
          return cb(new Error('WS CORS: origin not allowed'));
        },
        credentials: true,
      },
      pingInterval: 25000,
      pingTimeout: 20000,
      transports: ['websocket', 'polling'],
    });

    // --- Socket auth ---
    io.use((socket, next) => {
      try {
        let token =
          socket.handshake.auth?.token ||
          socket.handshake.query?.token ||
          socket.handshake.headers?.authorization;

        if (token && typeof token === 'string' && token.startsWith('Bearer '))
          token = token.slice(7);
        if (!token) return next(new Error('no auth token'));

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const uid = String(
          payload.id ??
          payload._id ??
          payload.userId ??
          payload.user_id ??
          payload.sub ??
          ''
        );
        if (!uid) return next(new Error('token has no user id'));

        socket.user = { id: uid };
        return next();
      } catch (e) {
        return next(new Error('invalid token'));
      }
    });

    io.on('connection', (socket) => {
      const room = `user:${socket.user.id}`;
      socket.join(room);
      const size = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`[WS] connected uid=${socket.user.id} room=${room} socketsInRoom=${size}`);
      socket.emit('ws:connected', { ok: true, room });

      socket.on('disconnect', (reason) => {
        console.log(`[WS] disconnected uid=${socket.user.id} reason=${reason}`);
      });
    });

    function emitToUser(userId, event, payload) {
      io.to(`user:${userId}`).emit(event, payload);
    }
    app.locals.emitToUser = emitToUser;
    app.locals.io = io;

    server.listen(PORT, () => console.log(`Listening on :${PORT}`));

    server.setTimeout(180000);
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  })
  .catch((err) => {
    console.error('❌ DB connect error:', err);
    process.exit(1);
  });

// --- Safety ---
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});
