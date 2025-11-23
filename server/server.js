const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Database setup
const DB_PATH = path.join(__dirname, 'data', 'attendance.db');

// Initialize database
function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Create tables
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'teacher')),
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                    reject(err);
                    return;
                }
            });

            // Attendance table
            db.run(`CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                teacher_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id),
                FOREIGN KEY (teacher_id) REFERENCES users(id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating attendance table:', err);
                    reject(err);
                    return;
                }
            });

            // Insert default users if they don't exist
            db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                if (err) {
                    console.error('Error checking users:', err);
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    const defaultUsers = [
                        ['admin@gmail.com', 'admin123', 'admin', 'Admin User'],
                        ['student@gmail.com', 'student123', 'student', 'Student User'],
                        ['teacher@gmail.com', 'teacher123', 'teacher', 'Teacher User']
                    ];

                    const stmt = db.prepare("INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)");
                    defaultUsers.forEach(user => {
                        stmt.run(user);
                    });
                    stmt.finalize((err) => {
                        if (err) {
                            console.error('Error inserting default users:', err);
                            reject(err);
                            return;
                        }
                        console.log('Default users created');
                        resolve(db);
                    });
                } else {
                    resolve(db);
                }
            });
        });
    });
}

// Get database instance
let db;
initDatabase().then(database => {
    db = database;
}).catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
});

// Helper function to run database queries
function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Middleware for authentication
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        req.user = JSON.parse(Buffer.from(token, 'base64').toString());
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// Routes
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await dbGet(
            "SELECT id, email, password, role, name FROM users WHERE email = ? AND password = ?",
            [email, password]
        );

        if (user) {
            const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role })).toString('base64');
            res.json({
                token,
                user: { id: user.id, email: user.email, role: user.role, name: user.name }
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/users', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const users = await dbAll("SELECT id, email, role, name FROM users WHERE role != 'admin'");
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/users', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { email, password, role, name } = req.body;
        
        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const result = await dbRun(
            "INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)",
            [email, password, role, name]
        );

        const newUser = await dbGet(
            "SELECT id, email, role, name FROM users WHERE id = ?",
            [result.lastID]
        );

        res.json(newUser);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
            res.status(400).json({ message: 'Email already exists' });
        } else {
            console.error('Add user error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await dbRun("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/students', authenticate, async (req, res) => {
    try {
        const students = await dbAll("SELECT id, email, role, name FROM users WHERE role = 'student'");
        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/attendance', authenticate, async (req, res) => {
    try {
        let query = `
            SELECT a.id, a.student_id as studentId, a.teacher_id as teacherId, 
                   a.date, a.status, a.created_at as createdAt,
                   s.name as studentName, t.name as teacherName
            FROM attendance a
            LEFT JOIN users s ON a.student_id = s.id
            LEFT JOIN users t ON a.teacher_id = t.id
        `;
        let params = [];

        if (req.user.role === 'student') {
            query += " WHERE a.student_id = ?";
            params.push(req.user.id);
        }

        query += " ORDER BY a.date DESC, a.created_at DESC";

        const attendance = await dbAll(query, params);
        res.json(attendance);
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/attendance', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { studentId, date, status } = req.body;

        if (!['present', 'absent'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const result = await dbRun(
            "INSERT INTO attendance (student_id, teacher_id, date, status) VALUES (?, ?, ?, ?)",
            [studentId, req.user.id, date, status]
        );

        const newRecord = await dbGet(
            `SELECT a.id, a.student_id as studentId, a.teacher_id as teacherId, 
                    a.date, a.status, a.created_at as createdAt,
                    s.name as studentName
             FROM attendance a
             LEFT JOIN users s ON a.student_id = s.id
             WHERE a.id = ?`,
            [result.lastID]
        );

        res.json(newRecord);
    } catch (error) {
        console.error('Add attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/attendance/stats', authenticate, async (req, res) => {
    try {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;

        if (!studentId) {
            return res.json({ total: 0, present: 0, absent: 0, percentage: 0 });
        }

        const attendance = await dbAll(
            "SELECT status FROM attendance WHERE student_id = ?",
            [studentId]
        );

        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const percentage = total > 0 ? (present / total * 100).toFixed(2) : 0;

        res.json({ total, present, absent, percentage });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
