// src/routes/users.js
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = Router();

/**
 * Полета, които НИКОГА не изпращаме към клиента.
 * Допълни/премахни според твоята схема.
 */
const SAFE_EXCLUDE = [
  '-password',
  '-passwordHash',
  '-salt',
  '-resetPasswordToken',
  '-resetPasswordExpires',
  '-emailVerificationToken',
  '-emailVerificationExpires',
  '-twoFactorSecret',
  '-apiKey',
  '-__v'
].join(' ');

// GET /api/me — връща целия потребител (без чувствителните полета)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(SAFE_EXCLUDE).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ако искаш да добавиш деривати, направи го тук (пример):
    // user.generationsCount = Array.isArray(user.generations) ? user.generations.length : 0;

    return res.json(user);
  } catch (err) {
    console.error('GET /api/me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/me — засега позволяваме промяна само на fullName (както досега)
router.patch(
  '/me',
  auth,
  body('fullName').optional().isLength({ min: 2 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const updates = {};
      if (req.body.fullName) updates.fullName = req.body.fullName;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true, lean: true }
      ).select(SAFE_EXCLUDE);

      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.json(user);
    } catch (err) {
      console.error('PATCH /api/me error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/me/credits/add — временен top-up без админ
router.post(
  '/me/credits/add',
  auth,
  body('amount').isInt({ min: 1, max: 100000 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { amount } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { credits: amount } },
        { new: true, lean: true }
      ).select(SAFE_EXCLUDE);

      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.json({ credits: user.credits });
    } catch (err) {
      console.error('POST /api/me/credits/add error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
