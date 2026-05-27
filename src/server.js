const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { Material, Topic, Grade, Category, Folder, Subject } = require('./models');

const materialRoutes = require('./routes/materials');
const contentSettingsRoutes = require('./routes/contentSettings');
const authRoutes = require('./routes/auth');
const gradeRoutes = require('./routes/grades');
const categoryRoutes = require('./routes/categories');
const subjectRoutes = require('./routes/subjects');
const topicRoutes = require('./routes/topics');

const folderRoutes = require('./routes/folders');
const documentRoutes = require('./routes/documents');
const videoRoutes = require('./routes/videos');
const quizRoutes = require('./routes/quizzes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// mount routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/content', contentSettingsRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/topics', topicRoutes);

app.use('/api/folders', folderRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/quizzes', quizRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});