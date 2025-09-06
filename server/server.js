const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const documentsRouter = require('./routes/documents');
const kollesRouter = require('./routes/kolles');
const chaptersRouter = require('./routes/chapters');
const classesRouter = require('./routes/classes');
const progressionRouter = require('./routes/progression');
const settingsRouter = require('./routes/settings');
const { router: authRouter } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/documents', documentsRouter);
app.use('/api/kolles', kollesRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/classes', classesRouter);
app.use('/api/progression', progressionRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TSI 1 API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 TSI 1 API running on http://localhost:${PORT}`);
  console.log(`📁 Uploads served at http://localhost:${PORT}/uploads`);
});