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
    const Grade = require('./src/models/Grade');
    
    // Drop the old unique index on value and phase
    console.log('Dropping old unique index on grades collection...');
    await Grade.collection.dropIndex({ value: 1, phase: 1 });
    console.log('Old index dropped successfully');
    
    console.log('Index migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    if (error.message.includes('index not found')) {
      console.log('Index does not exist, which is fine if this is a fresh installation');
    }
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
});
