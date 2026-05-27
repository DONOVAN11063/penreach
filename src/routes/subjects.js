const express = require('express');
const router = express.Router();
const { Subject } = require('../models');

// GET /api/subjects?phase=Foundation&grade=gradeId&category=categoryId&targetAudience=student
router.get('/', async (req, res) => {
    try {
        const { phase, grade, category, targetAudience } = req.query;
        const filter = {};
        
        if (phase && phase.trim() !== '') {
            filter.phase = phase;
        }
        if (grade) {
            filter.grade = grade;
        }
        if (category) {
            filter.category = category;
        }
        
        // Filter by target audience (student or teacher)
        if (targetAudience && targetAudience.trim() !== '') {
            filter.targetAudience = targetAudience;
        }
        
        const subjects = await Subject.find(filter)
            .populate('grade')
            .populate('category')
            .sort({ name: 1 });
            
        res.json(subjects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

module.exports = router;
