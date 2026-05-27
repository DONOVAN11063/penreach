const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  value: { type: String, required: true }, // e.g., "Grade R", "Grade 1"
  phase: { 
    type: String, 
    required: true, 
    enum: ['Foundation', 'Intermediate', 'Senior', 'FET'],
    default: 'Foundation'
  },
  description: String,
  targetAudience: { 
    type: String, 
    required: true, 
    enum: ['student', 'teacher'],
    default: 'student'
  },
  createdAt: { type: Date, default: Date.now }
});

// Compound unique index: grade value must be unique within each phase and target audience
gradeSchema.index({ value: 1, phase: 1, targetAudience: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);
