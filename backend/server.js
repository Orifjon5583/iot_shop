require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const path       = require('path');
const hpp        = require('hpp');
const session    = require('express-session');
const passport   = require('passport');
const cookieParser = require('cookie-parser');
const { connectDB, prisma } = require('./config/db');
const logger     = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes    = require('./routes/authRoutes');
const orderRoutes   = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const bannerRoutes  = require('./routes/bannerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const readyProductRoutes = require('./routes/readyProductRoutes');
const userRoutes    = require('./routes/userRoutes');
const reviewRoutes  = require('./routes/reviewRoutes');

require('./config/passport');

const app = express();

// ─── 2. Trust proxy (Render / Railway behind proxy) ─────────────────────────
app.set('trust proxy', 1);

// ─── 3. Security headers ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ─── 4. CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .concat([
    process.env.FRONTEND_URL,
    process.env.ADMIN_PANEL_URL,
    'http://localhost:5173',
    'http://localhost:5174',
  ])
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    cb(new Error('CORS: ruxsatsiz manba'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());

// ─── 5. Body parsers ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── 6. Static uploads ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── 7. HPP ──────────────────────────────────────────────────────────────────
app.use(hpp());

// ─── 8. Rate limiting ────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── 9. Session (Passport uchun) ─────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── 10. Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payment',  paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/banners',  bannerRoutes);
app.use('/api/messages', messageRoutes)
app.use('/api/sitemap.xml', require('./routes/sitemap'));
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ready-products', readyProductRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/reviews',  reviewRoutes);

// ─── 11. Health check ────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date() }));
app.get('/', (req, res) => res.json({ message: 'IoT Market API', version: '1.0.0' }));

// ─── 12. 404 ─────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Endpoint topilmadi' }));

// ─── 13. Global error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Serverda xatolik' : err.message,
  });
});

// ─── 14. Start ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server started`, { port: PORT, env: process.env.NODE_ENV || 'development' });
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM: shutting down');
    server.close(() => logger.info('HTTP server closed'));
    await prisma.$disconnect();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  });
})();

module.exports = app;
