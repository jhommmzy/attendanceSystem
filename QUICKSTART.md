# Quick Start Guide

## How to Run the System

### 1. Install Dependencies (if not already installed)
```bash
npm install
```

### 2. Start the Backend Server
```bash
npm start
```

Or directly:
```bash
node backend/server.js
```

### 3. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

## Login Credentials

- **Admin**: `admin@gmail.com` / `admin123`
- **Student**: `student@gmail.com` / `student123`
- **Teacher**: `teacher@gmail.com` / `teacher123`

## System Status Check

The server will display:
- `Server running on http://localhost:3000`
- `Connected to MySQL database`
- `Tables created successfully`
- `Default users created` (on first run)

## Project Structure

```
backend/
├── server.js          # Main server file
├── config/
│   └── database.js    # MySQL database configuration
├── database/
│   └── db.js          # MySQL database connection
├── middleware/
│   └── auth.js        # Authentication middleware
└── routes/
    ├── auth.js        # Login routes
    ├── users.js       # User management routes
    └── attendance.js  # Attendance routes
```

## API Endpoints

- `POST /api/login` - User authentication
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users` - Add new user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/students` - Get all students
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance (Teacher only)
- `GET /api/attendance/stats` - Get attendance statistics

## Database

MySQL database setup:
1. Start XAMPP MySQL service
2. Import `database/attendance_system.sql` via phpMyAdmin
3. Database name: `attendancesystem`
4. The SQL file includes:
   - Database creation
   - Users table
   - Attendance table
   - Default users (admin, student, teacher)

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions.

## Troubleshooting

If the server doesn't start:
1. Check if port 3000 is already in use
2. Ensure all dependencies are installed: `npm install`
3. Check the console for error messages

To stop the server:
- Press `Ctrl+C` in the terminal
- Or find the process: `ps aux | grep "node backend/server.js"` and kill it

