let html5QrCode = null;
let qrScannerActive = false;
let currentSessionId = null;

window.addEventListener('DOMContentLoaded', () => {
    checkAuth('student');
    loadSessions();
});

async function loadSessions() {
    try {
        const response = await fetch('http://localhost:3000/api/sessions/active', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        const contentType = response.headers.get('content-type');
        let result;

        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
        }

        if (response.ok) {
            displaySessions(result);
        } else {
            const errorMsg = result.message || `Error loading sessions (Status: ${response.status})`;
            console.error('Error loading sessions:', result);
            document.getElementById('sessionsList').innerHTML = 
                `<div style="text-align: center; padding: 20px; color: #dc3545;">${errorMsg}</div>`;
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        const errorMsg = error.message || 'Error loading sessions. Please try again.';
        document.getElementById('sessionsList').innerHTML = 
            `<div style="text-align: center; padding: 20px; color: #dc3545;">${errorMsg}</div>`;
    }
}

function displaySessions(sessions) {
    const container = document.getElementById('sessionsList');
    container.innerHTML = '';

    if (sessions.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No active attendance sessions available</div>';
        return;
    }

    sessions.forEach(session => {
        const card = document.createElement('div');
        card.className = 'attendance-card';
        card.style.cursor = 'pointer';
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const date = new Date(session.date);
        const dateStr = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        const timeStr = session.time.substring(0, 5);
        
        card.innerHTML = `
            <h3>${dateStr}</h3>
            <p><strong>Time:</strong> ${timeStr}</p>
            <p><strong>Teacher:</strong> ${session.teacherName || 'Unknown'}</p>
            <button class="btn btn-primary" onclick="takeAttendance(${session.id}, '${session.date}', '${session.time}')" style="margin-top: 10px; width: 100%;">
                Take Attendance
            </button>
        `;
        container.appendChild(card);
    });
}

function takeAttendance(sessionId, date, time) {
    currentSessionId = sessionId;
    
    // Show scanner modal or section
    const modal = document.createElement('div');
    modal.id = 'scannerModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Scan QR Code</h2>
                <span class="close" onclick="closeScanner()">&times;</span>
            </div>
            <div id="qr-reader" style="width: 100%; margin: 20px 0; border: 2px solid #ddd; border-radius: 8px; overflow: hidden; background: #000; min-height: 300px;"></div>
            <div id="scannerMessage" class="info-message" style="display: none;"></div>
            <div class="modal-buttons">
                <button class="btn btn-primary" id="startScannerBtn" onclick="startQRScanner()">Start Camera</button>
                <button class="btn btn-secondary" id="stopScannerBtn" onclick="stopQRScanner()" style="display: none;">Stop Scanner</button>
                <button class="btn btn-secondary" onclick="closeScanner()">Cancel</button>
            </div>
            <div id="scanResult" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; display: none;">
                <h3>Attendance Recorded:</h3>
                <p id="scanResultText"></p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeScanner() {
    if (html5QrCode && qrScannerActive) {
        stopQRScanner();
    }
    const modal = document.getElementById('scannerModal');
    if (modal) {
        modal.remove();
    }
    currentSessionId = null;
}

async function startQRScanner() {
    const scannerDiv = document.getElementById('qr-reader');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    const messageDiv = document.getElementById('scannerMessage');
    
    try {
        if (typeof Html5Qrcode === 'undefined') {
            messageDiv.textContent = 'QR Scanner library not loaded. Please refresh the page.';
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#f8d7da';
            return;
        }
        
        if (html5QrCode) {
            await html5QrCode.clear();
        }
        
        html5QrCode = new Html5Qrcode("qr-reader");
        qrScannerActive = true;
        
        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            onQRCodeScanned,
            (errorMessage) => {
                // Ignore errors, continue scanning
            }
        );
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        messageDiv.textContent = 'Camera started. Point at your QR code to scan.';
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#d4edda';
        
    } catch (error) {
        console.error('Error starting scanner:', error);
        messageDiv.textContent = 'Error starting camera: ' + error.message + '. Please allow camera permissions.';
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#f8d7da';
        qrScannerActive = false;
    }
}

async function stopQRScanner() {
    if (html5QrCode && qrScannerActive) {
        try {
            await html5QrCode.stop();
            await html5QrCode.clear();
            html5QrCode = null;
            qrScannerActive = false;
            
            document.getElementById('startScannerBtn').style.display = 'inline-block';
            document.getElementById('stopScannerBtn').style.display = 'none';
            document.getElementById('scannerMessage').style.display = 'none';
            document.getElementById('qr-reader').innerHTML = '';
        } catch (error) {
            console.error('Error stopping scanner:', error);
        }
    }
}

async function onQRCodeScanned(decodedText, decodedResult) {
    if (!qrScannerActive || !currentSessionId) return;
    
    try {
        const qrData = String(decodedText || '').trim();
        const messageDiv = document.getElementById('scannerMessage');
        
        if (!qrData || qrData.length === 0) {
            messageDiv.textContent = 'No data found in QR code. Please try scanning again.';
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#f8d7da';
            return;
        }

        messageDiv.textContent = 'Processing QR code...';
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#fff3cd';

        // Get session info
        const sessionResponse = await fetch(`http://localhost:3000/api/sessions/${currentSessionId}`, {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        if (!sessionResponse.ok) {
            throw new Error('Session not found');
        }

        const session = await sessionResponse.json();

        // Mark attendance for this session
        const response = await fetch('http://localhost:3000/api/attendance/scan-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify({
                sessionId: currentSessionId,
                date: session.date,
                timeIn: session.time,
                qrData: qrData
            })
        });

        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
        }

        if (response.ok) {
            const resultDiv = document.getElementById('scanResult');
            const resultText = document.getElementById('scanResultText');
            resultText.innerHTML = `
                <strong>Date:</strong> ${new Date(result.record.date).toLocaleDateString()}<br>
                <strong>Time:</strong> ${result.record.timeIn ? result.record.timeIn.substring(0, 5) : 'N/A'}<br>
                <strong>Status:</strong> ${result.record.status.toUpperCase()}<br>
                <span style="color: green; font-weight: bold;">✓ ${result.message}</span>
            `;
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#d4edda';
            
            messageDiv.style.display = 'none';
            await stopQRScanner();
            
            // Reload sessions after 2 seconds
            setTimeout(() => {
                closeScanner();
                loadSessions();
            }, 2000);
        } else {
            messageDiv.textContent = result.message || 'Error marking attendance';
            messageDiv.style.background = '#f8d7da';
        }
    } catch (error) {
        console.error('Error processing QR code:', error);
        document.getElementById('scannerMessage').textContent = 'Error processing QR code: ' + error.message;
        document.getElementById('scannerMessage').style.background = '#f8d7da';
    }
}

