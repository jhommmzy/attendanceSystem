# Student Attendance System

A web-based attendance management system with role-based access control for Admin, Student, and Teacher.

## Features

- **Admin Role**: Manage users (add/delete teachers and students), view all attendance records
- **Teacher Role**: Mark attendance for students, view attendance records
- **Student Role**: View personal attendance records and statistics

## Login Credentials

- **Admin**: admin@gmail.com / admin123
- **Student**: student@gmail.com / student123
- **Teacher**: teacher@gmail.com / teacher123

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
attendancesystem/
├── admin/
│   ├── admin.html
│   └── admin.js
├── student/
│   ├── student.html
│   └── student.js
├── teacher/
│   ├── teacher.html
│   └── teacher.js
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── database.js
│   ├── database/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── users.js
│       └── attendance.js
├── database/
│   └── attendance_system.sql
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── login.js
│       └── auth.js
├── index.html
├── package.json
└── README.md
```

## Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla)
- Node.js
- Express.js
- MySQL (XAMPP)

## Database Setup

The system uses MySQL database. Please follow the setup instructions in [DATABASE_SETUP.md](DATABASE_SETUP.md).

**Quick Setup:**
1. Start XAMPP MySQL service
2. Import `database/attendance_system.sql` via phpMyAdmin or command line
3. Database name: `attendancesystem`
4. Update database credentials in `backend/config/database.js` if needed
4. Start the server: `npm start`

## API Endpoints

- `POST /api/login` - User authentication
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users` - Add new user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/students` - Get all students
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance (Teacher only)
- `GET /api/attendance/stats` - Get attendance statistics

## Database

The system uses MySQL database (XAMPP). The database schema is in `database/attendance_system.sql`. Default users are automatically created on import.

