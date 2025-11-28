window.addEventListener('DOMContentLoaded', () => {
    checkAuth('teacher');
    initializeDateSelectors();
    loadSessions();
});

function initializeDateSelectors() {
    // Initialize year selector
    const yearSelect = document.getElementById('sessionYear');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    // Initialize month selector
    const monthSelect = document.getElementById('sessionMonth');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    monthSelect.innerHTML = '';
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        if (index === new Date().getMonth()) option.selected = true;
        monthSelect.appendChild(option);
    });

    // Initialize day selector
    updateDaySelector();
    document.getElementById('sessionMonth').addEventListener('change', updateDaySelector);
    document.getElementById('sessionYear').addEventListener('change', updateDaySelector);

    // Set current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('sessionTime').value = `${hours}:${minutes}`;
}

function updateDaySelector() {
    const year = parseInt(document.getElementById('sessionYear').value);
    const month = parseInt(document.getElementById('sessionMonth').value);
    const daySelect = document.getElementById('sessionDay');
    
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

async function createSession(event) {
    event.preventDefault();
    
    const year = parseInt(document.getElementById('sessionYear').value);
    const month = parseInt(document.getElementById('sessionMonth').value);
    const day = parseInt(document.getElementById('sessionDay').value);
    const time = document.getElementById('sessionTime').value;

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    try {
        const response = await fetch('http://localhost:3000/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify({ date, time })
        });

        const result = await response.json();
        const messageEl = document.getElementById('message');

        if (response.ok) {
            messageEl.textContent = result.message || 'Attendance session created successfully!';
            messageEl.className = 'success-message';
            messageEl.style.display = 'block';
            document.getElementById('sessionForm').reset();
            initializeDateSelectors();
            loadSessions();
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        } else {
            messageEl.textContent = result.message || 'Error creating session';
            messageEl.className = 'error-message';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error creating session:', error);
        document.getElementById('message').textContent = 'Error creating session';
        document.getElementById('message').className = 'error-message';
        document.getElementById('message').style.display = 'block';
    }
}

async function loadSessions() {
    try {
        const response = await fetch('http://localhost:3000/api/sessions/my-sessions', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const sessions = await response.json();
            displaySessions(sessions);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function displaySessions(sessions) {
    const tbody = document.getElementById('sessionsTableBody');
    tbody.innerHTML = '';

    if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No sessions created yet</td></tr>';
        return;
    }

    sessions.forEach(session => {
        const row = document.createElement('tr');
        const statusClass = session.status === 'active' ? 'btn-success' : 'btn-secondary';
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const date = new Date(session.date);
        const dateStr = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        const timeStr = session.time.substring(0, 5);
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td><span class="btn ${statusClass}" style="padding: 5px 10px; border-radius: 3px;">${session.status.toUpperCase()}</span></td>
            <td>${session.attendanceCount || 0}</td>
            <td>
                ${session.status === 'active' ? 
                    `<button class="btn btn-danger" onclick="closeSession(${session.id})" style="padding: 5px 10px;">Close</button>` : 
                    '<span style="color: #666;">Closed</span>'
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function closeSession(sessionId) {
    if (!confirm('Are you sure you want to close this session? Students will no longer be able to mark attendance.')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}/close`, {
            method: 'PUT',
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        if (response.ok) {
            loadSessions();
        } else {
            alert('Error closing session');
        }
    } catch (error) {
        console.error('Error closing session:', error);
        alert('Error closing session');
    }
}

