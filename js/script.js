here// ============================================
// تنظیمات
// ============================================
const API_URL = 'https://mcstatus.io/status/java/'; // آدرس بک‌اند خودت
// برای دپلوی: 'https://your-backend.onrender.com/api/status'

// ============================================
// تابع اصلی برای بررسی سرور
// ============================================
async function checkServer() {
    const addressInput = document.getElementById('serverAddress');
    const portInput = document.getElementById('serverPort');
    const checkBtn = document.getElementById('checkBtn');
    const resultSection = document.getElementById('resultSection');
    const errorDiv = document.getElementById('errorMessage');

    // گرفتن مقادیر
    let address = addressInput.value.trim();
    let port = portInput.value.trim();

    // اعتبارسنجی
    if (!address) {
        showError('لطفاً آدرس سرور را وارد کنید.');
        return;
    }

    if (!port) {
        port = '25565';
    }

    // غیرفعال کردن دکمه
    checkBtn.disabled = true;
    checkBtn.textContent = '🔄 در حال بررسی...';
    hideError();
    resultSection.style.display = 'none';

    // ساخت URL با پارامترها
    const url = `${API_URL}?host=${encodeURIComponent(address)}&port=${encodeURIComponent(port)}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`خطای شبکه (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (!data.success) {
            showError(data.error || 'خطا در دریافت اطلاعات');
            return;
        }

        // نمایش نتایج
        showResult({
            online: data.online,
            ip: data.host,
            port: data.port,
            players: data.players?.online || 0,
            maxPlayers: data.players?.max || 0,
            version: data.version?.name || 'نامشخص',
            motd: data.motd?.clean || 'بدون پیام',
            latency: data.latency || '--',
            favicon: data.favicon
        });

    } catch (error) {
        console.error('خطا:', error);
        showError(`خطا در اتصال به سرور: ${error.message}`);
    } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = '🔍 بررسی سرور';
    }
}

// ============================================
// نمایش نتایج
// ============================================
function showResult(data) {
    const resultSection = document.getElementById('resultSection');
    const statusText = document.getElementById('statusText');
    const playersText = document.getElementById('playersText');
    const versionText = document.getElementById('versionText');
    const latencyText = document.getElementById('latencyText');
    const motdText = document.getElementById('motdText');

    // وضعیت
    if (data.online) {
        statusText.textContent = '✅ آنلاین';
        statusText.className = 'status-online';
    } else {
        statusText.textContent = '❌ آفلاین';
        statusText.className = 'status-offline';
    }

    // تعداد بازیکنان
    if (data.online) {
        playersText.textContent = `${data.players} / ${data.maxPlayers}`;
    } else {
        playersText.textContent = '--';
    }

    // نسخه
    versionText.textContent = data.online ? data.version : '--';

    // تاخیر
    latencyText.textContent = data.online ? `${data.latency} ms` : '--';

    // MOTD
    motdText.textContent = data.online ? data.motd : 'سرور آفلاین است';

    // نمایش بخش نتایج
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// توابع کمکی
// ============================================
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.style.display = 'none';
}

// ============================================
// Event Listeners
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const addressInput = document.getElementById('serverAddress');
    const portInput = document.getElementById('serverPort');

    function handleEnter(e) {
        if (e.key === 'Enter') {
            checkServer();
        }
    }

    addressInput.addEventListener('keypress', handleEnter);
    portInput.addEventListener('keypress', handleEnter);

    // بارگذاری خودکار (اختیاری)
    // setTimeout(checkServer, 500);
});

// برای استفاده در HTML
window.checkServer = checkServer;
