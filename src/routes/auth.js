// src/routes/auth.js
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const { sendVerificationEmail } = require('../services/mailer'); // ⬅️ use your Gmail mailer

const router = Router();

/* ------------------------ utilities ------------------------ */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Minimal disposable-domain guard (extend this list or load from a file/db)
const DISPOSABLE_DOMAINS = new Set([
  // '10minutemail.com', '10minmail.com', '10mail.org', 'guerrillamail.com',
  // 'tempmail.io', 'temp-mail.org', 'mailinator.com', 'yopmail.com',
  // 'trashmail.com', 'mintemail.com', 'getnada.com', 'sharklasers.com'
]);
function isDisposableEmail(email) {
  try {
    const domain = normalizeEmail(email).split('@')[1] || '';
    return DISPOSABLE_DOMAINS.has(domain);
  } catch { return true; }
}

// Hash the 6-digit code with a per-record salt
function hashCode(code, salt) {
  return crypto.createHash('sha256').update(String(code) + ':' + salt).digest('hex');
}

// Generate a 6-digit code (100000..999999)
function makeSixDigit() {
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

/* ------------------------ API: check-email ------------------------ */
/**
 * POST /api/auth/check-email
 * body: { email }
 * resp: { isRegistered, isVerified, isDisposable }
 */
router.post(
  '/auth/check-email',
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const email = normalizeEmail(req.body.email);
    const disposable = isDisposableEmail(email);

    const user = await User.findOne({ email }).lean();
    const ver = await EmailVerification.findOne({ email }).lean();

    return res.json({
      isRegistered: !!user,
      isVerified: !!ver?.verified,
      isDisposable: disposable
    });
  }
);

/* ------------------------ API: send-verification ------------------------ */
/**
 * POST /api/auth/send-verification
 * body: { email }
 * resp: { ok: true }
 *
 * - Throttled: 60s between sends, 5/day (env overrides)
 * - TTL default 24h (env EMAIL_CODE_TTL_MINUTES can override)
 */
router.post(
  '/auth/send-verification',
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const email = normalizeEmail(req.body.email);
    if (isDisposableEmail(email)) {
      return res.status(400).json({ error: 'disposable_email' });
    }
console.log(email)
    const now = new Date();
    const dayKey = now.toISOString().slice(0,10); // YYYY-MM-DD
    const throttleSeconds = parseInt(process.env.EMAIL_CODE_THROTTLE_SECONDS || '60', 10);
    const maxPerDay = parseInt(process.env.EMAIL_CODE_MAX_PER_DAY || '5', 10);
    // align with your email template "expires in 24 hours"
    const ttlMinutes = parseInt(process.env.EMAIL_CODE_TTL_MINUTES || '1440', 10);

    let ver = await EmailVerification.findOne({ email });
    if (!ver) ver = await EmailVerification.create({ email });

    // reset daily counter if day changed
    if (ver.sendCountDayKey !== dayKey) {
      ver.sendCountDayKey = dayKey;
      ver.sendCountDay = 0;
    }

    // rate limits
    if (ver.lastSentAt && (now - ver.lastSentAt) / 1000 < throttleSeconds) {
      return res.status(429).json({ error: 'too_soon' });
    }
    if (ver.sendCountDay >= maxPerDay) {
      return res.status(429).json({ error: 'daily_limit' });
    }

    const code = makeSixDigit();
    const salt = crypto.randomBytes(8).toString('hex');
    ver.codeSalt = salt;
    ver.codeHash = hashCode(code, salt);
    ver.expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    ver.lastSentAt = now;
    ver.sendCountDay += 1;
    ver.attempts = 0; // reset attempts on new code
    await ver.save();
console.log(code)
    // send via Gmail transporter
    try {
      await sendVerificationEmail(email, code);
    } catch (err) {
      console.error('sendVerificationEmail error:', err);
      return res.status(502).json({ error: 'email_send_failed' });
    }

    return res.json({ ok: true });
  }
);

/* ------------------------ API: verify-code ------------------------ */
/**
 * POST /api/auth/verify-code
 * body: { email, code }
 * resp: { ok: true, isVerified: true }
 */
router.post(
  '/auth/verify-code',
  body('email').isEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const ver = await EmailVerification.findOne({ email });

    if (!ver) return res.status(400).json({ error: 'no_verification_started' });

    const now = new Date();
    if (ver.lockedUntil && now < ver.lockedUntil) {
      return res.status(429).json({ error: 'locked', until: ver.lockedUntil });
    }
    if (!ver.expiresAt || now > ver.expiresAt) {
      return res.status(400).json({ error: 'code_expired' });
    }

    const expected = ver.codeHash;
    const actual = hashCode(code, ver.codeSalt || '');
    const ok = expected && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));

    if (!ok) {
      ver.attempts = (ver.attempts || 0) + 1;
      if (ver.attempts >= 5) ver.lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
      await ver.save();
      return res.status(400).json({ error: 'invalid_code' });
    }

    ver.verified = true;
    ver.attempts = 0;
    ver.lockedUntil = undefined;
    // optional: clear code after success
    ver.codeHash = undefined;
    ver.codeSalt = undefined;
    await ver.save();

    return res.json({ ok: true, isVerified: true });
  }
);

/* ------------------------ API: complete-registration ------------------------ */
/**
 * POST /api/auth/complete-registration
 * body: { email, password, fullName, termsAccepted }
 * resp: { token, user: { id, email, fullName, credits } }
 */
router.post(
  '/auth/complete-registration',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').isLength({ min: 2 }),
  body('termsAccepted').isBoolean(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { email: rawEmail, password, fullName, termsAccepted } = req.body;
    const email = normalizeEmail(rawEmail);

    if (isDisposableEmail(email)) {
      return res.status(400).json({ error: 'disposable_email' });
    }
    if (!termsAccepted) {
      return res.status(400).json({ error: 'terms_not_accepted' });
    }

    const ver = await EmailVerification.findOne({ email });
    if (!ver || !ver.verified) {
      return res.status(400).json({ error: 'email_not_verified' });
    }

    let user = await User.findOne({ email });
    if (user && user.passwordHash) {
      return res.status(409).json({ error: 'already_registered' });
    }

    if (!user) {
      const passwordHash = await User.hashPassword(password);
      user = await User.create({ email, passwordHash, fullName, credits: 36 });
    } else {
      user.fullName = fullName;
      user.passwordHash = await User.hashPassword(password);
      if (user.credits == null) user.credits = 36;
      await user.save();
    }

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, email, fullName: user.fullName, credits: user.credits } });
  }
);

/* ------------------------ API: login (unchanged) ------------------------ */
router.post(
  '/auth/login',
  body('email').isEmail(),
  body('password').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { email: rawEmail, password } = req.body;
    const email = normalizeEmail(rawEmail);
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email, fullName: user.fullName, credits: user.credits } });
  }
);

module.exports = router;
