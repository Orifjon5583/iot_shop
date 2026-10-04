const fs = require('fs');
const path = require('path');
let logger;
try {
  logger = require('./logger');
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
  };
}

const BANNED_EMAILS_FILE = path.join(__dirname, '..', 'config', 'banned_emails.json');
const IP_BLACKLIST_FILE = path.join(__dirname, '..', 'config', 'ip_blacklist.json');

// Xotiradagi tezkor kesh
let bannedEmails = new Map();
let ipBlacklist = new Map();

// ─── 1. Gmail / Email qora ro'yxatini yuklash ────────────────────────────────
const loadBannedEmails = () => {
  try {
    if (fs.existsSync(BANNED_EMAILS_FILE)) {
      const data = JSON.parse(fs.readFileSync(BANNED_EMAILS_FILE, 'utf8'));
      bannedEmails = new Map(Object.entries(data));
    }
  } catch (err) {
    logger.error('banned_emails.json o\'qishda xatolik:', { error: err.message });
  }
};

const saveBannedEmails = () => {
  try {
    const obj = Object.fromEntries(bannedEmails);
    fs.writeFileSync(BANNED_EMAILS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    logger.error('banned_emails.json saqlashda xatolik:', { error: err.message });
  }
};

// ─── 2. IP qora ro'yxatini yuklash ──────────────────────────────────────────
const loadIpBlacklist = () => {
  try {
    if (fs.existsSync(IP_BLACKLIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(IP_BLACKLIST_FILE, 'utf8'));
      ipBlacklist = new Map(Object.entries(data));
    }
  } catch (err) {
    logger.error('ip_blacklist.json o\'qishda xatolik:', { error: err.message });
  }
};

const saveIpBlacklist = () => {
  try {
    const obj = Object.fromEntries(ipBlacklist);
    fs.writeFileSync(IP_BLACKLIST_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    logger.error('ip_blacklist.json saqlashda xatolik:', { error: err.message });
  }
};

loadBannedEmails();
loadIpBlacklist();

// ─── Email Ban Funksiyalari ──────────────────────────────────────────────────
const isEmailBanned = (email) => {
  if (!email) return false;
  const normalized = String(email).toLowerCase().trim();
  return bannedEmails.has(normalized);
};

const banEmail = (email, reason = 'Kiberxavfsizlik qoidalarini buzgani sababli butun umrga bloklandi') => {
  if (!email) return false;
  const normalized = String(email).toLowerCase().trim();
  bannedEmails.set(normalized, {
    email: normalized,
    bannedAt: Date.now(),
    permanent: true,
    reason,
  });
  saveBannedEmails();
  logger.error(`[PERMANENT_EMAIL_BAN] Gmail hisob butun umrga bloklandi: ${normalized}`, { reason });
  return true;
};

const unbanEmail = (email) => {
  if (!email) return false;
  const normalized = String(email).toLowerCase().trim();
  if (bannedEmails.has(normalized)) {
    bannedEmails.delete(normalized);
    saveBannedEmails();
    logger.info(`[EMAIL_UNBANNED] Gmail hisob blokdan chiqarildi: ${normalized}`);
    return true;
  }
  return false;
};

const getBannedEmails = () => {
  return Array.from(bannedEmails.values());
};

// ─── IP Ban Funksiyalari ─────────────────────────────────────────────────────
const isIpBanned = (ip) => {
  if (!ip) return false;
  return ipBlacklist.has(ip);
};

const banIp = (ip, reason = 'Shubhali faollik sababli butun umrga bloklandi', device = 'N/A') => {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return false;
  ipBlacklist.set(ip, {
    ip,
    device,
    bannedAt: Date.now(),
    permanent: true,
    reason,
  });
  saveIpBlacklist();
  logger.error(`[PERMANENT_IP_BAN] IP butun umrga bloklandi: ${ip}`, { reason, device });
  return true;
};

const unbanIp = (ip) => {
  if (!ip) return false;
  if (ipBlacklist.has(ip)) {
    ipBlacklist.delete(ip);
    saveIpBlacklist();
    logger.info(`[IP_UNBANNED] IP blokdan chiqarildi: ${ip}`);
    return true;
  }
  return false;
};

const getBannedIps = () => {
  return Array.from(ipBlacklist.values());
};

module.exports = {
  isEmailBanned,
  banEmail,
  unbanEmail,
  getBannedEmails,
  isIpBanned,
  banIp,
  unbanIp,
  getBannedIps,
};
