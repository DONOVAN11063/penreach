const express = require('express');
const router = express.Router();
const contentSettingsController = require('../controllers/contentSettingsController');
const topicController = require('../controllers/topicController');

// ========== GRADES ROUTES ==========
// Get all grades (public, for material form dropdowns)
router.get('/grades', contentSettingsController.getAllGrades);

// Get grades with content counts
router.get('/grades/with-counts', contentSettingsController.getGradesWithCounts);

// CRUD routes
router.post('/grades', contentSettingsController.createGrade);
router.put('/grades/:id', contentSettingsController.updateGrade);
router.delete('/grades/:id', contentSettingsController.deleteGrade);

// ========== CATEGORIES ROUTES ==========
// Get all categories (public)
router.get('/categories', contentSettingsController.getAllCategories);

// Get single category by ID (for editing)
router.get('/categories/:id', contentSettingsController.getCategoryById);

// CRUD routes
router.post('/categories', contentSettingsController.createCategory);
router.put('/categories/:id', contentSettingsController.updateCategory);
router.delete('/categories/:id', contentSettingsController.deleteCategory);

// ========== SUBJECTS ROUTES ==========
// Get all subjects (public)
router.get('/subjects', contentSettingsController.getAllSubjects);

// Get single subject by ID (public, for editing)
router.get('/subjects/:id', contentSettingsController.getSubjectById);

// CRUD routes
router.post('/subjects', contentSettingsController.createSubject);
router.put('/subjects/:id', contentSettingsController.updateSubject);
router.delete('/subjects/:id', contentSettingsController.deleteSubject);

// ========== TOPICS ROUTES ==========
// Get all topics (public)
router.get('/topics', topicController.getAllTopics);

// Get single topic by ID (public, for editing)
router.get('/topics/:id', topicController.getTopicById);

// Get topics by grade and subject (public)
router.get('/topics/grade/:gradeId/subject/:subjectId', topicController.getTopicsByGradeAndSubject);

module.exports = router;
