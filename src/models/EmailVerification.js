const mongoose = require('mongoose');

const EmailVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    // Store a salted hash of the 6-digit code (we avoid storing the raw code)
    codeHash: { type: String },      // sha256(code + codeSalt)
    codeSalt: { type: String },
    expiresAt: { type: Date, index: true }, // when the code becomes invalid
    verified: { type: Boolean, default: false },

    // Hygiene / rate limit
    lastSentAt: { type: Date },      // for resend throttling
    sendCountDay: { type: Number, default: 0 }, // daily sends counter
    sendCountDayKey: { type: String }, // YYYY-MM-DD (resets the counter when day changes)

    // Anti-bruteforce
    attempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

// Optional TTL clean-up for old, verified or expired entries
// If you want automatic cleanup, uncomment below and run once to create index.
// EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailVerification', EmailVerificationSchema);
