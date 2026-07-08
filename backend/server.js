// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/activities', require('./src/routes/activityRoutes'));
app.use('/api/food', require('./src/routes/foodRoutes'));
app.use('/api/mood', require('./src/routes/moodRoutes'));
app.use('/api/journals', require('./src/routes/journalRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
app.use('/api/env', require('./src/routes/envRoutes'));
app.use('/api/wellness-circles', require('./src/routes/wellnessCircleRoutes'));
app.use('/api/wellness', require('./src/routes/wellnessRoutes'));
app.use('/api/agent', require('./src/routes/agentRoutes'));

// Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fitfusion')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
    res.send('FitFusion API is running...');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
