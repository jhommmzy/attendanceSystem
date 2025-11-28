document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = 'admin/admin.html';
            } else if (data.user.role === 'student') {
                window.location.href = 'student/student.html';
            } else if (data.user.role === 'teacher') {
                window.location.href = 'teacher/teacher.html';
            }
        } else {
            errorMessage.textContent = data.message || 'Invalid credentials';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'Connection error. Please try again.';
        errorMessage.style.display = 'block';
    }
});

