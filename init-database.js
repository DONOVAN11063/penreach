const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { Grade, Category, Topic, Material } = require('./src/models');

async function initializeDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/steam_db');
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log('Clearing existing data...');
    await Material.deleteMany({});
    await Topic.deleteMany({});
    await Category.deleteMany({});
    await Grade.deleteMany({});

    // Create Grades
    console.log('Creating Grades...');
    const grades = [
      // Foundation Phase
      { value: 'Grade R', phase: 'Foundation', description: 'Reception Grade' },
      { value: 'Grade 1', phase: 'Foundation', description: 'First Grade' },
      { value: 'Grade 2', phase: 'Foundation', description: 'Second Grade' },
      { value: 'Grade 3', phase: 'Foundation', description: 'Third Grade' },
      
      // Intermediate Phase
      { value: 'Grade 4', phase: 'Intermediate', description: 'Fourth Grade' },
      { value: 'Grade 5', phase: 'Intermediate', description: 'Fifth Grade' },
      { value: 'Grade 6', phase: 'Intermediate', description: 'Sixth Grade' },
      
      // Senior Phase
      { value: 'Grade 7', phase: 'Senior', description: 'Seventh Grade' },
      { value: 'Grade 8', phase: 'Senior', description: 'Eighth Grade' },
      { value: 'Grade 9', phase: 'Senior', description: 'Ninth Grade' },
      
      // FET Phase (Further Education and Training)
      { value: 'Grade 10', phase: 'FET', description: 'Tenth Grade' },
      { value: 'Grade 11', phase: 'FET', description: 'Eleventh Grade' },
      { value: 'Grade 12', phase: 'FET', description: 'Matric Grade' }
    ];

    const createdGrades = await Grade.insertMany(grades);
    console.log(`Created ${createdGrades.length} grades`);

    // Create main STEAM Categories
    console.log('Creating STEAM Categories...');
    const steamCategories = [
      { 
        name: 'Science', 
        description: 'Natural Sciences and Biology',
        color: '#10b981',
        icon: ' Science',
        kind: 'category',
        order: 1
      },
      { 
        name: 'Technology', 
        description: 'Digital Technology and Computer Science',
        color: '#3b82f6',
        icon: ' Technology',
        kind: 'category',
        order: 2
      },
      { 
        name: 'Engineering', 
        description: 'Engineering Design and Mathematics',
        color: '#f59e0b',
        icon: ' Engineering',
        kind: 'category',
        order: 3
      },
      { 
        name: 'Arts', 
        description: 'Creative Arts and Culture',
        color: '#8b5cf6',
        icon: ' Arts',
        kind: 'category',
        order: 4
      },
      { 
        name: 'Mathematics', 
        description: 'Mathematics and Mathematical Literacy',
        color: '#ef4444',
        icon: ' Mathematics',
        kind: 'category',
        order: 5
      }
    ];

    const createdCategories = await Category.insertMany(steamCategories);
    console.log(`Created ${createdCategories.length} main categories`);

    // Create sample subjects for each phase
    console.log('Creating sample subjects...');
    const foundationGrade = createdGrades.find(g => g.value === 'Grade 1');
    const intermediateGrade = createdGrades.find(g => g.value === 'Grade 4');
    const seniorGrade = createdGrades.find(g => g.value === 'Grade 8');
    const fetGrade = createdGrades.find(g => g.value === 'Grade 10');

    const subjects = [];

    // Foundation Phase Subjects
    if (foundationGrade) {
      subjects.push(
        {
          name: 'Life Skills',
          phase: 'Foundation',
          grade: foundationGrade._id,
          category: createdCategories.find(c => c.name === 'Arts')._id,
          kind: 'subject',
          term: 1,
          description: 'Life Skills for Foundation Phase'
        },
        {
          name: 'Beginning Knowledge',
          phase: 'Foundation',
          grade: foundationGrade._id,
          category: createdCategories.find(c => c.name === 'Science')._id,
          kind: 'subject',
          term: 1,
          description: 'Introduction to Science and Technology'
        }
      );
    }

    // Intermediate Phase Subjects
    if (intermediateGrade) {
      subjects.push(
        {
          name: 'Natural Sciences',
          phase: 'Intermediate',
          grade: intermediateGrade._id,
          category: createdCategories.find(c => c.name === 'Science')._id,
          kind: 'subject',
          term: 1,
          description: 'Natural Sciences and Technology'
        },
        {
          name: 'Mathematics',
          phase: 'Intermediate',
          grade: intermediateGrade._id,
          category: createdCategories.find(c => c.name === 'Mathematics')._id,
          kind: 'subject',
          term: 1,
          description: 'Mathematics for Intermediate Phase'
        },
        {
          name: 'Creative Arts',
          phase: 'Intermediate',
          grade: intermediateGrade._id,
          category: createdCategories.find(c => c.name === 'Arts')._id,
          kind: 'subject',
          term: 2,
          description: 'Visual Arts and Music'
        }
      );
    }

    // Senior Phase Subjects
    if (seniorGrade) {
      subjects.push(
        {
          name: 'Natural Sciences',
          phase: 'Senior',
          grade: seniorGrade._id,
          category: createdCategories.find(c => c.name === 'Science')._id,
          kind: 'subject',
          term: 1,
          description: 'Life Sciences and Physical Sciences'
        },
        {
          name: 'Mathematics',
          phase: 'Senior',
          grade: seniorGrade._id,
          category: createdCategories.find(c => c.name === 'Mathematics')._id,
          kind: 'subject',
          term: 1,
          description: 'Mathematics for Senior Phase'
        },
        {
          name: 'Technology',
          phase: 'Senior',
          grade: seniorGrade._id,
          category: createdCategories.find(c => c.name === 'Technology')._id,
          kind: 'subject',
          term: 1,
          description: 'Technology Education'
        },
        {
          name: 'Creative Arts',
          phase: 'Senior',
          grade: seniorGrade._id,
          category: createdCategories.find(c => c.name === 'Arts')._id,
          kind: 'subject',
          term: 2,
          description: 'Dramatic Arts, Visual Arts, Music'
        }
      );
    }

    // FET Phase Subjects
    if (fetGrade) {
      subjects.push(
        {
          name: 'Physical Sciences',
          phase: 'FET',
          grade: fetGrade._id,
          category: createdCategories.find(c => c.name === 'Science')._id,
          kind: 'subject',
          term: 1,
          description: 'Physics and Chemistry'
        },
        {
          name: 'Life Sciences',
          phase: 'FET',
          grade: fetGrade._id,
          category: createdCategories.find(c => c.name === 'Science')._id,
          kind: 'subject',
          term: 1,
          description: 'Biology and Life Sciences'
        },
        {
          name: 'Mathematics',
          phase: 'FET',
          grade: fetGrade._id,
          category: createdCategories.find(c => c.name === 'Mathematics')._id,
          kind: 'subject',
          term: 1,
          description: 'Pure Mathematics'
        },
        {
          name: 'Computer Applications Technology',
          phase: 'FET',
          grade: fetGrade._id,
          category: createdCategories.find(c => c.name === 'Technology')._id,
          kind: 'subject',
          term: 1,
          description: 'Computer Applications and IT'
        },
        {
          name: 'Engineering Graphics and Design',
          phase: 'FET',
          grade: fetGrade._id,
          category: createdCategories.find(c => c.name === 'Engineering')._id,
          kind: 'subject',
          term: 1,
          description: 'Engineering Graphics and Design'
        },
        {
          name: 'Visual Arts',
          phase: 'FET',
          grade: fetGrade._id,
          category: createdCategories.find(c => c.name === 'Arts')._id,
          kind: 'subject',
          term: 2,
          description: 'Visual Arts FET'
        }
      );
    }

    const createdSubjects = await Category.insertMany(subjects);
    console.log(`Created ${createdSubjects.length} subjects`);

    // Create sample topics
    console.log('Creating sample topics...');
    const topics = [];
    
    // Add some sample topics for different subjects
    const mathSubject = createdSubjects.find(s => s.name === 'Mathematics' && s.phase === 'Senior');
    const scienceSubject = createdSubjects.find(s => s.name === 'Natural Sciences' && s.phase === 'Senior');
    
    if (mathSubject && seniorGrade) {
      topics.push(
        {
          name: 'Algebra',
          description: 'Basic algebraic expressions and equations',
          phase: 'Senior',
          grade: seniorGrade._id,
          subject: mathSubject._id,
          term: 1
        },
        {
          name: 'Geometry',
          description: 'Geometric shapes and properties',
          phase: 'Senior',
          grade: seniorGrade._id,
          subject: mathSubject._id,
          term: 2
        }
      );
    }
    
    if (scienceSubject && seniorGrade) {
      topics.push(
        {
          name: 'Cells and Tissues',
          description: 'Structure and function of cells',
          phase: 'Senior',
          grade: seniorGrade._id,
          subject: scienceSubject._id,
          term: 1
        },
        {
          name: 'Chemical Reactions',
          description: 'Types of chemical reactions',
          phase: 'Senior',
          grade: seniorGrade._id,
          subject: scienceSubject._id,
          term: 2
        }
      );
    }

    const createdTopics = await Topic.insertMany(topics);
    console.log(`Created ${createdTopics.length} topics`);

    // Create sample materials
    console.log('Creating sample materials...');
    const materials = [];
    
    if (mathSubject && seniorGrade && createdTopics.length > 0) {
      materials.push(
        {
          title: 'Introduction to Algebra',
          subject: mathSubject._id,
          category: createdCategories.find(c => c.name === 'Mathematics')._id,
          topic: createdTopics[0]._id,
          grade: seniorGrade._id,
          phase: 'Senior',
          term: 1,
          type: 'document',
          description: 'Basic introduction to algebraic concepts',
          url: 'https://example.com/algebra-intro.pdf'
        },
        {
          title: 'Algebra Video Tutorial',
          subject: mathSubject._id,
          category: createdCategories.find(c => c.name === 'Mathematics')._id,
          topic: createdTopics[0]._id,
          grade: seniorGrade._id,
          phase: 'Senior',
          term: 1,
          type: 'video',
          description: 'Video tutorial explaining basic algebra',
          url: 'https://example.com/algebra-video.mp4'
        }
      );
    }

    const createdMaterials = await Material.insertMany(materials);
    console.log(`Created ${createdMaterials.length} materials`);

    console.log('\n Database initialization complete!');
    console.log('\n Summary:');
    console.log(`- Grades: ${createdGrades.length}`);
    console.log(`- Main Categories: ${createdCategories.length}`);
    console.log(`- Subjects: ${createdSubjects.length}`);
    console.log(`- Topics: ${createdTopics.length}`);
    console.log(`- Materials: ${createdMaterials.length}`);

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
