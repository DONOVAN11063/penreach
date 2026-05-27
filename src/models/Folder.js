const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  grade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  phase: {
    type: String,
    enum: ['Foundation', 'Intermediate', 'Senior', 'FET'],
    required: true
  },
  term: {
    type: Number,
    default: 1
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  contentTypes: {
    videos: {
      type: Boolean,
      default: true
    },
    quizzes: {
      type: Boolean,
      default: true
    },
    documents: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: String,
    default: 'system'
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
  }
}, {
  timestamps: true
});

// Sort folders by order, then by name
folderSchema.pre(/^find/, function(next) {
  this.sort({ order: 1, name: 1 });
  next();
});

module.exports = mongoose.model('Folder', folderSchema);
