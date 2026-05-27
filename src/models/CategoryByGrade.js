const mongoose = require('mongoose');
const Grade = require('./Grade');

const categoryByGradeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: '#6366f1' },
  icon: { type: String, default: '📚' },
  order: { type: Number, default: 0 },
  grade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade',
    required: true
  },
  phase: {
    type: String,
    enum: ['Foundation', 'Intermediate', 'Senior', 'FET'],
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

// Unique index for categories by grade
categoryByGradeSchema.index({ name: 1, grade: 1, phase: 1 }, { unique: true });

module.exports = mongoose.model('CategoryByGrade', categoryByGradeSchema);
