let attendance = [];

window.addEventListener('DOMContentLoaded', () => {
    checkAuth('student');
    loadAttendance();
    loadStats();
});

async function loadAttendance() {
    try {
        const response = await fetch('http://localhost:3000/api/attendance', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            attendance = await response.json();
            displayAttendance();
        } else {
            if (response.status === 401) {
                window.location.href = '../index.html';
            }
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function displayAttendance() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    
    if (attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No attendance records found</td></tr>';
        return;
    }
    
    // Sort by date descending
    attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    attendance.forEach(record => {
        const row = document.createElement('tr');
        const statusClass = record.status === 'present' ? 'btn-success' : 'btn-danger';
        const timeIn = record.timeIn ? record.timeIn.substring(0, 5) : 'N/A';
        row.innerHTML = `
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${timeIn}</td>
            <td><span class="btn ${statusClass}" style="padding: 5px 10px; border-radius: 3px;">${record.status.toUpperCase()}</span></td>
        `;
        tbody.appendChild(row);
    });
}

async function loadStats() {
    try {
        const response = await fetch('http://localhost:3000/api/attendance/stats', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAttendance').textContent = stats.total;
            document.getElementById('presentDays').textContent = stats.present;
            document.getElementById('absentDays').textContent = stats.absent;
            document.getElementById('attendancePercentage').textContent = stats.percentage + '%';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}


