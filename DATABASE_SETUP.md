# Database Setup Guide - MySQL (XAMPP)

## Prerequisites
- XAMPP installed and running
- MySQL service started in XAMPP Control Panel

## Step 1: Start XAMPP MySQL
1. Open XAMPP Control Panel
2. Start MySQL service
3. Verify MySQL is running (should show green status)

## Step 2: Import Database

### Option A: Using phpMyAdmin (Recommended)
1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click on "New" to create a new database
3. Database name: `attendancesystem`
4. Click "Import" tab
5. Choose file: `database/attendance_system.sql`
6. Click "Go" to import

### Option B: Using MySQL Command Line
```bash
# Navigate to project directory
cd /path/to/attendancesystem

# Import SQL file (default XAMPP MySQL has no password)
# Note: Database name is "attendancesystem"
mysql -u root -p < database/attendance_system.sql
# When prompted for password, press Enter (empty password)
```

### Option C: Copy SQL commands manually
1. Open `database/attendance_system.sql`
2. Copy all SQL commands
3. Open phpMyAdmin SQL tab
4. Paste and execute

## Step 3: Verify Database
1. Open phpMyAdmin
2. Select `attendancesystem` database
3. Check that `users` and `attendance` tables exist
4. Check that default users are inserted:
   - admin@gmail.com / admin123
   - student@gmail.com / student123
   - teacher@gmail.com / teacher123

## Step 4: Configure Database Connection
If your XAMPP MySQL has a different password, update:
- File: `backend/config/database.js`
- Change `password: ''` to your MySQL password

## Step 5: Start the Server
```bash
npm start
```

The server will automatically connect to MySQL database.

## Troubleshooting

### Connection Error
- Make sure MySQL is running in XAMPP
- Check database name matches: `attendancesystem`
- Verify username is `root` (default XAMPP)
- Check password in `backend/config/database.js`

### Table Already Exists
- Drop existing database: `DROP DATABASE attendancesystem;`
- Re-import the SQL file

### Foreign Key Errors
- Make sure InnoDB engine is used (default in SQL file)
- Check that users table exists before creating attendance table

