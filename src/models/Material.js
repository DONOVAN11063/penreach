const mongoose = require('mongoose');



const materialSchema = new mongoose.Schema({

  title: { type: String, required: true },

  subjectId: { 

    type: mongoose.Schema.Types.ObjectId,

    ref: 'Subject'

  },

  categoryId: { 

    type: mongoose.Schema.Types.ObjectId,

    ref: 'Category'

  },

  topicId: {

    type: mongoose.Schema.Types.ObjectId,

    ref: 'Topic'

  },

  folderId: {

    type: mongoose.Schema.Types.ObjectId,

    ref: 'Folder'

  },

  grade: { 

    type: mongoose.Schema.Types.ObjectId,

    ref: 'Grade',

    required: true 

  },

  phase: {

    type: String,

    required: true,

    enum: ['Foundation', 'Intermediate', 'Senior', 'FET']

  },

  term: {

    type: Number,

    required: true,

    enum: [1, 2, 3, 4],

    default: 1

  },

  type: { type: String, required: true, enum: ['document', 'video', 'quiz'] },

  description: String,

  url: String,

  filePath: String,

  targetAudience: { 
    type: String, 
    required: true, 
    enum: ['student', 'teacher'],
    default: 'student'
  },

  createdAt: { type: Date, default: Date.now },

  updatedAt: { type: Date, default: Date.now }

});



module.exports = mongoose.model('Material', materialSchema);