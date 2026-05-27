const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { Material } = require('../models');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only document files
    const allowedTypes = /pdf|doc|docx|ppt|pptx|txt|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, XLSX, XLS files are allowed.'));
    }
  }
});

// GET /api/documents - Get all documents
router.get('/', async (req, res) => {
  try {
    const { grade, phase, subject, topic, term, folder, search, targetAudience } = req.query;
    const filter = { type: 'document' };
    
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
    
    const documents = await Material.find(filter)
      .populate('grade')
      .populate('categoryId')
      .populate('subjectId')
      .populate('topicId')
      .populate('folderId')
      .sort({ createdAt: -1 });
    
    res.json(documents);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Upload document
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, description, grade, phase, subject, topic, term, folder, targetAudience } = req.body;
    
    // Validate required fields
    if (!title || !grade || !phase) {
      return res.status(400).json({ 
        error: 'Title, grade, and phase are required' 
      });
    }
    
    const documentData = {
      title: title.trim(),
      description: description?.trim() || '',
      type: 'document',
      grade,
      phase,
      term: term ? parseInt(term) : 1,
      targetAudience: targetAudience || 'student'
    };
    
    // Add optional fields if provided
    if (subject) documentData.subjectId = subject;
    if (topic) documentData.topicId = topic;
    if (folder) documentData.folderId = folder;
    
    // Add file path if file was uploaded
    if (req.file) {
      documentData.filePath = req.file.filename;
      documentData.url = `/uploads/documents/${req.file.filename}`;
    }
    
    const document = await Material.create(documentData);
    
    // Populate related data for response
    await document.populate('grade');
    await document.populate('categoryId');
    await document.populate('subjectId');
    await document.populate('topicId');
    await document.populate('folderId');
    
    res.status(201).json(document);
  } catch (err) {
    console.error('Error creating document:', err);
    res.status(400).json({ error: 'Failed to create document: ' + err.message });
  }
});

// POST /api/documents/bulk - Bulk upload documents
router.post('/bulk', upload.array('files', 50), async (req, res) => {
  try {
    const { title, description, grade, phase, subject, topic, term, folderId, targetAudience } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    if (!grade || !phase) {
      return res.status(400).json({ 
        error: 'Grade and phase are required' 
      });
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        const documentData = {
          title: title ? title.trim() : file.originalname.replace(/\.[^/.]+$/, ''),
          description: description?.trim() || '',
          type: 'document',
          grade,
          phase,
          term: term ? parseInt(term) : 1,
          targetAudience: targetAudience || 'student'
        };
        
        // Add optional fields if provided
        if (subject) documentData.subjectId = subject;
        if (topic) documentData.topicId = topic;
        if (folderId) documentData.folderId = folderId;
        
        // Add file path
        documentData.filePath = file.filename;
        documentData.url = `/uploads/documents/${file.filename}`;
        
        const document = await Material.create(documentData);
        
        // Populate related data for response
        await document.populate('grade');
        await document.populate('categoryId');
        await document.populate('subjectId');
        await document.populate('topicId');
        await document.populate('folderId');
        
        results.push({
          success: true,
          document,
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
      message: `Successfully uploaded ${results.length} documents`,
      results,
      errors,
      total: req.files.length,
      successful: results.length,
      failed: errors.length
    });
    
  } catch (err) {
    console.error('Error in bulk document upload:', err);
    res.status(400).json({ error: 'Bulk upload failed: ' + err.message });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { title, description, grade, phase, subject, topic, term, folder } = req.body;
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
    
    // Add file path if new file was uploaded
    if (req.file) {
      updateData.filePath = req.file.filename;
      updateData.url = `/uploads/documents/${req.file.filename}`;
    }
    
    const document = await Material.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('grade')
     .populate('categoryId')
     .populate('subjectId')
     .populate('topicId')
     .populate('folderId');
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(400).json({ error: 'Failed to update document: ' + err.message });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Material.findOneAndDelete({ _id: id, type: 'document' });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
