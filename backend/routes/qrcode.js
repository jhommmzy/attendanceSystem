const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { authenticate } = require('../middleware/auth');
const { dbGet } = require('../database/db');

// Generate QR code for a student (Student can get their own QR code)
router.get('/student/:id', authenticate, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        
        // Check if user is requesting their own QR code or is admin/teacher
        if (req.user.role === 'student' && req.user.id !== studentId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Verify student exists
        const student = await dbGet(
            "SELECT id, name, email FROM users WHERE id = ? AND role = 'student'",
            [studentId]
        );
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Generate QR code with student ID
        const qrData = JSON.stringify({ studentId: student.id });
        
        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        res.json({
            studentId: student.id,
            studentName: student.name,
            qrCode: qrCodeDataUrl,
            qrData: qrData
        });
    } catch (error) {
        console.error('Generate QR code error:', error);
        res.status(500).json({ message: 'Error generating QR code' });
    }
});

// Get QR code for current logged-in student
router.get('/my-qr', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can access this endpoint' });
        }
        
        const student = await dbGet(
            "SELECT id, name, email FROM users WHERE id = ?",
            [req.user.id]
        );
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Generate QR code with student ID
        const qrData = JSON.stringify({ studentId: student.id });
        
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        res.json({
            studentId: student.id,
            studentName: student.name,
            qrCode: qrCodeDataUrl,
            qrData: qrData
        });
    } catch (error) {
        console.error('Generate QR code error:', error);
        res.status(500).json({ message: 'Error generating QR code' });
    }
});

module.exports = router;

