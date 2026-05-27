const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/steam_db';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    const Material = require('./src/models/Material');
    const Grade = require('./src/models/Grade');
    const Category = require('./src/models/Category');
    const Subject = require('./src/models/Subject');
    const Topic = require('./src/models/Topic');
    const Folder = require('./src/models/Folder');
    
    console.log('Starting migration to add targetAudience field...');
    
    // Update Materials without targetAudience
    const materialsResult = await Material.updateMany(
      { targetAudience: { $exists: false } },
      { $set: { targetAudience: 'student' } }
    );
    console.log(`Updated ${materialsResult.modifiedCount} Materials`);
    
    // Update Grades without targetAudience
    const gradesResult = await Grade.updateMany(
      { targetAudience: { $exists: false } },
      { $set: { targetAudience: 'student' } }
    );
    console.log(`Updated ${gradesResult.modifiedCount} Grades`);
    
    // Update Categories without targetAudience
    const categoriesResult = await Category.updateMany(
      { targetAudience: { $exists: false } },
      { $set: { targetAudience: 'student' } }
    );
    console.log(`Updated ${categoriesResult.modifiedCount} Categories`);
    
    // Update Subjects without targetAudience
    const subjectsResult = await Subject.updateMany(
      { targetAudience: { $exists: false } },
      { $set: { targetAudience: 'student' } }
    );
    console.log(`Updated ${subjectsResult.modifiedCount} Subjects`);
    
    // Update Topics without targetAudience
    const topicsResult = await Topic.updateMany(
      { targetAudience: { $exists: false } },
      { $set: { targetAudience: 'student' } }
    );
    console.log(`Updated ${topicsResult.modifiedCount} Topics`);
    
    // Update Folders without targetAudience
    const foldersResult = await Folder.updateMany(
      { targetAudience: { $exists: false } },
      { $set: { targetAudience: 'student' } }
    );
    console.log(`Updated ${foldersResult.modifiedCount} Folders`);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
});
