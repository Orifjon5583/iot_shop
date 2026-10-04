const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const crypto = require('crypto');
const prisma = require('../config/db').prisma;
const { isEmailBanned } = require('../utils/banManager');

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('Google accountdan email olinmadi'), null);

      if (isEmailBanned(email)) {
        return done(new Error("Ushbu Gmail hisob butun umrga bloklangan. Saytga kirish taqiqlanadi."), null);
      }

      let user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: profile.id, isVerified: true }
          });
        }
        return done(null, user);
      }

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      const newUser = await prisma.user.create({
        data: {
          googleId:   profile.id,
          username:   profile.displayName || email.split('@')[0],
          email,
          isVerified: true,
          phone:      'Google Account',
          password:   hashedPassword,
        }
      });

      return done(null, newUser);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
