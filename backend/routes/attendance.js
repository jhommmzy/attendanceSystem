const express = require('express');
const router = express.Router();
const { authenticate, requireTeacher } = require('../middleware/auth');
const { dbAll, dbGet, dbRun } = require('../database/db');

// Get attendance records
router.get('/', authenticate, async (req, res) => {
    try {
        let query = `
            SELECT a.id, a.student_id as studentId, a.teacher_id as teacherId, 
                   a.date, a.time_in as timeIn, a.status, a.created_at as createdAt,
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
        const { studentId, date, status, timeIn } = req.body;

        if (!studentId || !date || !status) {
            return res.status(400).json({ message: 'Student ID, date, and status are required' });
        }

        if (!['present', 'absent'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Get current time if timeIn is not provided
        let timeInValue = timeIn;
        if (!timeInValue) {
            const now = new Date();
            timeInValue = now.toTimeString().split(' ')[0]; // Format as HH:MM:SS
        }

        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle duplicates
        const result = await dbRun(
            `INSERT INTO attendance (student_id, teacher_id, date, time_in, status) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             status = VALUES(status), 
             time_in = VALUES(time_in),
             teacher_id = VALUES(teacher_id)`,
            [studentId, req.user.id, date, timeInValue, status]
        );

        // Get the record (either newly inserted or updated)
        const record = await dbGet(
            `SELECT a.id, a.student_id as studentId, a.teacher_id as teacherId, 
                    a.date, a.time_in as timeIn, a.status, a.created_at as createdAt,
                    s.name as studentName
             FROM attendance a
             LEFT JOIN users s ON a.student_id = s.id
             WHERE a.student_id = ? AND a.date = ?`,
            [studentId, date]
        );

        res.json(record);
    } catch (error) {
        console.error('Add attendance error:', error);
        if (error.message && error.message.includes('Database not initialized')) {
            res.status(503).json({ message: 'Database not ready. Please try again.' });
        } else {
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
});

// Mark attendance via QR code scan (Teacher only)
router.post('/scan', authenticate, requireTeacher, async (req, res) => {
    try {
        let { studentId, qrData, date, timeIn } = req.body;

        // If qrData is provided, parse it to get studentId
        if (qrData && !studentId) {
            try {
                const parsed = JSON.parse(qrData);
                studentId = parsed.studentId;
            } catch (e) {
                return res.status(400).json({ message: 'Invalid QR code data' });
            }
        }

        if (!studentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        // Verify student exists
        const student = await dbGet(
            "SELECT id, name FROM users WHERE id = ? AND role = 'student'",
            [studentId]
        );

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Use provided date and time, or get current date and time
        let attendanceDate = date;
        let attendanceTime = timeIn;
        
        if (!attendanceDate) {
            const now = new Date();
            attendanceDate = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        }
        
        if (!attendanceTime) {
            const now = new Date();
            attendanceTime = now.toTimeString().split(' ')[0]; // Format as HH:MM:SS
        } else {
            // Ensure time is in HH:MM:SS format
            if (attendanceTime.length === 5) {
                attendanceTime = attendanceTime + ':00';
            }
        }

        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle duplicates
        const result = await dbRun(
            `INSERT INTO attendance (student_id, teacher_id, date, time_in, status) 
             VALUES (?, ?, ?, ?, 'present')
             ON DUPLICATE KEY UPDATE 
             status = 'present', 
             time_in = VALUES(time_in),
             teacher_id = VALUES(teacher_id)`,
            [studentId, req.user.id, attendanceDate, attendanceTime]
        );

        // Get the record
        const record = await dbGet(
            `SELECT a.id, a.student_id as studentId, a.teacher_id as teacherId, 
                    a.date, a.time_in as timeIn, a.status, a.created_at as createdAt,
                    s.name as studentName
             FROM attendance a
             LEFT JOIN users s ON a.student_id = s.id
             WHERE a.student_id = ? AND a.date = ?`,
            [studentId, attendanceDate]
        );

        res.json({
            success: true,
            message: `Attendance marked for ${student.name}`,
            record: record
        });
    } catch (error) {
        console.error('QR scan attendance error:', error);
        if (error.message && error.message.includes('Database not initialized')) {
            res.status(503).json({ message: 'Database not ready. Please try again.' });
        } else {
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
});

// Mark attendance via student QR code scan (Student only)
// IMPORTANT: This route must be defined before the /scan route to avoid conflicts
router.post('/scan-student', authenticate, async (req, res) => {
    try {
        console.log('Scan-student endpoint called');
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can use this endpoint' });
        }

        let { studentId, qrData, date, timeIn, sessionId } = req.body;

        // If qrData is provided, try to parse it to get studentId (for verification)
        if (qrData && !studentId) {
            try {
                const parsed = JSON.parse(qrData);
                if (parsed && parsed.studentId) {
                    const scannedId = parseInt(parsed.studentId);
                    // Verify the scanned ID matches the logged-in student
                    if (scannedId !== req.user.id) {
                        return res.status(403).json({ message: 'QR code does not match logged-in student' });
                    }
                }
            } catch (e) {
                // If not JSON, try to extract number
                const numberMatch = qrData.match(/\d+/);
                if (numberMatch) {
                    const scannedId = parseInt(numberMatch[0]);
                    if (scannedId !== req.user.id) {
                        return res.status(403).json({ message: 'QR code does not match logged-in student' });
                    }
                }
            }
        }

        // Use the logged-in student's ID (always use authenticated user's ID)
        studentId = req.user.id;

        // Verify student exists
        const student = await dbGet(
            "SELECT id, name FROM users WHERE id = ? AND role = 'student'",
            [studentId]
        );

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get session information if sessionId is provided
        let session = null;
        let teacherId = null;
        let attendanceDate = date;
        let attendanceTime = timeIn;

        if (sessionId) {
            session = await dbGet(
                "SELECT * FROM attendance_sessions WHERE id = ? AND status = 'active'",
                [sessionId]
            );

            if (!session) {
                return res.status(404).json({ message: 'Attendance session not found or closed' });
            }

            teacherId = session.teacher_id;
            attendanceDate = session.date;
            attendanceTime = session.time;
        } else {
            // Use provided date and time, or get current date and time
            if (!attendanceDate) {
                const now = new Date();
                attendanceDate = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }
            
            if (!attendanceTime) {
                const now = new Date();
                attendanceTime = now.toTimeString().split(' ')[0]; // Format as HH:MM:SS
            } else {
                // Ensure time is in HH:MM:SS format
                if (attendanceTime.length === 5) {
                    attendanceTime = attendanceTime + ':00';
                }
            }

            // Get a teacher ID (use first available teacher)
            const teacher = await dbGet(
                "SELECT id FROM users WHERE role = 'teacher' LIMIT 1"
            );

            if (!teacher) {
                return res.status(500).json({ message: 'No teacher found in system' });
            }

            teacherId = teacher.id;
        }

        // Check if student already marked attendance for this session
        if (sessionId) {
            const existing = await dbGet(
                "SELECT id FROM attendance WHERE student_id = ? AND session_id = ?",
                [studentId, sessionId]
            );

            if (existing) {
                return res.status(400).json({ message: 'You have already marked attendance for this session' });
            }
        }

        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle duplicates
        const result = await dbRun(
            `INSERT INTO attendance (student_id, teacher_id, session_id, date, time_in, status) 
             VALUES (?, ?, ?, ?, ?, 'present')
             ON DUPLICATE KEY UPDATE 
             status = 'present', 
             time_in = VALUES(time_in),
             teacher_id = VALUES(teacher_id)`,
            [studentId, teacherId, sessionId || null, attendanceDate, attendanceTime]
        );

        // Get the record
        const record = await dbGet(
            `SELECT a.id, a.student_id as studentId, a.teacher_id as teacherId, 
                    a.date, a.time_in as timeIn, a.status, a.created_at as createdAt,
                    s.name as studentName
             FROM attendance a
             LEFT JOIN users s ON a.student_id = s.id
             WHERE a.student_id = ? AND a.date = ?`,
            [studentId, attendanceDate]
        );

        if (!record) {
            return res.status(500).json({ message: 'Failed to retrieve attendance record' });
        }

        res.json({
            success: true,
            message: `Attendance marked successfully`,
            record: record
        });
    } catch (error) {
        console.error('Student QR scan attendance error:', error);
        if (error.message && error.message.includes('Database not initialized')) {
            res.status(503).json({ message: 'Database not ready. Please try again.' });
        } else {
            res.status(500).json({ 
                success: false,
                message: error.message || 'Server error',
                error: error.toString()
            });
        }
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

