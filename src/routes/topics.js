const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');

// GET /api/topics - Get all topics with optional filters
router.get('/', topicController.getAllTopics);

// GET /api/topics/student - Get topics for student portal
router.get('/student', topicController.getStudentTopics);

// GET /api/topics/grade/:gradeId/subject/:subjectId - Get topics by grade and subject
router.get('/grade/:gradeId/subject/:subjectId', topicController.getTopicsByGradeAndSubject);

// GET /api/topics/:id - Get single topic by ID
router.get('/:id', topicController.getTopicById);

// POST /api/topics - Create new topic
router.post('/', topicController.createTopic);

// PUT /api/topics/:id - Update topic
router.put('/:id', topicController.updateTopic);

// DELETE /api/topics/:id - Delete topic
router.delete('/:id', topicController.deleteTopic);

module.exports = router;
