/* ============================================ */
/* QR CODE SCANNER JAVASCRIPT */
/* Add this to the existing <script> section */
/* ============================================ */

// QR Code Scanner
let html5QrcodeScanner = null;
let isScanning = false;

// Initialize QR Scanner
function initQRScanner() {
    const startBtn = document.getElementById('startQrScan');
    const stopBtn = document.getElementById('stopQrScan');
    const manualQRBtn = document.getElementById('submitManualQR');
    
    startBtn.addEventListener('click', startQRScan);
    stopBtn.addEventListener('click', stopQRScan);
    manualQRBtn.addEventListener('click', submitManualQR);
}

// Start QR Scanning
async function startQRScan() {
    try {
        const startBtn = document.getElementById('startQrScan');
        const stopBtn = document.getElementById('stopQrScan');
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        
        html5QrcodeScanner = new Html5Qrcode("qr-reader");
        
        await html5QrcodeScanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onQRScanSuccess,
            onQRScanFailure
        );
        
        isScanning = true;
        showStatus('qr-scan-status', 'info', '📷 Scanner aktif. Arahkan ke QR code...');
    } catch (err) {
        console.error('QR Scanner error:', err);
        showStatus('qr-scan-status', 'error', '❌ Gagal memulai scanner: ' + err);
        document.getElementById('startQrScan').style.display = 'inline-flex';
        document.getElementById('stopQrScan').style.display = 'none';
    }
}

// Stop QR Scanning
async function stopQRScan() {
    if (html5QrcodeScanner && isScanning) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
            isScanning = false;
            
            document.getElementById('startQrScan').style.display = 'inline-flex';
            document.getElementById('stopQrScan').style.display = 'none';
            document.getElementById('qr-scan-status').innerHTML = '';
        } catch (err) {
            console.error('Stop scanner error:', err);
        }
    }
}

// QR Scan Success Handler
async function onQRScanSuccess(decodedText, decodedResult) {
    console.log('QR Code detected:', decodedText);
    
    // Stop scanning immediately
    await stopQRScan();
    
    // Process QR code
    await processQRCheckIn(decodedText);
}

// QR Scan Failure Handler (optional)
function onQRScanFailure(error) {
    // Silent - this fires constantly when no QR is detected
}

// Process QR Check-in
async function processQRCheckIn(qrCode) {
    try {
        showStatus('qr-scan-status', 'info', '⏳ Memproses check-in...');
        
        const response = await fetch(`${API_BASE_URL}/attendance/qr-checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                qrCode: qrCode,
                location: 'QR Scanner',
                notes: 'Check-in via QR Code scan'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('qr-scan-status', 'success', '✅ Check-in berhasil!');
            
            // Display member info
            displayQRScanResult(result.member, result.data);
            
            // Play success sound (optional)
            playSuccessSound();
            
            // Refresh data
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            showStatus('qr-scan-status', 'error', '❌ ' + result.message);
        }
    } catch (error) {
        console.error('QR check-in error:', error);
        showStatus('qr-scan-status', 'error', '❌ Error: ' + error.message);
    }
}

// Display QR Scan Result
function displayQRScanResult(member, attendance) {
    const resultDiv = document.getElementById('qr-scan-result');
    const nameEl = document.getElementById('qr-member-name');
    const roleEl = document.getElementById('qr-member-role');
    const timeEl = document.getElementById('qr-checkin-time');
    const avatarEl = document.getElementById('qr-member-avatar');
    
    nameEl.textContent = member.name;
    roleEl.textContent = member.role;
    timeEl.textContent = '⏰ ' + new Date(attendance.checkInTime).toLocaleString('id-ID');
    
    // Set avatar
    if (member.avatar) {
        avatarEl.src = member.avatar;
    } else {
        avatarEl.src = getDefaultAvatar(member.name);
    }
    
    resultDiv.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 5000);
}

// Manual QR Code Input
async function submitManualQR() {
    const qrCodeInput = document.getElementById('manual-qr-code');
    const qrCode = qrCodeInput.value.trim();
    
    if (!qrCode) {
        showStatus('manual-qr-status', 'error', '❌ Masukkan kode QR!');
        return;
    }
    
    await processQRCheckIn(qrCode);
    qrCodeInput.value = '';
}

// Play success sound (optional)
function playSuccessSound() {
    // You can add audio file here
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVqnl8bBlHAU2jdXzzHwyBSl+zPLaizsIGGS56+adUhENUKXh8bJsIQU0iNHy0IQ4BhxqvOzmnFUODlOo5PC3ayIFMYnU8c+EPAYabsDt5JZSDRBUqu');
        audio.play();
    } catch (e) {
        // Ignore if sound fails
    }
}

// Show status message
function showStatus(elementId, type, message) {
    const statusEl = document.getElementById(elementId);
    statusEl.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
    
    // Auto-hide success/error after 5s
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusEl.innerHTML = '';
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if QR scanner libraries are loaded
    if (typeof Html5Qrcode !== 'undefined') {
        initQRScanner();
    } else {
        console.error('Html5Qrcode library not loaded');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (html5QrcodeScanner && isScanning) {
        html5QrcodeScanner.stop();
    }
});
