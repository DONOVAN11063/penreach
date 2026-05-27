const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phase: {
    type: String,
    required: true,
    enum: ['Foundation', 'Intermediate', 'Senior', 'FET']
  },
  grade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade',
    required: false
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#667eea'
  },
  icon: {
    type: String,
    default: '📚'
  },
  order: {
    type: Number,
    default: 0
  },
  targetAudience: { 
    type: String, 
    required: true, 
    enum: ['student', 'teacher'],
    default: 'student'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
subjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Subject', subjectSchema, 'subjects');
