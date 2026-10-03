const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const BLACKLIST_FILE = path.join(__dirname, '..', 'config', 'ip_blacklist.json');

// Xavfsizlik sozlamalari
const CONFIG = {
  WINDOW_MS: 60 * 1000,           // 1 daqiqalik darcha
  MAX_REQUESTS_PER_WINDOW: 80,    // 1 daqiqada 80 tadan ortiq so'rov bo'lsa
  POST_WINDOW_MS: 30 * 1000,      // POST so'rovlar uchun 30 soniya
  MAX_POST_REQUESTS: 15,          // 30 soniyada 15 tadan ortiq POST (spam-click)
  TEMP_BAN_MS: 5 * 60 * 1000,     // 1-bosqich: 5 minut blok
  LONG_BAN_MS: 48 * 60 * 60 * 1000, // 2-bosqich: 2 kun (48 soat) blok
  MAX_TEMP_BANS_BEFORE_LONG: 2,   // 2 marta 5 minutlik blok olgach, 2 kunga o'tadi
};

// Xotiradagi ma'lumotlar
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

// Har 10 daqiqada xotirani tozalash
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipTracking.entries()) {
    if (now - data.lastSeen > 2 * 60 * 60 * 1000) {
      ipTracking.delete(ip);
    }
  }
  for (const [ip, ban] of persistentBlacklist.entries()) {
    if (ban.bannedUntil <= now) {
      persistentBlacklist.delete(ip);
    }
  }
  saveBlacklist();
}, 10 * 60 * 1000);

// Haqiqiy mijoz IP manzilini aniqlash (Cloudflare, Nginx, Proxy hisobga olingan)
const getClientIp = (req) => {
  const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
};

// Oq ro'yxat (Whitelist) - local testlar bloklanmasligi uchun
const isWhitelisted = (ip) => {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
};

/**
 * Kiberxavfsizlik va Anti-Abuse Shield Middleware
 */
const securityShield = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();

  if (isWhitelisted(ip)) {
    return next();
  }

  // 1. IP uzoq muddatli yoki vaqtinchalik bloklanganmi tekshirish
  const banInfo = persistentBlacklist.get(ip);
  if (banInfo && banInfo.bannedUntil > now) {
    const remainingSeconds = Math.ceil((banInfo.bannedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    const isLongBan = (banInfo.bannedUntil - now) > CONFIG.TEMP_BAN_MS;

    logger.warn(`[BLOCKED_REQUEST] Bloklangan IP dan so'rov qaytarildi`, {
      ip,
      path: req.path,
      method: req.method,
      remainingMinutes,
    });

    return res.status(429).json({
      success: false,
      error: 'SECURITY_ACCESS_RESTRICTED',
      message: isLongBan
        ? `Xavfsizlik tizimi: Ko'p sonli hujum / shubhali faollik sababli IP manzilingiz 2 kunga bloklangan. Qolgan vaqt: taxminan ${remainingMinutes} daqiqa.`
        : `Xavfsizlik tizimi: Qayta-qayta so'rov yuborganingiz sababli IP manzilingiz 5 daqiqaga vaqtincha bloklandi. Qolgan vaqt: ${remainingSeconds} soniya.`,
      remainingSeconds,
      bannedUntil: new Date(banInfo.bannedUntil).toISOString(),
    });
  } else if (banInfo && banInfo.bannedUntil <= now) {
    // Blok muddati tugagan bo'lsa, ro'yxatdan chiqarish
    persistentBlacklist.delete(ip);
    saveBlacklist();
  }

  // 2. IP faolligini monitoring qilish
  let tracking = ipTracking.get(ip);
  if (!tracking) {
    tracking = {
      windowStart: now,
      requests: 0,
      postWindowStart: now,
      postRequests: 0,
      violations: 0,
      lastSeen: now,
    };
    ipTracking.set(ip, tracking);
  }

  tracking.lastSeen = now;

  // 1 daqiqalik darchani tekshirish
  if (now - tracking.windowStart > CONFIG.WINDOW_MS) {
    tracking.windowStart = now;
    tracking.requests = 1;
  } else {
    tracking.requests += 1;
  }

  // POST so'rovlar darchasini tekshirish (qayta-qayta bosishdan himoya)
  if (req.method === 'POST') {
    if (now - tracking.postWindowStart > CONFIG.POST_WINDOW_MS) {
      tracking.postWindowStart = now;
      tracking.postRequests = 1;
    } else {
      tracking.postRequests += 1;
    }
  }

  // Chegaralarni tekshirish: umumiy so'rovlar yoki POST spam
  const exceededGeneral = tracking.requests > CONFIG.MAX_REQUESTS_PER_WINDOW;
  const exceededPost = tracking.postRequests > CONFIG.MAX_POST_REQUESTS;

  if (exceededGeneral || exceededPost) {
    tracking.violations += 1;
    let banDuration = CONFIG.TEMP_BAN_MS;
    let reason = exceededPost ? 'Tugmalarni ketma-ket bosish (POST Flood)' : 'Haddan ortiq tez so\'rovlar (General Flood)';

    // Agar avval ham qoidabuzarlik qilgan bo'lsa -> 2 kunga bloklash
    if (tracking.violations > CONFIG.MAX_TEMP_BANS_BEFORE_LONG) {
      banDuration = CONFIG.LONG_BAN_MS;
      reason += ' [Takroriy hujum - 2 kunlik jazo]';
    }

    const bannedUntil = now + banDuration;
    persistentBlacklist.set(ip, {
      ip,
      bannedAt: now,
      bannedUntil,
      reason,
      violations: tracking.violations,
    });
    saveBlacklist();

    const remainingSeconds = Math.ceil(banDuration / 1000);
    const isLongBan = banDuration > CONFIG.TEMP_BAN_MS;

    logger.error(`[SECURITY_BAN] IP bloklandi: ${ip}`, {
      ip,
      reason,
      duration: isLongBan ? '48 soat' : '5 daqiqa',
      path: req.path,
    });

    return res.status(429).json({
      success: false,
      error: 'SECURITY_ACCESS_RESTRICTED',
      message: isLongBan
        ? `Xavfsizlik tizimi: Shubhali faollik sababli IP manzilingiz 2 kunga bloklandi.`
        : `Xavfsizlik tizimi: Haddan ortiq ko'p bosish va so'rovlar sababli IP manzilingiz 5 daqiqaga bloklandi. 5 daqiqadan so'ng tizim avtomatik ochiladi.`,
      remainingSeconds,
      bannedUntil: new Date(bannedUntil).toISOString(),
    });
  }

  next();
};

/**
 * Admin uchun IP blokdan chiqarish funksiyasi
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
        reason: data.reason,
        violations: data.violations,
        remainingMinutes: Math.ceil((data.bannedUntil - now) / 60000),
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
