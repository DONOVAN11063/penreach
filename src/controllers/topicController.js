const { Topic } = require('../models');

// Get all topics with optional filters
exports.getAllTopics = async (req, res) => {
    try {
        const { phase, grade, subject, term, isActive, targetAudience } = req.query;
        
        // Require targetAudience parameter
        if (!targetAudience || targetAudience.trim() === '') {
            return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
        }
        
        const filter = { targetAudience };
        if (phase) filter.phase = phase;
        if (grade) filter.grade = grade;
        if (subject) filter.subject = subject;
        if (term) filter.term = parseInt(term);
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        
        const topics = await Topic.find(filter)
            .populate('grade', 'value phase')
            .populate('subject', 'name')
            .sort({ term: 1, order: 1, name: 1 });
        
        res.json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).json({ error: 'Failed to fetch topics' });
    }
};

// Get topics by grade and subject
exports.getTopicsByGradeAndSubject = async (req, res) => {
    try {
        const { gradeId, subjectId } = req.params;
        const { phase, term, isActive, targetAudience } = req.query;
        
        // Require targetAudience parameter
        if (!targetAudience || targetAudience.trim() === '') {
            return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
        }
        
        const filter = { grade: gradeId, subject: subjectId, targetAudience };
        if (phase) filter.phase = phase;
        if (term) filter.term = parseInt(term);
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        
        const topics = await Topic.find(filter)
            .populate('grade', 'value phase')
            .populate('subject', 'name')
            .sort({ term: 1, order: 1, name: 1 });
        
        res.json(topics);
    } catch (error) {
        console.error('Error fetching topics by grade and subject:', error);
        res.status(500).json({ error: 'Failed to fetch topics' });
    }
};

// Get single topic by ID
exports.getTopicById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const topic = await Topic.findById(id)
            .populate('grade', 'value phase')
            .populate('subject', 'name');
        
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        
        res.json(topic);
    } catch (error) {
        console.error('Error fetching topic:', error);
        res.status(500).json({ error: 'Failed to fetch topic' });
    }
};

// Create new topic
exports.createTopic = async (req, res) => {
    try {
        const { name, description, phase, grade, subject, term, order, isActive, targetAudience } = req.body;
        
        // Validate required fields
        if (!name || !phase) {
            return res.status(400).json({ error: 'Missing required fields: name, phase' });
        }
        
        // Validate term is 1-4 if provided
        if (term && ![1, 2, 3, 4].includes(parseInt(term))) {
            return res.status(400).json({ error: 'Term must be 1, 2, 3, or 4' });
        }
        
        // Check if topic already exists for the same target audience (only check name and phase if grade/subject are optional)
        const existingQuery = { name: name.trim(), phase, targetAudience };
        if (grade) existingQuery.grade = grade;
        if (subject) existingQuery.subject = subject;
        if (term) existingQuery.term = parseInt(term);
        
        const existing = await Topic.findOne(existingQuery);
        
        if (existing) {
            return res.status(400).json({ error: 'Topic already exists for this audience' });
        }
        
        const topic = await Topic.create({
            name: name.trim(),
            description: description?.trim() || '',
            phase,
            grade,
            subject,
            term: parseInt(term),
            order: order || 0,
            isActive: isActive !== undefined ? isActive : true,
            targetAudience: targetAudience || 'student'
        });
        
        // Populate references for response
        await topic.populate('grade', 'value phase');
        await topic.populate('subject', 'name');
        
        res.status(201).json(topic);
    } catch (error) {
        console.error('Error creating topic:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Topic already exists' });
        }
        res.status(400).json({ error: 'Failed to create topic' });
    }
};

// Update topic
exports.updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, phase, grade, subject, term, order, isActive } = req.body;
        
        const updates = {};
        if (name) updates.name = name.trim();
        if (description !== undefined) updates.description = description.trim();
        if (phase) updates.phase = phase;
        if (grade) updates.grade = grade;
        if (subject) updates.subject = subject;
        if (term) updates.term = parseInt(term);
        if (order !== undefined) updates.order = order;
        if (isActive !== undefined) updates.isActive = isActive;
        
        // Validate term if provided
        if (updates.term && ![1, 2, 3, 4].includes(updates.term)) {
            return res.status(400).json({ error: 'Term must be 1, 2, 3, or 4' });
        }
        
        const topic = await Topic.findByIdAndUpdate(
            id, 
            updates, 
            { new: true, runValidators: true }
        ).populate('grade', 'value phase')
        .populate('subject', 'name');
        
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        
        res.json(topic);
    } catch (error) {
        console.error('Error updating topic:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Topic with these details already exists' });
        }
        res.status(400).json({ error: 'Failed to update topic' });
    }
};

// Delete topic
exports.deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        
        const topic = await Topic.findByIdAndDelete(id);
        
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        
        res.json({ success: true, message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ error: 'Failed to delete topic' });
    }
};

// Get topics for student portal (optimized for student use)
exports.getStudentTopics = async (req, res) => {
    try {
        const { phase, grade, subject, term, targetAudience } = req.query;
        
        // Validate required parameters
        if (!phase || !grade || !subject) {
            return res.status(400).json({ error: 'Missing required parameters: phase, grade, subject' });
        }
        
        const filter = { 
            phase, 
            grade, 
            subject, 
            isActive: true 
        };
        
        if (term) filter.term = parseInt(term);
        
        // Filter by target audience (student or teacher)
        if (targetAudience && targetAudience.trim() !== '') {
            filter.targetAudience = targetAudience;
        }
        
        const topics = await Topic.find(filter)
            .populate('grade', 'value')
            .populate('subject', 'name')
            .select('name description phase grade subject term order')
            .sort({ term: 1, order: 1, name: 1 });
        
        res.json(topics);
    } catch (error) {
        console.error('Error fetching student topics:', error);
        res.status(500).json({ error: 'Failed to fetch topics' });
    }
};
