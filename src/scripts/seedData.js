const mongoose = require('mongoose');
const { Grade, Category, Subcategory } = require('../models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/steam_db';

const PHASES = ['Foundation', 'Intermediate', 'Senior', 'FET'];
const DEFAULT_GRADES = ['Grade R', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

// Proper grade-to-phase mappings
const GRADE_PHASE_MAPPINGS = {
  'Foundation': ['Grade R', 'Grade 1', 'Grade 2', 'Grade 3'],
  'Intermediate': ['Grade 4', 'Grade 5', 'Grade 6'],
  'Senior': ['Grade 7', 'Grade 8', 'Grade 9'],
  'FET': ['Grade 10', 'Grade 11', 'Grade 12']
};

const CATEGORY_TEMPLATES = [
  {
    name: 'Science',
    description: 'Natural sciences and biology',
    color: '#FF6B6B',
    icon: '🔬',
    order: 1
  },
  {
    name: 'Technology',
    description: 'Technology and computer science',
    color: '#4ECDC4',
    icon: '💻',
    order: 2
  },
  {
    name: 'Engineering',
    description: 'Engineering and design',
    color: '#45B7D1',
    icon: '⚙️',
    order: 3
  },
  {
    name: 'Arts',
    description: 'Visual and performing arts',
    color: '#FFA07A',
    icon: '🎨',
    order: 4
  },
  {
    name: 'Mathematics',
    description: 'Mathematics and numeracy',
    color: '#98D8C8',
    icon: '📐',
    order: 5
  }
];

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Check if grades already exist
    const gradeCount = await Grade.countDocuments();
    if (gradeCount === 0) {
      console.log('Seeding grades with proper phase mappings...');
      const grades = [];
      
      // Create grades for each phase using proper mappings
      Object.entries(GRADE_PHASE_MAPPINGS).forEach(([phase, gradeValues]) => {
        gradeValues.forEach(gradeValue => {
          grades.push({
            value: gradeValue,
            phase: phase,
            description: `${gradeValue} - ${phase} Phase`
          });
        });
      });
      
      await Grade.insertMany(grades);
      console.log(`✓ Grades seeded successfully (${grades.length} total)`);
    } else {
      console.log(`✓ Grades already exist (${gradeCount} found)`);
    }

    // Check if categories already exist
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('Seeding categories with phases...');
      const categories = [];
      
      // Create categories for each phase
      PHASES.forEach(phase => {
        CATEGORY_TEMPLATES.forEach(template => {
          categories.push({
            name: template.name,
            phase: phase,
            description: template.description,
            color: template.color,
            icon: template.icon,
            order: template.order,
            kind: 'category'
          });
        });
      });
      
      await Category.insertMany(categories);
      console.log(`✓ Categories seeded successfully (${categories.length} total - ${CATEGORY_TEMPLATES.length} per phase)`);
    } else {
      console.log(`✓ Categories already exist (${categoryCount} found)`);
    }

    console.log('\n✓ Data seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
