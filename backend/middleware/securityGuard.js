const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

const BLACKLIST_FILE = path.join(__dirname, '..', 'config', 'ip_blacklist.json');

// Qat'iy Kiberxavfsizlik sozlamalari
const CONFIG = {
  WINDOW_MS: 60 * 1000,             // 1 daqiqalik darcha
  MAX_REQUESTS_PER_WINDOW: 70,      // 1 daqiqada 70 tadan ortiq so'rov
  POST_WINDOW_MS: 30 * 1000,        // POST so'rovlar uchun 30 soniya
  MAX_POST_REQUESTS: 12,            // 30 soniyada 12 tadan ortiq POST (spam-click)
  BAN_DURATION_MS: 48 * 60 * 60 * 1000, // Qat'iy blok: 2 kun (48 soat) davomida aslo ochilmaydi!
};

// Xotiradagi monitoring
const ipTracking = new Map();
let persistentBlacklist = new Map();

// Fayldan mavjud qora ro'yxatni yuklash
const loadBlacklist = () => {
  try {
    if (fs.existsSync(BLACKLIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
      const now = Date.now();
      persistentBlacklist = new Map(
        Object.entries(data).filter(([_, ban]) => ban.bannedUntil > now)
      );
    }
  } catch (err) {
    logger.error('ip_blacklist.json o\'qishda xatolik:', { error: err.message });
  }
};

// Qora ro'yxatni faylga saqlash
const saveBlacklist = () => {
  try {
    const obj = {};
    const now = Date.now();
    for (const [ip, ban] of persistentBlacklist.entries()) {
      if (ban.bannedUntil > now) {
        obj[ip] = ban;
      }
    }
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    logger.error('ip_blacklist.json saqlashda xatolik:', { error: err.message });
  }
};

loadBlacklist();

// Har 30 daqiqada eski ma'lumotlarni tozalash (faqat 2 kun to'liq o'tgan bo'lsa)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipTracking.entries()) {
    if (now - data.lastSeen > 24 * 60 * 60 * 1000) {
      ipTracking.delete(ip);
    }
  }
  for (const [ip, ban] of persistentBlacklist.entries()) {
    if (ban.bannedUntil <= now) {
      persistentBlacklist.delete(ip);
    }
  }
  saveBlacklist();
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

// Oq ro'yxat (Whitelist) - faqat local server testlar uchun
const isWhitelisted = (ip) => {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
};

/**
 * Qat'iy Kiberxavfsizlik Shield Middleware
 * (5 minutda ochilmaydi! 2 kunga to'liq bloklanadi va faqat admin ochishi mumkin)
 */
const securityShield = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();

  if (isWhitelisted(ip)) {
    return next();
  }

  // 1. IP yoki qurilma bloklanganmi tekshirish
  const banInfo = persistentBlacklist.get(ip);
  if (banInfo && banInfo.bannedUntil > now) {
    const remainingHours = Math.ceil((banInfo.bannedUntil - now) / (60 * 60 * 1000));
    const remainingDays = (remainingHours / 24).toFixed(1);

    logger.warn(`[BLOCKED_REQUEST_DENIED] Bloklangan IP dan harakat to'xtatildi`, {
      ip,
      device: banInfo.deviceFingerprint,
      path: req.path,
      method: req.method,
      remainingHours,
    });

    return res.status(403).json({
      success: false,
      error: 'ACCESS_COMPLETELY_BLOCKED',
      message: `Xavfsizlik tizimi: Ushbu IP manzil va qurilma qoidabuzarlik (spam/hujum) sababli 2 kunga to'liq bloklangan. Tizim avtomatik ochilmaydi. Qolgan vaqt: taxminan ${remainingHours} soat (${remainingDays} kun).`,
      bannedUntil: new Date(banInfo.bannedUntil).toISOString(),
    });
  }

  // 2. IP faolligini monitoring qilish
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

  // 1 daqiqalik umumiy so'rovlar darchasi
  if (now - tracking.windowStart > CONFIG.WINDOW_MS) {
    tracking.windowStart = now;
    tracking.requests = 1;
  } else {
    tracking.requests += 1;
  }

  // POST so'rovlar darchasi (tugmalarni qayta-qayta bosishdan qat'iy himoya)
  if (req.method === 'POST') {
    if (now - tracking.postWindowStart > CONFIG.POST_WINDOW_MS) {
      tracking.postWindowStart = now;
      tracking.postRequests = 1;
    } else {
      tracking.postRequests += 1;
    }
  }

  // Chegaralarni tekshirish
  const exceededGeneral = tracking.requests > CONFIG.MAX_REQUESTS_PER_WINDOW;
  const exceededPost = tracking.postRequests > CONFIG.MAX_POST_REQUESTS;

  if (exceededGeneral || exceededPost) {
    const reason = exceededPost
      ? 'Tugmalarni qayta-qayta bosish (POST Spam / Flood)'
      : 'Haddan ortiq ko\'p so\'rovlar (General Request Flood)';

    const bannedUntil = now + CONFIG.BAN_DURATION_MS; // To'liq 48 soat (2 kun) blok!

    persistentBlacklist.set(ip, {
      ip,
      deviceFingerprint: deviceFp,
      bannedAt: now,
      bannedUntil,
      reason,
      status: 'HARD_BANNED_2_DAYS',
    });
    saveBlacklist();

    logger.error(`[HARD_SECURITY_BAN] IP va qurilma 2 kunga bloklandi: ${ip}`, {
      ip,
      device: deviceFp,
      reason,
      duration: '48 soat (2 kun)',
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: 'ACCESS_COMPLETELY_BLOCKED',
      message: `Xavfsizlik tizimi: Haddan ortiq ko'p bosish va so'rovlar aniqlandi! Ushbu IP manzil va qurilma 2 kunga to'liq bloklandi va avtomatik ochilmaydi.`,
      bannedUntil: new Date(bannedUntil).toISOString(),
    });
  }

  next();
};

/**
 * Faqat Administrator qo'lda ochishi uchun
 */
const unbanIp = (ipToUnban) => {
  if (persistentBlacklist.has(ipToUnban)) {
    persistentBlacklist.delete(ipToUnban);
    saveBlacklist();
    if (ipTracking.has(ipToUnban)) {
      ipTracking.delete(ipToUnban);
    }
    return true;
  }
  return false;
};

/**
 * Barcha bloklangan IP larni ko'rish
 */
const getBannedIps = () => {
  const list = [];
  const now = Date.now();
  for (const [ip, data] of persistentBlacklist.entries()) {
    if (data.bannedUntil > now) {
      list.push({
        ip,
        device: data.deviceFingerprint,
        reason: data.reason,
        remainingHours: Math.ceil((data.bannedUntil - now) / 3600000),
        bannedUntil: new Date(data.bannedUntil).toISOString(),
      });
    }
  }
  return list;
};

module.exports = {
  securityShield,
  unbanIp,
  getBannedIps,
  getClientIp,
};
