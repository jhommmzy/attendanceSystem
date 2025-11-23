const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database first (this will create tables and default users)
const dbModule = require('./database/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);

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

