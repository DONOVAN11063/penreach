const Grade = require('../models/Grade');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Folder = require('../models/Folder');



// ==================== GRADES ====================



exports.getAllGrades = async (req, res) => {

  try {

    const { phase, targetAudience } = req.query;

    // Require targetAudience parameter
    if (!targetAudience || targetAudience.trim() === '') {
      return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
    }

    const filter = { targetAudience };

    if (phase) filter.phase = phase;

    const grades = await Grade.find(filter).sort('value');

    res.json(grades);

  } catch (error) {

    res.status(500).json({ error: 'Error fetching grades' });

  }

};

exports.getGradesWithCounts = async (req, res) => {
  try {
    const { phase, targetAudience } = req.query;

    // Require targetAudience parameter
    if (!targetAudience || targetAudience.trim() === '') {
      return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
    }

    const filter = { targetAudience };
    if (phase) filter.phase = phase;

    const grades = await Grade.find(filter).sort('value');

    // Get counts for each grade
    const gradesWithCounts = await Promise.all(grades.map(async (grade) => {
      const categoryCount = await Category.countDocuments({ grade: grade._id, targetAudience });
      const subjectCount = await Subject.countDocuments({ grade: grade._id, targetAudience });
      const topicCount = await Topic.countDocuments({ grade: grade._id, targetAudience });
      const folderCount = await Folder.countDocuments({ grade: grade._id, targetAudience });

      return {
        ...grade.toObject(),
        counts: {
          categories: categoryCount,
          subjects: subjectCount,
          topics: topicCount,
          folders: folderCount
        }
      };
    }));

    res.json(gradesWithCounts);
  } catch (error) {
    console.error('Error fetching grades with counts:', error);
    res.status(500).json({ error: 'Error fetching grades with counts' });
  }
};



exports.createGrade = async (req, res) => {

  try {

    const { value, phase, description, targetAudience } = req.body;

    

    // Validate input

    if (!value || value.trim() === '') {

      return res.status(400).json({ error: 'Grade value is required' });

    }

    

    if (!phase) {

      return res.status(400).json({ error: 'Phase is required' });

    }



    const validPhases = ['Foundation', 'Intermediate', 'Senior', 'FET'];

    if (!validPhases.includes(phase)) {

      return res.status(400).json({ error: 'Invalid phase' });

    }



    // Check if grade already exists in this phase for the same target audience
    const existing = await Grade.findOne({ value: value.trim(), phase, targetAudience });

    if (existing) {
      return res.status(400).json({ error: 'Grade already exists in this phase for this audience' });
    }



    const grade = new Grade({ value: value.trim(), phase, description, targetAudience: targetAudience || 'student' });

    await grade.save();

    res.status(201).json(grade);

  } catch (error) {

    res.status(500).json({ error: 'Error creating grade' });

  }

};



exports.updateGrade = async (req, res) => {

  try {

    const { id } = req.params;

    const { value, description } = req.body;



    if (!value || value.trim() === '') {

      return res.status(400).json({ error: 'Grade value is required' });

    }



    const grade = await Grade.findByIdAndUpdate(

      id,

      { value: value.trim(), description },

      { new: true, runValidators: true }

    );



    if (!grade) {

      return res.status(404).json({ error: 'Grade not found' });

    }



    res.json(grade);

  } catch (error) {

    res.status(500).json({ error: 'Error updating grade' });

  }

};



exports.deleteGrade = async (req, res) => {

  try {

    const { id } = req.params;



    const grade = await Grade.findByIdAndDelete(id);

    if (!grade) {

      return res.status(404).json({ error: 'Grade not found' });

    }



    res.json({ message: 'Grade deleted successfully' });

  } catch (error) {

    res.status(500).json({ error: 'Error deleting grade' });

  }

};



// ==================== CATEGORIES ====================



exports.getAllCategories = async (req, res) => {

  try {

    const { phase, grade, kind, targetAudience } = req.query;

    // Require targetAudience parameter
    if (!targetAudience || targetAudience.trim() === '') {
      return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
    }

    const filter = { targetAudience };

    if (kind && kind.trim() !== '') filter.kind = kind;

    if (phase && phase.trim() !== '') filter.phase = phase;

    if (grade && grade.trim() !== '') filter.grade = grade;

    const items = await Category.find(filter)

      .populate('category')

      .populate('grade')

      .sort('order');

    res.json(items);

  } catch (error) {

    console.error('Error in getAllCategories:', error);

    res.status(500).json({ error: 'Error fetching categories' });

  }

};



