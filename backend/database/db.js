const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

// Create connection pool
let pool;

// Initialize database connection
async function initDatabase() {
    try {
        // First, connect without database to create it if needed
        const tempConnection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Create database if it doesn't exist (use backticks for database name with spaces)
        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        await tempConnection.end();

        // Create connection pool
        pool = mysql.createPool(dbConfig);

        // Test connection
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database');

        // Create tables
        await createTables(connection);
        
        // Insert default users if they don't exist
        await insertDefaultUsers(connection);

        connection.release();
        return pool;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Create tables
async function createTables(connection) {
    // Users table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'student', 'teacher') NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Attendance table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            teacher_id INT NOT NULL,
            date DATE NOT NULL,
            status ENUM('present', 'absent') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_student_id (student_id),
            INDEX idx_teacher_id (teacher_id),
            INDEX idx_date (date),
            UNIQUE KEY unique_attendance (student_id, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Tables created successfully');
}

// Insert default users
async function insertDefaultUsers(connection) {
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (rows[0].count === 0) {
        const defaultUsers = [
            ['admin@gmail.com', 'admin123', 'admin', 'Admin User'],
            ['student@gmail.com', 'student123', 'student', 'Student User'],
            ['teacher@gmail.com', 'teacher123', 'teacher', 'Teacher User']
        ];

        for (const user of defaultUsers) {
            await connection.query(
                'INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)',
                user
            );
        }

        console.log('Default users created');
    }
}

// Initialize database
let initPromise = initDatabase().catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
});

// Helper function to ensure database is ready
async function ensureDbReady() {
    if (!pool) {
        await initPromise;
    }
    if (!pool) {
        throw new Error('Database not initialized');
    }
}

// Helper functions for database operations
async function dbRun(query, params = []) {
    await ensureDbReady();
    try {
        const [result] = await pool.execute(query, params);
        return {
            lastID: result.insertId,
            changes: result.affectedRows
        };
    } catch (error) {
        throw error;
    }
}

async function dbGet(query, params = []) {
    await ensureDbReady();
    try {
        const [rows] = await pool.execute(query, params);
        return rows[0] || null;
    } catch (error) {
        throw error;
    }
}

async function dbAll(query, params = []) {
    await ensureDbReady();
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        throw error;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    if (pool) {
        await pool.end();
        console.log('Database connection closed');
    }
    process.exit(0);
});

module.exports = {
    pool,
    dbRun,
    dbGet,
    dbAll,
    initPromise
};
