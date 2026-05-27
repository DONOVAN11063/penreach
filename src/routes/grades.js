const express = require('express');
const router = express.Router();
const { Grade } = require('../models');

// GET /api/grades?phase=Foundation&targetAudience=student
router.get('/', async (req, res) => {
  try {
    const { phase, targetAudience } = req.query;
    const filter = {};
    
    if (phase && phase.trim() !== '') {
      filter.phase = phase;
    }
    
    // Filter by target audience (student or teacher)
    if (targetAudience && targetAudience.trim() !== '') {
      filter.targetAudience = targetAudience;
    }
    
    const grades = await Grade.find(filter).sort({ value: 1 });
    res.json(grades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

module.exports = router;
