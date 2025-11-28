let users = [];
let attendance = [];

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
    checkAuth('admin');
    loadUsers();
    loadAttendance();
    
    // Initialize form event listener after DOM is ready
    const addUserForm = document.getElementById('addUserForm');
    if (!addUserForm) {
        console.error('addUserForm element not found');
    } else {
        addUserForm.addEventListener('submit', handleFormSubmit);
    }
});

// Make functions globally accessible for onclick handlers
window.showTab = function(tabName, event) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find the clicked tab
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.textContent.includes(tabName === 'users' ? 'User Management' : 'Attendance Records')) {
                tab.classList.add('active');
            }
        });
    }
    
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
};

async function loadUsers() {
    try {
        const response = await fetch('http://localhost:3000/api/users', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            users = await response.json();
            displayUsers();
        } else {
            if (response.status === 401) {
                window.location.href = '../index.html';
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
                <button class="btn btn-success" onclick="editUser(${user.id})" style="margin-right: 5px;">Edit</button>
                <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
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

window.openAddUserModal = function() {
    const modalTitle = document.getElementById('modalTitle');
    const submitButton = document.getElementById('submitButton');
    const userIdEl = document.getElementById('userId');
    const addUserForm = document.getElementById('addUserForm');
    const passwordField = document.getElementById('newUserPassword');
    const addUserMessage = document.getElementById('addUserMessage');
    const addUserModal = document.getElementById('addUserModal');
    
    if (!modalTitle || !submitButton || !userIdEl || !addUserForm || !passwordField || !addUserMessage || !addUserModal) {
        console.error('Modal elements not found');
        return;
    }
    
    modalTitle.textContent = 'Add User';
    submitButton.textContent = 'Add User';
    userIdEl.value = '';
    addUserForm.reset();
    passwordField.required = true;
    passwordField.placeholder = 'Enter password';
    const smallText = passwordField.nextElementSibling;
    if (smallText && smallText.tagName === 'SMALL') {
        smallText.style.display = 'none';
    }
    addUserMessage.style.display = 'none';
    addUserModal.classList.add('active');
}

window.closeAddUserModal = function() {
    const addUserModal = document.getElementById('addUserModal');
    const addUserForm = document.getElementById('addUserForm');
    const userIdEl = document.getElementById('userId');
    
    if (addUserModal) {
        addUserModal.classList.remove('active');
    }
    if (addUserForm) {
        addUserForm.reset();
    }
    if (userIdEl) {
        userIdEl.value = '';
    }
}

async function editUser(userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            const modalTitle = document.getElementById('modalTitle');
            const submitButton = document.getElementById('submitButton');
            const userIdEl = document.getElementById('userId');
            const userNameEl = document.getElementById('newUserName');
            const userEmailEl = document.getElementById('newUserEmail');
            const userRoleEl = document.getElementById('newUserRole');
            const passwordField = document.getElementById('newUserPassword');
            const addUserMessage = document.getElementById('addUserMessage');
            const addUserModal = document.getElementById('addUserModal');
            
            if (!modalTitle || !submitButton || !userIdEl || !userNameEl || !userEmailEl || !userRoleEl || !passwordField || !addUserMessage || !addUserModal) {
                console.error('Modal elements not found');
                return;
            }
            
            modalTitle.textContent = 'Edit User';
            submitButton.textContent = 'Update User';
            userIdEl.value = user.id || '';
            userNameEl.value = user.name || '';
            userEmailEl.value = user.email || '';
            userRoleEl.value = user.role || '';
            passwordField.value = '';
            passwordField.required = false;
            passwordField.placeholder = 'Leave blank to keep current password';
            const smallText = passwordField.nextElementSibling;
            if (smallText && smallText.tagName === 'SMALL') {
                smallText.style.display = 'block';
            }
            addUserMessage.style.display = 'none';
            addUserModal.classList.add('active');
        } else {
            alert('Error loading user data');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        alert('Error loading user data');
    }
}

// Form submit handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const userIdEl = document.getElementById('userId');
    const userNameEl = document.getElementById('newUserName');
    const userEmailEl = document.getElementById('newUserEmail');
    const userRoleEl = document.getElementById('newUserRole');
    const userPasswordEl = document.getElementById('newUserPassword');
    
    // Check if all elements exist
    if (!userNameEl || !userEmailEl || !userRoleEl || !userPasswordEl) {
        console.error('Form elements not found');
        return;
    }
    
    const userId = userIdEl ? userIdEl.value : '';
    const isEdit = userId !== '';
    
    // Get form values with safe handling
    const name = userNameEl && userNameEl.value ? userNameEl.value.trim() : '';
    const email = userEmailEl && userEmailEl.value ? userEmailEl.value.trim() : '';
    const role = userRoleEl && userRoleEl.value ? userRoleEl.value.trim() : '';
    const password = userPasswordEl && userPasswordEl.value ? userPasswordEl.value.trim() : '';
    
    // Debug logging
    console.log('Form values:', { name, email, role, password: password ? '***' : 'empty' });
    
    // Frontend validation
    if (!name || !email || !role) {
        const messageEl = document.getElementById('addUserMessage');
        messageEl.className = 'error-message';
        messageEl.textContent = `Validation failed: Name="${name}", Email="${email}", Role="${role}"`;
        messageEl.style.display = 'block';
        console.error('Validation failed:', { name, email, role });
        return;
    }
    
    if (!isEdit && (!password || password.length === 0)) {
        const messageEl = document.getElementById('addUserMessage');
        messageEl.className = 'error-message';
        messageEl.textContent = 'Password is required when adding a new user';
        messageEl.style.display = 'block';
        return;
    }
    
    if (!isEdit && password.length < 3) {
        const messageEl = document.getElementById('addUserMessage');
        messageEl.className = 'error-message';
        messageEl.textContent = 'Password must be at least 3 characters';
        messageEl.style.display = 'block';
        return;
    }
    
    const formData = {
        name: name,
        email: email,
        role: role
    };
    
    // Password is required for add, optional for edit
    if (!isEdit) {
        // When adding, password must be included
        formData.password = password;
    } else if (password && password.length > 0) {
        // When editing, only include password if provided
        formData.password = password;
    }
    
    const messageEl = document.getElementById('addUserMessage');
    messageEl.style.display = 'none';
    
    try {
        const url = isEdit 
            ? `http://localhost:3000/api/users/${userId}`
            : 'http://localhost:3000/api/users';
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeAddUserModal();
            loadUsers();
            messageEl.className = 'success-message';
            messageEl.textContent = isEdit ? 'User updated successfully!' : 'User added successfully!';
            messageEl.style.display = 'block';
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        } else {
            messageEl.className = 'error-message';
            messageEl.textContent = data.message || (isEdit ? 'Error updating user' : 'Error adding user');
            messageEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error saving user:', error);
        messageEl.className = 'error-message';
        messageEl.textContent = 'Connection error. Please check if the server is running.';
        messageEl.style.display = 'block';
    }
}

window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            loadUsers();
        } else {
            const data = await response.json();
            alert(data.message || 'Error deleting user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Connection error. Please check if the server is running.');
    }
}

