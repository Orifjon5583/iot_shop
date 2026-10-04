const Joi = require('joi');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db').prisma;
const bcrypt = require('bcryptjs');
const emailQueue = require('../utils/emailQueue');
const logger = require('../utils/logger');
const { isEmailBanned } = require('../utils/banManager');

// ─── Token yaratish ──────────────────────────────────────────────────────────
const generateTokens = exports._generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

// ─── OTP generatsiya ─────────────────────────────────────────────────────────
const generateOTP = () => {
  const buf = crypto.randomBytes(4);
  const num = (buf.readUInt32BE(0) % 900000) + 100000;
  return String(num);
};

// ─── Validatsiya sxemalari ───────────────────────────────────────────────────
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).trim().required().messages({
    'string.min': "Username kamida 3 ta belgidan iborat bo'lishi kerak",
    'string.max': "Username 50 ta belgidan oshmasligi kerak",
    'any.required': 'Username kiritilishi shart',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Iltimos, haqiqiy email manzilini kiriting',
    'any.required': 'Email kiritilishi shart',
  }),
  phone: Joi.string().min(9).max(15).trim().required().messages({
    'string.min': 'Telefon raqami kamida 9 ta belgi',
    'any.required': 'Telefon raqami kiritilishi shart',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
    'any.required': 'Parol kiritilishi shart',
  }),
  confirmPassword: Joi.any().equal(Joi.ref('password')).required().messages({
    'any.only': 'Parollar mos emas',
    'any.required': 'Parolni tasdiqlash shart',
  }),
});

const loginSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    'any.required': 'Email yoki telefon raqami kiritilishi shart',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'any.required': 'Parolni kiriting',
  }),
});

const otpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': "Kod 6 ta raqamdan iborat bo'lishi kerak",
    'string.pattern.base': 'Kod faqat raqamlardan iborat bo\'lishi kerak',
    'any.required': 'Tasdiqlash kodi kiritilishi shart',
  }),
});

// ─── 1. RO'YXATDAN O'TISH ───────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { error } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { username, email, phone, password } = req.body;

    if (isEmailBanned(email)) {
      return res.status(403).json({ message: "Ushbu Gmail hisob butun umrga bloklangan. Ro'yxatdan o'tish taqiqlanadi." });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await new Promise(r => setTimeout(r, 300));
      return res.status(409).json({ message: "Bu email allaqachon ro'yxatdan o'tgan." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 8);
    const otpExpires = new Date(Date.now() + 90 * 1000);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        phone,
        password: hashedPassword,
        otpHash,
        otpExpires,
        otpAttempts: 0
      }
    });

    emailQueue.add({ email, otp, type: 'verify' });
    logger.info('New user registered', { email: email.replace(/(.{2}).+(@.+)/, '$1***$2') });

    res.status(201).json({
      message: "Emailingizga 6 xonali tasdiqlash kodi yuborildi. Kod 90 soniya amal qiladi.",
      email,
    });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    res.status(500).json({ message: "Ro'yxatdan o'tishda xatolik yuz berdi." });
  }
};

// ─── 2. TIZIMGA KIRISH ───────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const { identifier, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { phone: identifier.trim() }
        ]
      }
    });

    const dummyHash = '$2a$12$dummyhashfortiminghimoyasi.padpadpadpadpadpad';
    const passwordToCheck = user && user.password ? user.password : dummyHash;
    const isMatch = await bcrypt.compare(password, passwordToCheck);

    if (isEmailBanned(identifier) || (user && isEmailBanned(user.email)) || user?.role === 'banned') {
      return res.status(403).json({ message: "Ushbu hisob va Gmail butun umrga bloklangan. Kirish taqiqlanadi." });
    }

    if (!user || !isMatch) {
      return res.status(401).json({ message: "Email yoki parol noto'g'ri." });
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 8);
    const otpExpires = new Date(Date.now() + 90 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash, otpExpires, otpAttempts: 0 }
    });

    if (!user.isVerified) {
      emailQueue.add({ email: user.email, otp, type: 'verify' });
      return res.status(403).json({
        message: "Hisobingiz tasdiqlanmagan. Emailingizga yangi kod yuborildi.",
        requireVerification: true,
        email: user.email,
      });
    }

    emailQueue.add({ email: user.email, otp, type: 'login' });

    logger.info('Login OTP sent', { email: user.email.replace(/(.{2}).+(@.+)/, '$1***$2') });

    res.status(200).json({
      message: "Emailingizga 6 xonali kirish kodi yuborildi. Kod 90 soniya amal qiladi.",
      email: user.email,
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ message: "Kirishda xatolik yuz berdi." });
  }
};

