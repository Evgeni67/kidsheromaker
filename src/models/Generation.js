const mongoose = require('mongoose');

const GenerationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    heroKey: { type: String, required: true, index: true },
    gender: { type: String, enum: ['boy', 'girl'], required: true, index: true },
    imageUrl: { type: String, required: true },
    // optionally keep raw input for audit/debug:
    // inputHash: { type: String },
  },
  { timestamps: true }
);

GenerationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Generation', GenerationSchema);
