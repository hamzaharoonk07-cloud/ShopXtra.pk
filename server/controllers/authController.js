const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const { sendMail } = require('../config/mailer');
const { passwordResetEmail } = require('../emails/templates');

const SITE_URL = process.env.SITE_URL || 'http://localhost:4000';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function signup(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await userModel.create({ name, email, password, phone });
    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await userModel.findByEmail(email);
    if (!user || !(await userModel.verifyPassword(user, password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.status(204).end();
}

async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const { name, phone } = req.body;
    const user = await userModel.updateProfile(req.user.id, { name, phone });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    // Always respond the same way whether or not the email exists, so this
    // can't be used to enumerate registered accounts.
    const user = await userModel.findByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await userModel.setResetToken(email, tokenHash, expiresAt);
      const resetUrl = `${SITE_URL}/pages/reset-password.html?token=${token}`;
      await sendMail({ to: email, subject: 'Reset your ShopXtra password', html: passwordResetEmail(resetUrl) });
    }
    res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await userModel.findByResetToken(tokenHash);
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired' });

    await userModel.resetPassword(user.id, password);
    res.json({ message: 'Password updated. You can log in now.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, me, updateMe, forgotPassword, resetPassword };