// ─── 3. OTP TASDIQLASH ───────────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  const { error } = otpSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi." });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({
        message: "Kod muddati tugagan. Iltimos, yangi kod so'rang.",
        expired: true,
      });
    }

    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        message: "Juda ko'p noto'g'ri urinish. Yangi kod so'rang.",
        tooManyAttempts: true,
      });
    }

    if (!user.otpHash) {
      return res.status(400).json({ message: "Kod muddati tugagan. Yangi kod so'rang.", expired: true });
    }
    const isValid = await bcrypt.compare(otp, user.otpHash);

    if (!isValid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } }
      });
      const remaining = 4 - (user.otpAttempts + 1);
      return res.status(400).json({
        message: `Kod noto'g'ri. ${remaining > 0 ? remaining : 0} ta urinish qoldi.`,
        attemptsLeft: remaining > 0 ? remaining : 0,
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
        lastLogin: new Date(),
        loginCount: { increment: 1 },
        refreshToken
      }
    });

    logger.info('User verified and logged in', { userId: user.id });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: "Muvaffaqiyatli kirish!",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    logger.error('VerifyOTP error', { error: err.message });
    res.status(500).json({ message: "Serverda xatolik yuz berdi." });
  }
};

// ─── 4. OTP QAYTA YUBORISH ──────────────────────────────────────────────────
exports.resendOTP = async (req, res) => {
  const { email, type = 'verify' } = req.body;
  if (!email) return res.status(400).json({ message: "Email kiritilishi shart." });

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      await new Promise(r => setTimeout(r, 300));
      return res.status(200).json({ message: "Agar email ro'yxatdan o'tgan bo'lsa, kod yuborildi." });
    }

    if (user.otpExpires && user.otpExpires > new Date(Date.now() + 60 * 1000)) {
      const secsLeft = Math.ceil((user.otpExpires.getTime() - Date.now()) / 1000);
      return res.status(429).json({
        message: `Iltimos, ${secsLeft} soniya kuting.`,
        retryAfter: secsLeft,
      });
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 8);
    const otpExpires = new Date(Date.now() + 90 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash, otpExpires, otpAttempts: 0 }
    });

    emailQueue.add({ email: user.email, otp, type });

    logger.info('OTP resent', { email: email.replace(/(.{2}).+(@.+)/, '$1***$2') });

    res.status(200).json({
      message: "Yangi kod emailingizga yuborildi. Kod 90 soniya amal qiladi.",
    });
  } catch (err) {
    logger.error('ResendOTP error', { error: err.message });
    res.status(500).json({ message: "Kod yuborishda xatolik yuz berdi." });
  }
};

// ─── 5. TOKEN YANGILASH ─────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: "Refresh token yo'q." });

  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    const decoded = jwt.verify(refreshToken, secret);
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Token yaroqsiz yoki eskirgan." });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefresh }
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      message: 'Token yangilandi',
      accessToken,
      refreshToken: newRefresh 
    });
  } catch (err) {
    res.status(401).json({ message: "Token yaroqsiz." });
  }
};

// ─── 6. LOGOUT ──────────────────────────────────────────────────────────────
exports.logoutUser = async (req, res) => {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
      });
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(200).json({ message: "Muvaffaqiyatli chiqildi." });
  } catch (err) {
    res.status(500).json({ message: "Chiqishda xatolik." });
  }
};
