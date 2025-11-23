const express = require('express');
const router = express.Router();
const { dbGet } = require('../database/db');

// Login route
router.post('/login', async (req, res) => {
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

module.exports = router;

