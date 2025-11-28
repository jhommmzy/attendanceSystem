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

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }
    next();
}

// Middleware to check if user is teacher
function requireTeacher(req, res, next) {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Forbidden - Teacher access required' });
    }
    next();
}

module.exports = {
    authenticate,
    requireAdmin,
    requireTeacher
};

