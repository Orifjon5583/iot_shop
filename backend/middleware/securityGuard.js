const crypto = require('crypto');
let logger;
try {
  logger = require('../utils/logger');
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
  };
}
const { isIpBanned, banIp, isEmailBanned, banEmail } = require('../utils/banManager');

// Kiberxavfsizlik va Anti-Abuse parametrlar
const CONFIG = {
  WINDOW_MS: 60 * 1000,        // 1 daqiqa
  MAX_REQUESTS_PER_WINDOW: 70, // 1 daqiqada 70 tadan ko'p so'rov
  POST_WINDOW_MS: 30 * 1000,   // 30 soniya
  MAX_POST_REQUESTS: 12,       // 30 soniyada 12 tadan ko'p POST (spam-click)
};

// Xotiradagi monitoring
const ipTracking = new Map();

// Har 30 daqiqada faol bo'lmagan xotirani tozalash
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipTracking.entries()) {
    if (now - data.lastSeen > 6 * 60 * 60 * 1000) {
      ipTracking.delete(ip);
    }
  }
}, 30 * 60 * 1000);

// Haqiqiy mijoz IP manzilini aniqlash
const getClientIp = (req) => {
  const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
};

// Qurilma raqamli izi (Fingerprint: IP + User-Agent + Accept-Language)
const getDeviceFingerprint = (req, ip) => {
  const ua = req.headers['user-agent'] || 'unknown';
  const lang = req.headers['accept-language'] || '';
  return crypto.createHash('sha256').update(`${ip}-${ua}-${lang}`).digest('hex').substring(0, 16);
};

// Oq ro'yxat (Whitelist) - faqat local server loopback uchun
const isWhitelisted = (ip) => {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
};

/**
 * Butun umrga bloklovchi Kiberxavfsizlik Shield Middleware
 */
const securityShield = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();

  if (isWhitelisted(ip)) {
    return next();
  }

  // 1. IP yoki qurilma butun umrga bloklanganmi tekshirish
  if (isIpBanned(ip)) {
    logger.warn(`[LIFETIME_BAN_REJECTED] Bloklangan IP dan so'rov to'xtatildi: ${ip}`, {
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: 'PERMANENTLY_BLOCKED',
      message: "Xavfsizlik tizimi: Ushbu IP manzil va qurilma xavfsizlik qoidalarini buzgani sababli BUTUN UMRGA (doimiy) bloklangan. Saytdan foydalanish huquqingiz butunlay bekor qilingan.",
    });
  }

  // 2. Agar so'rovda email bo'lsa (yoki login/register) - email qora ro'yxatdami tekshirish
  const emailFromBody = req.body?.email || req.body?.identifier;
  if (emailFromBody && isEmailBanned(emailFromBody)) {
    return res.status(403).json({
      success: false,
      error: 'ACCOUNT_PERMANENTLY_BANNED',
      message: "Xavfsizlik tizimi: Ushbu Gmail/email hisob butun umrga bloklangan. Saytga kirish qat'iyan taqiqlanadi.",
    });
  }

  // 3. Faollikni monitoring qilish
  const deviceFp = getDeviceFingerprint(req, ip);
  let tracking = ipTracking.get(ip);
  if (!tracking) {
    tracking = {
      windowStart: now,
      requests: 0,
      postWindowStart: now,
      postRequests: 0,
      deviceFingerprint: deviceFp,
      lastSeen: now,
    };
    ipTracking.set(ip, tracking);
  }

  tracking.lastSeen = now;

  // Umumiy so'rovlar hisobi
  if (now - tracking.windowStart > CONFIG.WINDOW_MS) {
    tracking.windowStart = now;
    tracking.requests = 1;
  } else {
    tracking.requests += 1;
  }

  // POST so'rovlar hisobi (tugmalarni qayta-qayta bosishdan himoya)
  if (req.method === 'POST') {
    if (now - tracking.postWindowStart > CONFIG.POST_WINDOW_MS) {
      tracking.postWindowStart = now;
      tracking.postRequests = 1;
    } else {
      tracking.postRequests += 1;
    }
  }

  // Chegaradan oshib ketganlikni tekshirish
  const exceededGeneral = tracking.requests > CONFIG.MAX_REQUESTS_PER_WINDOW;
  const exceededPost = tracking.postRequests > CONFIG.MAX_POST_REQUESTS;

  if (exceededGeneral || exceededPost) {
    const reason = exceededPost
      ? 'Tugmalarni qayta-qayta bosish (POST Flood / Spam Click)'
      : 'Haddan ortiq ko\'p so\'rovlar oqimi (Request Flooding)';

    // 1. IP va qurilmani BUTUN UMRGA qora ro'yxatga kiritish
    banIp(ip, reason, deviceFp);

    // 2. Agar foydalanuvchi tizimga kirgan bo'lsa yoki so'rovda email bo'lsa, Gmail hisobini ham BUTUN UMRGA bloklash!
    if (req.user?.email) {
      banEmail(req.user.email, `Hujum va spam uyushtirgani uchun butun umrga bloklandi (${reason})`);
    } else if (emailFromBody) {
      banEmail(emailFromBody, `Hujum va spam urinishi uchun butun umrga bloklandi (${reason})`);
    }

    logger.error(`[PERMANENT_SECURITY_BAN] IP, Qurilma va hisob butun umrga bloklandi! IP: ${ip}`, {
      device: deviceFp,
      email: req.user?.email || emailFromBody || 'anonim',
      reason,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: 'PERMANENTLY_BLOCKED',
      message: "Xavfsizlik tizimi: Haddan ortiq ko'p bosish va hujum harakati aniqlandi! Ushbu IP manzil, qurilma va hisob BUTUN UMRGA bloklandi va saytga qayta kiritilmaydi.",
    });
  }

  next();
};

module.exports = {
  securityShield,
  getClientIp,
};
