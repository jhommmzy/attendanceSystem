const express = require('express');
const router = express.Router();
const { authenticate, requireTeacher } = require('../middleware/auth');
const { dbAll, dbGet, dbRun } = require('../database/db');

// Get attendance records
router.get('/', authenticate, async (req, res) => {
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

// Mark attendance (Teacher only)
router.post('/', authenticate, requireTeacher, async (req, res) => {
    try {
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

// Get attendance statistics
router.get('/stats', authenticate, async (req, res) => {
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

module.exports = router;

