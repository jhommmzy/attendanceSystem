// Database configuration for XAMPP MySQL
// Update these values according to your XAMPP MySQL settings

module.exports = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Default XAMPP MySQL password (empty)
    database: process.env.DB_NAME || 'attendance system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

