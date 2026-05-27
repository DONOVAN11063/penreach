const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { Material } = require('../models');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/videos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for videos
  },
  fileFilter: function (req, file, cb) {
    // Accept only video files
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, AVI, MOV, WMV, FLV, WEBM, MKV files are allowed.'));
    }
  }
});

// GET /api/videos - Get all videos
router.get('/', async (req, res) => {
  try {
    const { grade, phase, subject, topic, term, folder, search, targetAudience } = req.query;
    const filter = { type: 'video' };
    
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
    
    const videos = await Material.find(filter)
      .populate('grade')
      .populate('categoryId')
      .populate('subjectId')
      .populate('topicId')
      .populate('folderId')
      .sort({ createdAt: -1 });
    
    res.json(videos);
  } catch (err) {
    console.error('Error fetching videos:', err);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// POST /api/videos - Upload video
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, description, grade, phase, subject, topic, term, folderId, url, targetAudience } = req.body;
    
    // Validate required fields
    if (!title || !grade || !phase) {
      return res.status(400).json({ 
        error: 'Title, grade, and phase are required' 
      });
    }
    
    const videoData = {
      title: title.trim(),
      description: description?.trim() || '',
      type: 'video',
      grade,
      phase,
      term: term ? parseInt(term) : 1,
      targetAudience: targetAudience || 'student'
    };
    
    // Add optional fields if provided
    if (subject) videoData.subjectId = subject;
    if (topic) videoData.topicId = topic;
    if (folderId) videoData.folderId = folderId;
    
    // Add file path if file was uploaded
    if (req.file) {
      videoData.filePath = req.file.filename;
      videoData.url = `/uploads/videos/${req.file.filename}`;
    }
    
    // Add external URL if provided
    if (url && url.trim()) {
      videoData.url = url.trim();
    }
    
    const video = await Material.create(videoData);
    
    // Populate related data for response
    await video.populate('grade');
    await video.populate('categoryId');
    await video.populate('subjectId');
    await video.populate('topicId');
    await video.populate('folderId');
    
    res.status(201).json(video);
  } catch (err) {
    console.error('Error creating video:', err);
    res.status(400).json({ error: 'Failed to create video: ' + err.message });
  }
});

// POST /api/videos/bulk - Bulk upload videos
router.post('/bulk', upload.array('files', 10), async (req, res) => {
  try {
    const { title, description, grade, phase, subject, topic, term, folder, targetAudience } = req.body;
    
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
        const videoData = {
          title: title ? title.trim() : file.originalname.replace(/\.[^/.]+$/, ''),
          description: description?.trim() || '',
          type: 'video',
          grade,
          phase,
          term: term ? parseInt(term) : 1,
          targetAudience: targetAudience || 'student'
        };
        
        // Add optional fields if provided
        if (subject) videoData.subjectId = subject;
        if (topic) videoData.topicId = topic;
        if (folder) videoData.folderId = folder;
        
        // Add file path
        videoData.filePath = file.filename;
        videoData.url = `/uploads/videos/${file.filename}`;
        
        const video = await Material.create(videoData);
        
        // Populate related data for response
        await video.populate('grade');
        await video.populate('categoryId');
        await video.populate('subjectId');
        await video.populate('topicId');
        await video.populate('folderId');
        
        results.push({
          success: true,
          video,
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
      message: `Successfully uploaded ${results.length} videos`,
      results,
      errors,
      total: req.files.length,
      successful: results.length,
      failed: errors.length
    });
    
  } catch (err) {
    console.error('Error in bulk video upload:', err);
    res.status(400).json({ error: 'Bulk upload failed: ' + err.message });
  }
});

// PUT /api/videos/:id - Update video
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { title, description, grade, phase, subject, topic, term, folder, url } = req.body;
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
      updateData.url = `/uploads/videos/${req.file.filename}`;
    }
    
    // Update external URL if provided
    if (url !== undefined) {
      updateData.url = url.trim() || null;
    }
    
    const video = await Material.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('grade')
     .populate('categoryId')
     .populate('subjectId')
     .populate('topicId')
     .populate('folderId');
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (err) {
    console.error('Error updating video:', err);
    res.status(400).json({ error: 'Failed to update video: ' + err.message });
  }
});

// DELETE /api/videos/:id - Delete video
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const video = await Material.findOneAndDelete({ _id: id, type: 'video' });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
