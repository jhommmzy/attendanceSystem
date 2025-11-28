const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database first (this will create tables and default users)
const dbModule = require('./database/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const qrCodeRoutes = require('./routes/qrcode');
const sessionRoutes = require('./routes/sessions');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes - must be before static files
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/qrcode', qrCodeRoutes);
app.use('/api/sessions', sessionRoutes);

// 404 handler for API routes - must be after API routes but before static files
app.use('/api/*', (req, res) => {
    console.log('404 - API endpoint not found:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'API endpoint not found: ' + req.originalUrl
    });
});

// Static files - serve after API routes
app.use(express.static(path.join(__dirname, '..')));

// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Wait for database to be ready before starting server
dbModule.initPromise.then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Connected to MySQL database: attendancesystem`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

