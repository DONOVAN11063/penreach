const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Science, Technology, Engineering, Arts, Maths
  phase: {
    type: String,
    enum: ['Foundation', 'Intermediate', 'Senior', 'FET']
    // Not required for categories (universal), required for subjects
  },
  grade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade'
    // required: true - removed for categories
  },
  description: String,
  color: { type: String, default: '#6366f1' }, // for UI
  icon: { type: String, default: '📚' },
  order: { type: Number, default: 0 },
  // kind distinguishes entries created as a "subject" versus a "category"
  kind: {
    type: String,
    enum: ['subject', 'category'],
    default: 'subject'
  },
  // for subjects, reference to the parent category
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  // term for subjects (1-4)
  term: { type: Number, min: 1, max: 4 },
  targetAudience: { 
    type: String, 
    required: true, 
    enum: ['student', 'teacher'],
    default: 'student'
  },
  createdAt: { type: Date, default: Date.now }
});

// Compound unique index: 
// - Categories: unique by name and grade for categories only
// - Subjects: unique by name, phase, grade, and kind
categorySchema.index({ name: 1, grade: 1, kind: 1 }, { 
  unique: true, 
  partialFilterExpression: { kind: 'category' },
  sparse: true 
});

// Separate index for subjects
categorySchema.index({ name: 1, phase: 1, grade: 1, kind: 1 }, { 
  unique: true, 
  partialFilterExpression: { kind: 'subject' },
  sparse: true 
});

module.exports = mongoose.model('Category', categorySchema);
