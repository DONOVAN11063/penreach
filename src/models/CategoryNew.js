const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: '#6366f1' },
  icon: { type: String, default: '📚' },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Unique index for categories
categorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
