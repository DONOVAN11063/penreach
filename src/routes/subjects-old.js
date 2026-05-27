const express = require('express');
const router = express.Router();
const { Category } = require('../models');

// GET /api/subjects?phase=Foundation
router.get('/', async (req, res) => {
  try {
    const { phase } = req.query;
    const filter = { kind: 'subject' };
    
    if (phase && phase.trim() !== '') {
      filter.phase = phase;
    }
    
    const subjects = await Category.find(filter)
      .populate('grade')
      .populate('category')
      .sort({ term: 1, 'category.name': 1, name: 1 });
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

module.exports = router;
