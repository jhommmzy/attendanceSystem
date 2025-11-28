let students = [];
let attendance = [];
let selectedStudents = {};
let attendanceSession = {
    date: null,
    time: null,
    year: null,
    month: null,
    day: null,
    active: false
};
let currentTeacher = null;
let filteredAttendance = [];
let isFiltered = false;

window.addEventListener('DOMContentLoaded', () => {
    checkAuth('teacher');
    loadStudents();
    loadAttendance();
    initializeDateSelectors();
    initializeFilterSelectors();
    loadTeacherInfo();
});

function initializeDateSelectors() {
    // Initialize year selector (current year ± 2 years)
    const yearSelect = document.getElementById('attendanceYear');
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    // Initialize month selector
    const monthSelect = document.getElementById('attendanceMonth');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        if (index === new Date().getMonth()) option.selected = true;
        monthSelect.appendChild(option);
    });

    // Initialize day selector
    updateDaySelector();
    document.getElementById('attendanceMonth').addEventListener('change', updateDaySelector);
    document.getElementById('attendanceYear').addEventListener('change', updateDaySelector);

    // Set current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('attendanceTime').value = `${hours}:${minutes}`;
}

function updateDaySelector() {
    const year = parseInt(document.getElementById('attendanceYear').value);
    const month = parseInt(document.getElementById('attendanceMonth').value);
    const daySelect = document.getElementById('attendanceDay');
    
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = new Date().getDate();
    
    daySelect.innerHTML = '';
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentDay && month === new Date().getMonth() + 1 && year === new Date().getFullYear()) {
            option.selected = true;
        }
        daySelect.appendChild(option);
    }
}

async function loadTeacherInfo() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            // Decode base64 token (not JWT, just base64 encoded JSON)
            const payload = JSON.parse(atob(token));
            currentTeacher = {
                id: payload.id,
                name: payload.name || 'Teacher'
            };
        }
    } catch (error) {
        console.error('Error loading teacher info:', error);
        // Fallback: try to get from user info stored in localStorage
        try {
            const userInfo = localStorage.getItem('user');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                currentTeacher = {
                    id: user.id,
                    name: user.name || 'Teacher'
                };
            }
        } catch (e) {
            currentTeacher = { id: null, name: 'Teacher' };
        }
    }
}

function showTab(tabName, event) {
    // Remove active class from all tabs and tab contents
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to the clicked tab button
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find the button by its onclick attribute
        const buttons = document.querySelectorAll('.tab');
        buttons.forEach(btn => {
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabName}'`)) {
                btn.classList.add('active');
            }
        });
    }
    
    // Show the corresponding tab content
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
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
    
    if (!currentTeacher) {
        loadTeacherInfo();
    }
    
    // Get attendance for the session date if available
    const sessionDate = attendanceSession.date;
    const sessionAttendance = sessionDate ? attendance.filter(a => a.date === sessionDate) : [];
    
    students.forEach(student => {
        // Check if student has attendance for this session
        const studentAttendance = sessionAttendance.find(a => a.studentId === student.id);
        const isPresent = studentAttendance && studentAttendance.status === 'present';
        
        const card = document.createElement('div');
        card.className = 'attendance-card';
        card.dataset.studentId = student.id;
        card.innerHTML = `
            <h3>${student.name}</h3>
            <p>${student.email}</p>
            <p style="color: #666; font-size: 14px; margin-top: 5px;"><strong>Teacher:</strong> ${currentTeacher ? currentTeacher.name : 'Loading...'}</p>
            <div id="status-${student.id}" style="margin-top: 10px; padding: 8px; border-radius: 5px; background: ${isPresent ? '#d4edda' : '#f8f9fa'}; border: 1px solid ${isPresent ? '#28a745' : '#ddd'};">
                ${isPresent ? `
                    <span style="color: green; font-weight: bold;">✓ Present</span><br>
                    <span style="color: #666; font-size: 12px;">Time: ${studentAttendance.timeIn ? studentAttendance.timeIn.substring(0, 5) : 'N/A'}</span>
                ` : '<span style="color: #666;">Waiting for QR scan...</span>'}
            </div>
        `;
        grid.appendChild(card);
    });
    
    // Auto-refresh every 5 seconds if session is active
    if (attendanceSession.active && !window.attendanceRefreshInterval) {
        window.attendanceRefreshInterval = setInterval(() => {
            if (attendanceSession.active) {
                loadAttendance();
            } else {
                clearInterval(window.attendanceRefreshInterval);
                window.attendanceRefreshInterval = null;
            }
        }, 5000);
    }
}

function startAttendance() {
    const year = parseInt(document.getElementById('attendanceYear').value);
    const month = parseInt(document.getElementById('attendanceMonth').value);
    const day = parseInt(document.getElementById('attendanceDay').value);
    const time = document.getElementById('attendanceTime').value;

    if (!year || !month || !day || !time) {
        alert('Please fill in all fields (Year, Month, Day, and Time)');
        return;
    }

    // Format date as YYYY-MM-DD
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Store attendance session data
    attendanceSession = {
        date: dateStr,
        time: time,
        year: year,
        month: month,
        day: day,
        active: true
    };

    // Show attendance session section
    document.getElementById('startAttendanceSection').style.display = 'none';
    document.getElementById('attendanceSessionSection').style.display = 'block';
    
    // Display selected date and time
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('selectedDateDisplay').textContent = 
        `${monthNames[month - 1]} ${day}, ${year}`;
    document.getElementById('selectedTimeDisplay').textContent = time;
    document.getElementById('teacherNameDisplay').textContent = currentTeacher ? currentTeacher.name : 'Teacher';

    // Display students
    displayStudents();
}

