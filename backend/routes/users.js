const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { dbAll, dbGet, dbRun } = require('../database/db');

// Get all users (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const users = await dbAll("SELECT id, email, role, name FROM users WHERE role != 'admin'");
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all students (must be before /:id route)
router.get('/students', authenticate, async (req, res) => {
    try {
        const students = await dbAll("SELECT id, email, role, name FROM users WHERE role = 'student'");
        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single user by ID (Admin only) - must be after /students route
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const user = await dbGet(
            "SELECT id, email, role, name FROM users WHERE id = ?",
            [req.params.id]
        );
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add new user (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        let { email, password, role, name } = req.body;
        
        // Trim and validate
        email = email ? email.trim() : '';
        password = password ? password.trim() : '';
        name = name ? name.trim() : '';
        role = role ? role.trim() : '';
        
        // Validation
        if (!email || !password || !role || !name) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        if (password.length < 3) {
            return res.status(400).json({ message: 'Password must be at least 3 characters' });
        }
        
        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ message: 'Invalid email format' });
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
        console.error('Add user error:', error);
        if (error.message && error.message.includes('UNIQUE constraint')) {
            res.status(400).json({ message: 'Email already exists' });
        } else if (error.message && error.message.includes('Database not initialized')) {
            res.status(503).json({ message: 'Database not ready. Please try again.' });
        } else {
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
});

// Update user (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        let { email, password, role, name } = req.body;
        
        // Trim and validate
        email = email ? email.trim() : '';
        password = password ? password.trim() : '';
        name = name ? name.trim() : '';
        role = role ? role.trim() : '';
        
        // Validation
        if (!email || !role || !name) {
            return res.status(400).json({ message: 'Email, role, and name are required' });
        }
        
        if (password && password.length < 3) {
            return res.status(400).json({ message: 'Password must be at least 3 characters' });
        }
        
        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Update user
        if (password) {
            await dbRun(
                "UPDATE users SET email = ?, password = ?, role = ?, name = ? WHERE id = ?",
                [email, password, role, name, id]
            );
        } else {
            await dbRun(
                "UPDATE users SET email = ?, role = ?, name = ? WHERE id = ?",
                [email, role, name, id]
            );
        }

        const updatedUser = await dbGet(
            "SELECT id, email, role, name FROM users WHERE id = ?",
            [id]
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        if (error.message && error.message.includes('UNIQUE constraint')) {
            res.status(400).json({ message: 'Email already exists' });
        } else if (error.message && error.message.includes('Database not initialized')) {
            res.status(503).json({ message: 'Database not ready. Please try again.' });
        } else {
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await dbRun("DELETE FROM users WHERE id = ?", [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        if (error.message && error.message.includes('Database not initialized')) {
            res.status(503).json({ message: 'Database not ready. Please try again.' });
        } else {
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
});

module.exports = router;

