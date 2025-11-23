let students = [];
let attendance = [];
let selectedStudents = {};

window.addEventListener('DOMContentLoaded', () => {
    checkAuth('teacher');
    loadStudents();
    loadAttendance();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
});

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

async function loadStudents() {
    try {
        const response = await fetch('http://localhost:3000/api/users/students', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            students = await response.json();
            displayStudents();
        } else {
            if (response.status === 401) {
                window.location.href = '../index.html';
            }
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function displayStudents() {
    const grid = document.getElementById('studentsGrid');
    grid.innerHTML = '';
    
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'attendance-card';
        card.dataset.studentId = student.id;
        card.innerHTML = `
            <h3>${student.name}</h3>
            <p>${student.email}</p>
            <div style="margin-top: 10px;">
                <button class="btn btn-success" onclick="markPresent(${student.id})" style="margin-right: 5px;">Present</button>
                <button class="btn btn-danger" onclick="markAbsent(${student.id})">Absent</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function markPresent(studentId) {
    selectedStudents[studentId] = 'present';
    updateCardStyle(studentId, 'present');
}

function markAbsent(studentId) {
    selectedStudents[studentId] = 'absent';
    updateCardStyle(studentId, 'absent');
}

function updateCardStyle(studentId, status) {
    const card = document.querySelector(`[data-student-id="${studentId}"]`);
    if (card) {
        card.classList.add('selected');
        if (status === 'present') {
            card.style.borderColor = '#28a745';
            card.style.background = '#d4edda';
        } else {
            card.style.borderColor = '#dc3545';
            card.style.background = '#f8d7da';
        }
    }
}

async function submitAttendance() {
    const date = document.getElementById('attendanceDate').value;
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    if (Object.keys(selectedStudents).length === 0) {
        alert('Please mark attendance for at least one student');
        return;
    }
    
    const messageEl = document.getElementById('submitMessage');
    
    try {
        const promises = Object.entries(selectedStudents).map(([studentId, status]) => 
            fetch('http://localhost:3000/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('token')
                },
                body: JSON.stringify({
                    studentId: parseInt(studentId),
                    date: date,
                    status: status
                })
            })
        );
        
        await Promise.all(promises);
        
        messageEl.textContent = 'Attendance marked successfully!';
        messageEl.style.display = 'block';
        selectedStudents = {};
        displayStudents();
        loadAttendance();
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    } catch (error) {
        messageEl.textContent = 'Error marking attendance';
        messageEl.className = 'error-message';
        messageEl.style.display = 'block';
    }
}

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
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function displayAttendance() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    
    if (attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No attendance records found</td></tr>';
        return;
    }
    
    // Sort by date descending
    attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    attendance.forEach(record => {
        const row = document.createElement('tr');
        const statusClass = record.status === 'present' ? 'btn-success' : 'btn-danger';
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.studentName || 'Unknown'}</td>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td><span class="btn ${statusClass}" style="padding: 5px 10px; border-radius: 3px;">${record.status.toUpperCase()}</span></td>
        `;
        tbody.appendChild(row);
    });
}

