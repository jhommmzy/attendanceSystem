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

        // Create database if it doesn't exist
        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
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

    // Attendance sessions table (created by teachers)
    await connection.query(`
        CREATE TABLE IF NOT EXISTS attendance_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            teacher_id INT NOT NULL,
            date DATE NOT NULL,
            time TIME NOT NULL,
            status ENUM('active', 'closed') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_teacher_id (teacher_id),
            INDEX idx_date (date),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Attendance table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            teacher_id INT NOT NULL,
            session_id INT,
            date DATE NOT NULL,
            time_in TIME,
            status ENUM('present', 'absent') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE SET NULL,
            INDEX idx_student_id (student_id),
            INDEX idx_teacher_id (teacher_id),
            INDEX idx_session_id (session_id),
            INDEX idx_date (date),
            UNIQUE KEY unique_attendance (student_id, session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Add time_in column if it doesn't exist (for existing databases)
    try {
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'attendance' 
            AND COLUMN_NAME = 'time_in'
        `, [dbConfig.database]);
        
        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE attendance 
                ADD COLUMN time_in TIME AFTER date
            `);
            console.log('Added time_in column to attendance table');
        }
    } catch (error) {
        console.log('Note: time_in column may already exist or error adding it:', error.message);
    }

    // Add session_id column if it doesn't exist
    try {
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'attendance' 
            AND COLUMN_NAME = 'session_id'
        `, [dbConfig.database]);
        
        if (columns.length === 0) {
            // First, drop the old unique constraint if it exists
            try {
                await connection.query(`ALTER TABLE attendance DROP INDEX unique_attendance`);
            } catch (e) {
                // Index might not exist, ignore
            }
            
            // Add session_id column
            await connection.query(`
                ALTER TABLE attendance 
                ADD COLUMN session_id INT AFTER teacher_id
            `);
            
            // Add foreign key
            try {
                await connection.query(`
                    ALTER TABLE attendance 
                    ADD FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE SET NULL
                `);
            } catch (e) {
                // Foreign key might already exist
            }
            
            // Add index
            try {
                await connection.query(`ALTER TABLE attendance ADD INDEX idx_session_id (session_id)`);
            } catch (e) {
                // Index might already exist
            }
            
            // Add new unique constraint for session-based attendance
            try {
                await connection.query(`
                    ALTER TABLE attendance 
                    ADD UNIQUE KEY unique_attendance_session (student_id, session_id)
                `);
            } catch (e) {
                // Constraint might already exist
            }
            
            console.log('Added session_id column to attendance table');
        }
    } catch (error) {
        console.log('Note: session_id column may already exist or error adding it:', error.message);
    }

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
