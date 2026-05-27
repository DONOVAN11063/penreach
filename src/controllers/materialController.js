const { Material, Grade, Category, Topic } = require('../models');

async function getMaterials(req, res) {
  const { grade, category, subcategory, search, type, phase, topic, topicId, term, subject, folder, targetAudience, teacherPhases } = req.query;
  const filter = {};

  if (grade && grade.trim() !== '') filter.grade = grade;
  if (category && category.trim() !== '') filter.category = category;
  if (subcategory && subcategory.trim() !== '') filter.subcategory = subcategory;
  if (type && type.trim() !== '') filter.type = type;
  if (phase && phase.trim() !== '') filter.phase = phase;
  if (topic && topic.trim() !== '') filter.topic = topic;
  if (topicId && topicId.trim() !== '') filter.topicId = topicId;
  if (term && term.trim() !== '') filter.term = parseInt(term);
  if (subject && subject.trim() !== '') {
    // match either subjectId field or legacy category field
    filter.$or = filter.$or || [];
    filter.$or.push({ subjectId: subject });
    filter.$or.push({ categoryId: subject });
  }
  if (folder && folder.trim() !== '' && folder !== '[object Event]') {
    filter.folderId = folder;
  }

  // Filter by target audience (student or teacher) - REQUIRED
  if (!targetAudience || targetAudience.trim() === '') {
    return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
  }
  filter.targetAudience = targetAudience;

  // Filter by teacher's selected phases (for teachers viewing materials)
  if (teacherPhases && teacherPhases.trim() !== '') {
    const phases = JSON.parse(teacherPhases);
    filter.$or = filter.$or || [];
    filter.$or.push({ phase: { $in: phases } });
  }

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

  console.log('Materials filter:', filter);

  try {
    const materials = await Material.find(filter)
      .populate('grade')
      .populate('categoryId')
      .populate('subjectId')
      .populate('topicId')
      .populate('folderId')
      .sort({ createdAt: -1 });

    console.log('Materials found:', materials.length);

    res.json(materials);
  } catch (err) {
    console.error('Error fetching materials:', err);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
}

module.exports = { getMaterials };