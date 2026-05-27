const express = require('express');
const router = express.Router();
const { Folder } = require('../models');

// GET /api/folders - Get all folders
router.get('/', async (req, res) => {
  try {
    const { grade, subject, phase, term, topic, targetAudience } = req.query;
    
    // Require targetAudience parameter
    if (!targetAudience || targetAudience.trim() === '') {
      return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
    }
    
    let filter = {
      $or: [
        { targetAudience },
        { targetAudience: { $exists: false } },
        { targetAudience: null }
      ]
    };
    
    if (grade) filter.grade = grade;
    if (subject) filter.subject = subject;
    if (phase) filter.phase = phase;
    if (term) filter.term = parseInt(term);
    if (topic) filter.topic = topic;
    
    const folders = await Folder.find(filter)
      .populate('grade', 'value')
      .populate('subject', 'name')
      .sort({ order: 1, name: 1 });
    
    res.json(folders);
  } catch (err) {
    console.error('Error fetching folders:', err);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// GET /api/folders/student - Get folders for student view (public)
router.get('/student', async (req, res) => {
  try {
    const { grade, subject, phase, term, topic, targetAudience } = req.query;
    
    // Require targetAudience parameter
    if (!targetAudience || targetAudience.trim() === '') {
      return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
    }
    
    let filter = {
      $or: [
        { targetAudience },
        { targetAudience: { $exists: false } },
        { targetAudience: null }
      ]
    };
    
    if (grade) filter.grade = grade;
    if (subject) filter.subject = subject;
    if (phase) filter.phase = phase;
    if (term) filter.term = parseInt(term);
    if (topic) filter.topic = topic;
    
    console.log('Student folders query:', filter);
    
    // Get folders without populate first
    const folders = await Folder.find(filter).sort({ order: 1, name: 1 });
    
    console.log('Found folders:', folders.length);
    
    // Return the expected format for the frontend
    res.json({
      folders: folders,
      materials: [] // Empty materials array for now
    });
  } catch (err) {
    console.error('Error fetching folders:', err);
    res.status(500).json({ error: 'Failed to fetch folders: ' + err.message });
  }
});

// POST /api/folders - Create new folder
router.post('/', async (req, res) => {
  try {
    const { name, description, grade, subject, phase, term, topic, contentTypes, order, targetAudience } = req.body;
    
    // Validate required fields
    if (!name || !grade || !subject || !phase || !topic) {
      return res.status(400).json({ 
        error: 'Name, grade, subject, phase, and topic are required' 
      });
    }
    
    // Check if folder with same name already exists for this grade/subject/topic/targetAudience
    const existingFolder = await Folder.findOne({ 
      name, 
      grade, 
      subject, 
      phase,
      topic,
      targetAudience
    });
    
    if (existingFolder) {
      return res.status(400).json({ 
        error: 'A folder with this name already exists for this grade, subject, topic, and audience' 
      });
    }
    
    const folder = await Folder.create({
      name: name.trim(),
      description: description?.trim() || '',
      grade,
      subject,
      phase,
      topic,
      term: term ? parseInt(term) : 1,
      contentTypes: contentTypes || {
        videos: true,
        quizzes: true,
        documents: true
      },
      order: order || 0,
      targetAudience: targetAudience || 'student'
    });
    
    // Populate the folder data for response
    await folder.populate('grade', 'value');
    await folder.populate('subject', 'name');
    await folder.populate('topic', 'name');
    
    res.status(201).json(folder);
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(400).json({ error: 'Failed to create folder' });
  }
});

// PUT /api/folders/:id - Update folder
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Name is required' 
      });
    }
    
    // Check if folder with same name already exists (excluding current folder)
    const existingFolder = await Folder.findOne({ 
      name: name.trim(), 
      _id: { $ne: id }
    });
    
    if (existingFolder) {
      return res.status(400).json({ 
        error: 'A folder with this name already exists' 
      });
    }
    
    const folder = await Folder.findByIdAndUpdate(
      id,
      { 
        name: name.trim(),
        description: description?.trim() || ''
      },
      { new: true, runValidators: true }
    ).populate('grade', 'value')
     .populate('subject', 'name')
     .populate('topic', 'name');
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    res.json(folder);
  } catch (err) {
    console.error('Error updating folder:', err);
    res.status(400).json({ error: 'Failed to update folder' });
  }
});

// DELETE /api/folders/:id - Delete folder
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if folder has materials
    const Material = require('../models/Material');
    const materialCount = await Material.countDocuments({ folder: id });
    
    if (materialCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete folder with ${materialCount} materials. Please move or delete the materials first.` 
      });
    }
    
    const folder = await Folder.findByIdAndDelete(id);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (err) {
    console.error('Error deleting folder:', err);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// GET /api/folders/:id/materials - Get materials in a specific folder
router.get('/:id/materials', async (req, res) => {
  try {
    const { id } = req.params;
    const Material = require('../models/Material');
    
    const materials = await Material.find({ folder: id })
      .populate('grade', 'value')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .sort({ createdAt: -1 });
    
    res.json(materials);
  } catch (err) {
    console.error('Error fetching folder materials:', err);
    res.status(500).json({ error: 'Failed to fetch folder materials' });
  }
});

module.exports = router;
