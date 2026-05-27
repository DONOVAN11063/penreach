const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { getMaterials } = require('../controllers/materialController');
const { Material } = require('../models');

// Log all materials API calls
router.use((req, res, next) => {
  console.log('Materials API - Route called:', req.method, req.originalUrl);
  next();
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images, videos, and documents
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('Materials API - Test endpoint hit!');
  res.json({ message: 'Materials API is working!' });
});

// GET /api/materials?category=Science
router.get('/', (req, res, next) => {
  console.log('Materials API - Direct route hit!');
  getMaterials(req, res, next);
});

// POST /api/materials/bulk - Bulk upload multiple files
router.post('/bulk', upload.array('files', 50), async (req, res) => {
  try {
    const { title, description, type, grade, phase, subject, topic, term, folder, targetAudience } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    if (!type || !grade || !phase) {
      return res.status(400).json({ 
        error: 'Type, grade, and phase are required' 
      });
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        const materialData = {
          title: title ? title.trim() : file.originalname.replace(/\.[^/.]+$/, ''),
          description: description?.trim() || '',
          type,
          grade,
          phase,
          term: term ? parseInt(term) : 1,
          targetAudience: targetAudience || 'student'
        };
        
        // Add optional fields if provided
        if (subject) materialData.subjectId = subject;
        if (topic) materialData.topicId = topic;
        if (folder) materialData.folderId = folder;
        
        // Add file path
        materialData.filePath = file.filename;
        materialData.url = `/uploads/${file.filename}`;
        
        const material = await Material.create(materialData);
        
        // Populate related data for response
        await material.populate('grade');
        await material.populate('categoryId');
        await material.populate('subjectId');
        await material.populate('topicId');
        await material.populate('folderId');
        
        results.push({
          success: true,
          material,
          filename: file.originalname
        });
        
      } catch (err) {
        errors.push({
          success: false,
          error: err.message,
          filename: file.originalname
        });
      }
    }
    
    res.status(201).json({
      message: `Successfully uploaded ${results.length} files`,
      results,
      errors,
      total: req.files.length,
      successful: results.length,
      failed: errors.length
    });
    
  } catch (err) {
    console.error('Error in bulk upload:', err);
    res.status(400).json({ error: 'Bulk upload failed: ' + err.message });
  }
});

// POST /api/materials - Create new material
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, description, type, grade, phase, subject, topic, term, folder, targetAudience } = req.body;
    
    // Validate required fields
    if (!title || !type || !grade || !phase) {
      return res.status(400).json({ 
        error: 'Title, type, grade, and phase are required' 
      });
    }
    
    const materialData = {
      title: title.trim(),
      description: description?.trim() || '',
      type,
      grade,
      phase,
      term: term ? parseInt(term) : 1,
      targetAudience: targetAudience || 'student'
    };
    
    // Add optional fields if provided
    if (subject) materialData.subjectId = subject;
    if (topic) materialData.topicId = topic;
    if (folder) materialData.folderId = folder;
    
    // Add file path if file was uploaded
    if (req.file) {
      materialData.filePath = req.file.filename;
      materialData.url = `/uploads/${req.file.filename}`;
    }
    
    const material = await Material.create(materialData);
    
    // Populate related data for response
    await material.populate('grade');
    await material.populate('categoryId');
    await material.populate('subjectId');
    await material.populate('topicId');
    await material.populate('folderId');
    
    res.status(201).json(material);
  } catch (err) {
    console.error('Error creating material:', err);
    res.status(400).json({ error: 'Failed to create material: ' + err.message });
  }
});

// PUT /api/materials/:id - Update material
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { title, description, type, grade, phase, subject, topic, term, folder } = req.body;
    const { id } = req.params;
    
    const updateData = {};
    
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (type) updateData.type = type;
    if (grade) updateData.grade = grade;
    if (phase) updateData.phase = phase;
    if (term) updateData.term = parseInt(term);
    if (subject) updateData.subjectId = subject;
    if (topic) updateData.topicId = topic;
    if (folder) updateData.folderId = folder;
    
    // Add file path if new file was uploaded
    if (req.file) {
      updateData.filePath = req.file.filename;
      updateData.url = `/uploads/${req.file.filename}`;
    }
    
    const material = await Material.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('grade')
     .populate('categoryId')
     .populate('subjectId')
     .populate('topicId')
     .populate('folderId');
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json(material);
  } catch (err) {
    console.error('Error updating material:', err);
    res.status(400).json({ error: 'Failed to update material: ' + err.message });
  }
});

// DELETE /api/materials/:id - Delete material
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const material = await Material.findByIdAndDelete(id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    // TODO: Delete file from filesystem if it exists
    
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (err) {
    console.error('Error deleting material:', err);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

module.exports = router;