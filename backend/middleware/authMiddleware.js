const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { isEmailBanned } = require('../utils/banManager');

const protect = async (req, res, next) => {
  // Avval Authorization header ni tekshir (admin panel Bearer token ishlatadi)
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  // Agar header bo'lmasa, cookie dan olish (frontend uchun)
  if (!token) {
    token = req.cookies?.accessToken;
  }
  if (!token) {
    return res.status(401).json({ message: "Avtorizatsiya talab etiladi." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'refresh') {
      return res.status(401).json({ message: "Noto'g'ri token turi." });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: "Foydalanuvchi topilmadi." });
    if (isEmailBanned(user.email) || user.role === 'banned') {
      return res.status(403).json({ message: "Ushbu hisob va Gmail butun umrga bloklangan. Saytdan foydalanish taqiqlanadi.", isBanned: true });
    }
    if (!user.isVerified) return res.status(403).json({ message: "Hisob tasdiqlanmagan." });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token muddati tugagan.", tokenExpired: true });
    }
    logger.warn('Invalid token', { ip: req.ip });
    return res.status(401).json({ message: "Token yaroqsiz." });
  }
};

// Admin panel uchun - faqat superadmin kirishi mumkin
const adminProtect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) {
    token = req.cookies?.accessToken;
  }
  if (!token) {
    return res.status(401).json({ message: "Admin avtorizatsiyasi talab etiladi." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'refresh') {
      return res.status(401).json({ message: "Noto'g'ri token turi." });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: "Admin topilmadi." });
    if (!user.isVerified) return res.status(403).json({ message: "Hisob tasdiqlanmagan." });
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: "Sizda admin panel huquqi yo'q." });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token muddati tugagan.", tokenExpired: true });
    }
    logger.warn('Invalid admin token', { ip: req.ip });
    return res.status(401).json({ message: "Admin token yaroqsiz." });
  }
};

// Superadmin panel uchun - faqat superadminlar kirishi mumkin
const superadminProtect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) {
    token = req.cookies?.accessToken;
  }
  if (!token) {
    return res.status(401).json({ message: "Superadmin avtorizatsiyasi talab etiladi." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'refresh') {
      return res.status(401).json({ message: "Noto'g'ri token turi." });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: "Foydalanuvchi topilmadi." });
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: "Faqat superadminlar uchun ruxsat berilgan." });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token muddati tugagan.", tokenExpired: true });
    }
    logger.warn('Invalid superadmin token', { ip: req.ip });
    return res.status(401).json({ message: "Superadmin token yaroqsiz." });
  }
};

// Frontend uchun - adminlar kirishi mumkin emas
const userProtect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) {
    token = req.cookies?.accessToken;
  }
  if (!token) {
    return res.status(401).json({ message: "Avtorizatsiya talab etiladi." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'refresh') {
      return res.status(401).json({ message: "Noto'g'ri token turi." });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: "Foydalanuvchi topilmadi." });
    if (!user.isVerified) return res.status(403).json({ message: "Hisob tasdiqlanmagan." });
    if (user.role === 'superadmin' || user.role === 'manager') {
      return res.status(403).json({ message: "Adminlar frontend orqali kirish mumkin emas." });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token muddati tugagan.", tokenExpired: true });
    }
    logger.warn('Invalid user token', { ip: req.ip });
    return res.status(401).json({ message: "Token yaroqsiz." });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === 'superadmin') return next();
    if (req.user.role === 'manager') {
      const permissions = req.user.permissions || [];
      if (permissions.includes(permission)) return next();
    }
    return res.status(403).json({ message: "Sizda ruxsat yo'q." });
  }
};

module.exports = { protect, adminProtect, superadminProtect, userProtect, requirePermission };
