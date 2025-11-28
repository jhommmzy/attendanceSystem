const express = require('express');
const router = express.Router();
const { authenticate, requireTeacher } = require('../middleware/auth');
const { dbAll, dbGet, dbRun } = require('../database/db');

// Create attendance session (Teacher only)
router.post('/', authenticate, requireTeacher, async (req, res) => {
    try {
        const { date, time } = req.body;

        if (!date || !time) {
            return res.status(400).json({ message: 'Date and time are required' });
        }

        // Check if session already exists for this date and teacher
        const existing = await dbGet(
            "SELECT id FROM attendance_sessions WHERE teacher_id = ? AND date = ? AND status = 'active'",
            [req.user.id, date]
        );

        if (existing) {
            return res.status(400).json({ message: 'An active session already exists for this date' });
        }

        // Create new session
        const result = await dbRun(
            "INSERT INTO attendance_sessions (teacher_id, date, time, status) VALUES (?, ?, ?, 'active')",
            [req.user.id, date, time]
        );

        const session = await dbGet(
            `SELECT s.id, s.teacher_id as teacherId, s.date, s.time, s.status, s.created_at as createdAt,
                    t.name as teacherName
             FROM attendance_sessions s
             LEFT JOIN users t ON s.teacher_id = t.id
             WHERE s.id = ?`,
            [result.lastID]
        );

        res.json({
            success: true,
            message: 'Attendance session created successfully',
            session: session
        });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// Get all active attendance sessions (for students)
// IMPORTANT: This must be before /:id route to avoid route conflicts
router.get('/active', authenticate, async (req, res) => {
    try {
        const sessions = await dbAll(
            `SELECT s.id, s.teacher_id as teacherId, s.date, s.time, s.status, s.created_at as createdAt,
                    t.name as teacherName
             FROM attendance_sessions s
             LEFT JOIN users t ON s.teacher_id = t.id
             WHERE s.status = 'active'
             ORDER BY s.date DESC, s.time DESC`
        );

        res.json(sessions);
    } catch (error) {
        console.error('Get active sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get sessions created by teacher (Teacher only)
// IMPORTANT: This must be before /:id route to avoid route conflicts
router.get('/my-sessions', authenticate, requireTeacher, async (req, res) => {
    try {
        const sessions = await dbAll(
            `SELECT s.id, s.teacher_id as teacherId, s.date, s.time, s.status, s.created_at as createdAt,
                    t.name as teacherName,
                    (SELECT COUNT(*) FROM attendance WHERE session_id = s.id) as attendanceCount
             FROM attendance_sessions s
             LEFT JOIN users t ON s.teacher_id = t.id
             WHERE s.teacher_id = ?
             ORDER BY s.date DESC, s.time DESC`,
            [req.user.id]
        );

        res.json(sessions);
    } catch (error) {
        console.error('Get my sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single session by ID (must be last to avoid conflicts)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const session = await dbGet(
            `SELECT s.id, s.teacher_id as teacherId, s.date, s.time, s.status, s.created_at as createdAt,
                    t.name as teacherName
             FROM attendance_sessions s
             LEFT JOIN users t ON s.teacher_id = t.id
             WHERE s.id = ?`,
            [req.params.id]
        );

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        res.json(session);
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Close/End attendance session (Teacher only)
router.put('/:id/close', authenticate, requireTeacher, async (req, res) => {
    try {
        const session = await dbGet(
            "SELECT * FROM attendance_sessions WHERE id = ? AND teacher_id = ?",
            [req.params.id, req.user.id]
        );

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        await dbRun(
            "UPDATE attendance_sessions SET status = 'closed' WHERE id = ?",
            [req.params.id]
        );

        res.json({
            success: true,
            message: 'Session closed successfully'
        });
    } catch (error) {
        console.error('Close session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

