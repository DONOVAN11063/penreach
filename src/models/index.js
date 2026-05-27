const mongoose = require('mongoose');
require('dotenv').config();

// connect to MongoDB (either local or Atlas)
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/steam_db';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err));
db.once('open', () => console.log('Connected to MongoDB'));

const Material = require('./Material');
const Grade = require('./Grade');
const Category = require('./Category');
const Topic = require('./Topic');
const Folder = require('./Folder');
const Subject = require('./Subject');
const Teacher = require('./Teacher');

module.exports = {
  mongoose,
  Material,
  Grade,
  Category,
  Topic,
  Folder,
  Subject,
  Teacher,
};