exports.createCategory = async (req, res) => {

  try {

    console.log(' Category creation request received');

    console.log(' Request body:', req.body);

    console.log(' Request headers:', req.headers);

    const { name, kind, phase, grade, description, color, icon, order, category, targetAudience } = req.body;

    console.log(' Parsed parameters:', { name, kind, phase, grade, description, color, icon, order, category });

    const entryKind = kind === 'category' ? 'category' : 'subject';

    if (!name) {

      return res.status(400).json({ error: 'Name is required' });

    }

    // Phase is required for subjects but not for categories (categories are universal)

    if (entryKind === 'subject' && !phase) {

      return res.status(400).json({ error: 'Phase is required for subjects' });

    }

    // Grade is required for both subjects and categories

    if (!grade) {

      console.log(' Validation failed: Grade is required');

      return res.status(400).json({ error: 'Grade is required' });

    }

    if (entryKind === 'subject' && !category) {

      return res.status(400).json({ error: 'Category is required for subjects' });

    }



    const validPhases = ['Foundation', 'Intermediate', 'Senior', 'FET'];

    if (entryKind === 'subject' && !validPhases.includes(phase)) {

      return res.status(400).json({ error: 'Invalid phase' });

    }



    // For categories, allow same name across different grades (no uniqueness constraint)
    // For subjects, check by name, phase, grade, kind, and targetAudience
    let existing = null;
    if (entryKind === 'subject') {
      const uniquenessFilter = { name: name.trim(), phase, grade, kind: entryKind, targetAudience };
      existing = await Category.findOne(uniquenessFilter);
      if (existing) {
        const location = ' in this phase and grade for this audience';
        return res.status(400).json({ error: `${entryKind} already exists${location}` });
      }
    }

    const newCategory = new Category({ 
      name: name.trim(), 
      kind: entryKind, 
      phase: entryKind === 'subject' ? phase : undefined, // Only set phase for subjects
      grade: entryKind === 'category' ? grade : (grade || undefined), // Always set grade for categories
      description, 
      color, 
      icon, 
      order, 
      category: entryKind === 'subject' ? category : undefined,
      targetAudience: targetAudience || 'student'
    });
    
    console.log(' Saving category:', {
      name: name.trim(),
      kind: entryKind,
      phase: entryKind === 'subject' ? phase : undefined,
      grade: grade || undefined
    });
    
    await newCategory.save();
    console.log(' Category saved successfully:', newCategory._id);

    res.status(201).json(newCategory);

  } catch (error) {
    console.error('❌ Error creating category:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Error creating entry', details: error.message });

  }

};



// Get single category by ID

exports.getCategoryById = async (req, res) => {

  try {

    const { id } = req.params;

    

    if (!id) {

      return res.status(400).json({ error: 'Category ID is required' });

    }

    

    const category = await Category.findById(id).populate('grade category');

    

    if (!category) {

      return res.status(404).json({ error: 'Category not found' });

    }

    

    res.json(category);

  } catch (error) {

    console.error('Error in getCategoryById:', error);

    res.status(500).json({ error: 'Error fetching category' });

  }

};



exports.updateCategory = async (req, res) => {

  try {

    const { id } = req.params;

    const { name, kind, phase, grade, description, color, icon, order, category } = req.body;



    const updates = {};

    if (name) updates.name = name.trim();

    if (kind) updates.kind = kind;

    if (phase) updates.phase = phase;

    if (grade) updates.grade = grade;

    if (description) updates.description = description;

    if (color) updates.color = color;

    if (icon) updates.icon = icon;

    if (order !== undefined) updates.order = order;

    if (category !== undefined) updates.category = category;



    // ensure uniqueness within phase+grade+kind, but for categories grade is not considered

    if (updates.name || updates.phase || updates.grade || updates.kind) {

      const filter = {

        _id: { $ne: id },  // Exclude current item being edited

        name: updates.name || undefined,

        phase: updates.phase || undefined,

        kind: updates.kind || undefined

      };

      if (updates.kind === 'subject' || (updates.grade !== undefined)) {

        filter.grade = updates.grade;

      }

      const existing = await Category.findOne(filter);

      if (existing) {

        return res.status(400).json({ error: 'Entry already exists in this phase and grade' });

      }

    }



    const categoryEntry = await Category.findByIdAndUpdate(

      id,

      updates,

      { new: true, runValidators: true }

    ).populate('category');



    if (!categoryEntry) {

      return res.status(404).json({ error: 'Entry not found' });

    }



    res.json(categoryEntry);

  } catch (error) {

    res.status(500).json({ error: 'Error updating entry' });

  }

};



exports.deleteCategory = async (req, res) => {

  try {

    const { id } = req.params;



    const category = await Category.findByIdAndDelete(id);

    if (!category) {

      return res.status(404).json({ error: 'Category not found' });

    }



    // Also delete subjects that reference this category (subjects are also Category documents with kind='subject')

    await Category.deleteMany({ category: id, kind: 'subject' });



    res.json({ message: 'Category deleted successfully' });

  } catch (error) {

    console.error('Error deleting category:', error);

    res.status(500).json({ error: 'Error deleting category' });

  }

};



// ==================== SUBJECTS ====================

exports.getAllSubjects = async (req, res) => {
  try {
    const { phase, grade, category, targetAudience } = req.query;
    
    // Require targetAudience parameter
    if (!targetAudience || targetAudience.trim() === '') {
      return res.status(400).json({ error: 'targetAudience parameter is required (student or teacher)' });
    }
    
    const filter = { targetAudience };
    
    if (phase) filter.phase = phase;
    if (grade) filter.grade = grade;
    if (category) filter.category = category;
    
    const subjects = await Subject.find(filter)
      .populate('grade')
      .populate('category')
      .sort({ name: 1 });
    
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching subjects' });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('grade')
      .populate('category');
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching subject' });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { name, description, phase, grade, category, icon, targetAudience } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    
    if (!phase) {
      return res.status(400).json({ error: 'Phase is required' });
    }
    
    // Check if subject already exists for the same target audience
    const existing = await Subject.findOne({ name: name.trim(), phase, grade, targetAudience });
    if (existing) {
      return res.status(400).json({ error: 'Subject already exists in this phase and grade for this audience' });
    }
    
    const subject = new Subject({
      name: name.trim(),
      description: description || '',
      phase,
      grade: grade || null,
      category: category || null,
      icon: icon || 'fas fa-book',
      targetAudience: targetAudience || 'student'
    });
    
    await subject.save();
    
    // Populate references for response
    await subject.populate('grade');
    await subject.populate('category');
    
    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Error creating subject' });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { name, description, phase, grade, category } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description: description || '',
        phase,
        grade,
        category
      },
      { new: true, runValidators: true }
    ).populate('grade').populate('category');
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Error updating subject' });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Error deleting subject' });
  }
};

// ==================== SUBJECTS END ====================

// ==================== CATEGORIES END ====================

