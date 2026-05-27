const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { Material } = require('../models');

// Configure multer for quiz uploads (if needed for quiz images/files)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/quizzes/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for quiz files
  }
});

// GET /api/quizzes - Get all quizzes
router.get('/', async (req, res) => {
  try {
    const { grade, phase, subject, topic, term, folder, search, targetAudience } = req.query;
    const filter = { type: 'quiz' };
    
    if (grade && grade.trim() !== '') filter.grade = grade;
    if (phase && phase.trim() !== '') filter.phase = phase;
    if (subject && subject.trim() !== '') {
      filter.$or = filter.$or || [];
      filter.$or.push({ subjectId: subject });
      filter.$or.push({ categoryId: subject });
    }
    if (topic && topic.trim() !== '') filter.topicId = topic;
    if (term && term.trim() !== '') filter.term = parseInt(term);
    if (folder && folder.trim() !== '') filter.folderId = folder;
    
    // Filter by target audience (student or teacher) - REQUIRED
    if (!targetAudience || targetAudience.trim() === '') {
      return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
    }
    filter.targetAudience = targetAudience;
    
    // Search by title or description
    if (search) {
      const searchClause = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: searchClause });
      } else {
        filter.$or = searchClause;
      }
    }
    
    const quizzes = await Material.find(filter)
      .populate('grade')
      .populate('categoryId')
      .populate('subjectId')
      .populate('topicId')
      .populate('folderId')
      .sort({ createdAt: -1 });
    
    res.json(quizzes);
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// POST /api/quizzes - Create quiz
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, description, grade, phase, category, subject, topic, term, folderId, duration, targetAudience } = req.body;
    const questions = typeof req.body.questions === 'string'
      ? JSON.parse(req.body.questions)
      : req.body.questions;
    
    // Validate required fields
    if (!title || !grade || !phase) {
      return res.status(400).json({ 
        error: 'Title, grade, and phase are required' 
      });
    }
    
    const quizData = {
      title: title.trim(),
      description: description?.trim() || '',
      type: 'quiz',
      grade,
      phase,
      term: term ? parseInt(term) : 1,
      targetAudience: targetAudience || 'student'
    };
    
    // Add optional fields if provided
    if (category) quizData.categoryId = category;
    if (subject) quizData.subjectId = subject;
    if (topic) quizData.topicId = topic;
    if (folderId) quizData.folderId = folderId;
    
    // Store quiz-specific data in description or as JSON string
    if (duration) quizData.duration = parseInt(duration);
    if (questions && Array.isArray(questions) && questions.length > 0) {
      quizData.questions = questions;
    }
    
    const quiz = await Material.create(quizData);
    
    // Populate related data for response
    await quiz.populate('grade');
    await quiz.populate('categoryId');
    await quiz.populate('subjectId');
    await quiz.populate('topicId');
    await quiz.populate('folderId');
    
    res.status(201).json(quiz);
  } catch (err) {
    console.error('Error creating quiz:', err);
    res.status(400).json({ error: 'Failed to create quiz: ' + err.message });
  }
});

// POST /api/quizzes/bulk - Bulk create quizzes
router.post('/bulk', async (req, res) => {
  try {
    const { quizzes } = req.body;
    
    if (!quizzes || !Array.isArray(quizzes) || quizzes.length === 0) {
      return res.status(400).json({ error: 'No quizzes provided' });
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < quizzes.length; i++) {
      const quizData = quizzes[i];
      
      try {
        // Validate required fields
        if (!quizData.title || !quizData.grade || !quizData.phase) {
          throw new Error('Title, grade, and phase are required');
        }
        
        const data = {
          title: quizData.title.trim(),
          description: quizData.description?.trim() || '',
          type: 'quiz',
          grade: quizData.grade,
          phase: quizData.phase,
          term: quizData.term ? parseInt(quizData.term) : 1,
          targetAudience: quizData.targetAudience || 'student'
        };
        
        // Add optional fields if provided
        if (quizData.subject) data.subjectId = quizData.subject;
        if (quizData.topic) data.topicId = quizData.topic;
        if (quizData.folder) data.folderId = quizData.folder;
        if (quizData.duration) data.duration = parseInt(quizData.duration);
        if (quizData.questions) data.questions = quizData.questions;
        
        const quiz = await Material.create(data);
        
        // Populate related data for response
        await quiz.populate('grade');
        await quiz.populate('categoryId');
        await quiz.populate('subjectId');
        await quiz.populate('topicId');
        await quiz.populate('folderId');
        
        results.push({
          success: true,
          quiz,
          title: quizData.title
        });
        
      } catch (err) {
        errors.push({
          success: false,
          error: err.message,
          title: quizData.title || 'Unknown'
        });
      }
    }
    
    res.status(201).json({
      message: `Successfully created ${results.length} quizzes`,
      results,
      errors,
      total: quizzes.length,
      successful: results.length,
      failed: errors.length
    });
    
  } catch (err) {
    console.error('Error in bulk quiz creation:', err);
    res.status(400).json({ error: 'Bulk creation failed: ' + err.message });
  }
});

// PUT /api/quizzes/:id - Update quiz
router.put('/:id', async (req, res) => {
  try {
    const { title, description, grade, phase, subject, topic, term, folder, duration, questions } = req.body;
    const { id } = req.params;
    
    const updateData = {};
    
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (grade) updateData.grade = grade;
    if (phase) updateData.phase = phase;
    if (term) updateData.term = parseInt(term);
    if (subject) updateData.subjectId = subject;
    if (topic) updateData.topicId = topic;
    if (folder) updateData.folderId = folder;
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (questions !== undefined) updateData.questions = questions;
    
    const quiz = await Material.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('grade')
     .populate('categoryId')
     .populate('subjectId')
     .populate('topicId')
     .populate('folderId');
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (err) {
    console.error('Error updating quiz:', err);
    res.status(400).json({ error: 'Failed to update quiz: ' + err.message });
  }
});

// DELETE /api/quizzes/:id - Delete quiz
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const quiz = await Material.findOneAndDelete({ _id: id, type: 'quiz' });
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error('Error deleting quiz:', err);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

module.exports = router;