function initializeFilterSelectors() {
    // Initialize year filter selector
    const yearSelect = document.getElementById('filterYear');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '<option value="">All Years</option>';
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    // Initialize month filter selector
    const monthSelect = document.getElementById('filterMonth');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Initialize day filter selector
    updateFilterDaySelector();
    document.getElementById('filterMonth').addEventListener('change', updateFilterDaySelector);
    document.getElementById('filterYear').addEventListener('change', updateFilterDaySelector);
}

function updateFilterDaySelector() {
    const year = document.getElementById('filterYear').value;
    const month = document.getElementById('filterMonth').value;
    const daySelect = document.getElementById('filterDay');
    
    daySelect.innerHTML = '<option value="">All Days</option>';
    
    if (year && month) {
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            daySelect.appendChild(option);
        }
    }
}

function filterRecords() {
    const year = document.getElementById('filterYear').value;
    const month = document.getElementById('filterMonth').value;
    const day = document.getElementById('filterDay').value;

    if (!year) {
        // Show all records
        isFiltered = false;
        filteredAttendance = [];
        displayAttendance();
        return;
    }

    // Filter attendance records
    filteredAttendance = attendance.filter(record => {
        const recordDate = new Date(record.date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth() + 1;
        const recordDay = recordDate.getDate();

        let match = true;
        if (year && recordYear !== parseInt(year)) match = false;
        if (month && recordMonth !== parseInt(month)) match = false;
        if (day && recordDay !== parseInt(day)) match = false;

        return match;
    });

    isFiltered = true;
    displayAttendance();
}

function clearFilter() {
    document.getElementById('filterYear').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterDay').value = '';
    isFiltered = false;
    filteredAttendance = [];
    displayAttendance();
}

function updateStudentStatus(studentId, status, record) {
    const statusDiv = document.getElementById(`status-${studentId}`);
    if (statusDiv) {
        if (status === 'present') {
            statusDiv.innerHTML = `
                <span style="color: green; font-weight: bold;">✓ Present</span><br>
                <span style="color: #666; font-size: 12px;">Time: ${record.timeIn ? record.timeIn.substring(0, 5) : 'N/A'}</span>
            `;
            statusDiv.style.background = '#d4edda';
            statusDiv.style.border = '1px solid #28a745';
        }
    }
    
    // Update card style
    const card = document.querySelector(`[data-student-id="${studentId}"]`);
    if (card) {
        card.style.borderColor = '#28a745';
        card.style.background = '#d4edda';
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
            // Refresh student display if session is active
            if (attendanceSession.active) {
                displayStudents();
            }
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function displayAttendance() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    
    const recordsToDisplay = isFiltered ? filteredAttendance : attendance;
    
    if (recordsToDisplay.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No attendance records found</td></tr>';
        return;
    }
    
    // Sort by date descending
    const sortedRecords = [...recordsToDisplay].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedRecords.forEach(record => {
        const row = document.createElement('tr');
        const statusClass = record.status === 'present' ? 'btn-success' : 'btn-danger';
        const timeIn = record.timeIn ? record.timeIn.substring(0, 5) : 'N/A';
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.studentName || 'Unknown'}</td>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${timeIn}</td>
            <td><span class="btn ${statusClass}" style="padding: 5px 10px; border-radius: 3px;">${record.status.toUpperCase()}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Export attendance records to PDF
function exportToPDF() {
    try {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please refresh the page and try again.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get the records to export (filtered or all)
        const recordsToExport = isFiltered ? filteredAttendance : attendance;
        
        if (recordsToExport.length === 0) {
            alert('No attendance records to export.');
            return;
        }
        
        // Sort records by date descending (same as display)
        const sortedRecords = [...recordsToExport].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Prepare data for PDF table
        const tableData = sortedRecords.map(record => {
            const timeIn = record.timeIn ? record.timeIn.substring(0, 5) : 'N/A';
            const dateStr = new Date(record.date).toLocaleDateString();
            return [
                record.id,
                record.studentName || 'Unknown',
                dateStr,
                timeIn,
                record.status.toUpperCase()
            ];
        });
        
        // Get teacher name for header
        const teacherName = currentTeacher ? currentTeacher.name : 'Teacher';
        const currentDate = new Date().toLocaleDateString();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Attendance Records', 14, 20);
        
        // Add teacher info and date
        doc.setFontSize(11);
        doc.text(`Teacher: ${teacherName}`, 14, 30);
        doc.text(`Export Date: ${currentDate}`, 14, 37);
        
        // Add filter info if filtered
        if (isFiltered) {
            const filterYear = document.getElementById('filterYear').value;
            const filterMonth = document.getElementById('filterMonth').value;
            const filterDay = document.getElementById('filterDay').value;
            let filterText = 'Filter: ';
            if (filterYear) filterText += `Year: ${filterYear} `;
            if (filterMonth) {
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
                filterText += `Month: ${months[parseInt(filterMonth) - 1]} `;
            }
            if (filterDay) filterText += `Day: ${filterDay}`;
            doc.text(filterText, 14, 44);
        }
        
        // Add table
        doc.autoTable({
            startY: isFiltered ? 50 : 45,
            head: [['ID', 'Student Name', 'Date', 'Time In', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [51, 51, 51],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 20 }, // ID
                1: { cellWidth: 60 }, // Student Name
                2: { cellWidth: 40 }, // Date
                3: { cellWidth: 30 }, // Time In
                4: { cellWidth: 30 }  // Status
            },
            margin: { top: isFiltered ? 50 : 45, left: 14, right: 14 }
        });
        
        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Attendance_Records_${timestamp}.pdf`;
        
        // Save PDF
        doc.save(filename);
        
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        alert('Error exporting to PDF: ' + error.message);
    }
}

