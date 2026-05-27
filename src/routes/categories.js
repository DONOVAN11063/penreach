const express = require('express');
const router = express.Router();
const { Category } = require('../models');

// GET /api/categories?grade=gradeId&category=categoryId&targetAudience=student
router.get('/', async (req, res) => {
  try {
    const { grade, category, targetAudience } = req.query;
    
    // Handle categories only - subjects should come from /api/subjects
    const filter = { kind: 'category' };
    
    if (grade) filter.grade = grade;
    if (category) filter.category = category;
    
    // Filter by target audience (student or teacher)
    if (targetAudience && targetAudience.trim() !== '') {
      filter.targetAudience = targetAudience;
    }
    
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
