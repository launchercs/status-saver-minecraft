hereconst express = require('express');
const mc = require('minecraft-protocol');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewareها
app.use(cors({
    origin: '*', // در تولید، دامنه خاص رو بذار
    methods: ['GET', 'OPTIONS']
}));
app.use(express.json());

// لاگ درخواست‌ها (برای دیباگ)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// مسیر سلامت (برای بررسی اینکه API زنده است)
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// مسیر اصلی برای بررسی وضعیت سرور
app.get('/api/status', async (req, res) => {
    const { host, port = 25565 } = req.query;

    // اعتبارسنجی
    if (!host) {
        return res.status(400).json({
            success: false,
            error: 'آدرس سرور را وارد کنید',
            hint: 'مثال: ?host=play.hypixel.net&port=25565'
        });
    }

    // محدود کردن پورت‌های مجاز (امنیت)
    const parsedPort = parseInt(port);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        return res.status(400).json({
            success: false,
            error: 'پورت نامعتبر است. باید بین ۱ تا ۶۵۵۳۵ باشد.'
        });
    }

    // تایم‌اوت برای اتصال
    const timeout = parseInt(req.query.timeout) || 5000;

    try {
        console.log(`Checking ${host}:${parsedPort}...`);
        
        const startTime = Date.now();
        const response = await mc.ping({
            host: host,
            port: parsedPort,
            timeout: timeout
        });
        const latency = Date.now() - startTime;

        // ساختاردهی پاسخ موفق
        const result = {
            success: true,
            online: true,
            host: host,
            port: parsedPort,
            latency: latency,
            players: {
                online: response.players?.online || 0,
                max: response.players?.max || 0,
                sample: response.players?.sample || []
            },
            version: {
                name: response.version?.name || 'نامشخص',
                protocol: response.version?.protocol || null
            },
            motd: {
                raw: response.description,
                clean: cleanMOTD(response.description),
                html: formatMOTD(response.description)
            },
            favicon: response.favicon || null,
            // اطلاعات اضافی برای دیباگ
            debug: {
                pingTime: latency,
                checkedAt: new Date().toISOString(),
                serverInfo: {
                    host: host,
                    port: parsedPort
                }
            }
        };

        res.json(result);

    } catch (error) {
        console.error(`Error checking ${host}:${parsedPort}:`, error.message);
        
        // پاسخ خطا با جزئیات بیشتر
        res.json({
            success: false,
            online: false,
            host: host,
            port: parsedPort,
            error: getErrorMessage(error),
            debug: {
                errorType: error.name,
                errorMessage: error.message,
                checkedAt: new Date().toISOString()
            }
        });
    }
});

// تابع کمکی برای پاک‌سازی MOTD از رنگ‌ها
function cleanMOTD(motd) {
    if (!motd) return 'بدون پیام';
    if (typeof motd === 'string') {
        // حذف کدهای رنگی ماینکرفت
        return motd.replace(/§[0-9a-fk-or]/g, '').trim();
    }
    if (typeof motd === 'object' && motd.text) {
        return cleanMOTD(motd.text);
    }
    if (Array.isArray(motd)) {
        return motd.map(part => cleanMOTD(part)).join(' ').trim();
    }
    return String(motd);
}

// تابع برای تبدیل MOTD به HTML (با رنگ‌ها)
function formatMOTD(motd) {
    if (!motd) return '<span style="color: #888;">بدون پیام</span>';
    
    let text = typeof motd === 'string' ? motd : JSON.stringify(motd);
    
    // تبدیل کدهای رنگی به تگ‌های HTML
    const colorMap = {
        '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
        '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
        '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
        'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
    };
    
    // این یک پیاده‌سازی ساده است، برای رنگ‌های پیشرفته‌تر می‌تونی از کتابخونه استفاده کنی
    return text.replace(/§([0-9a-f])/g, (match, code) => {
        const color = colorMap[code] || '#FFFFFF';
        return `</span><span style="color: ${color};">`;
    });
}

// تابع برای پیام‌های خطای خوانا
function getErrorMessage(error) {
    const messages = {
        'ECONNREFUSED': 'سرور پاسخ نمی‌دهد. ممکن است آفلاین باشد یا پورت اشتباه است.',
        'ETIMEDOUT': 'زمان اتصال به سرور به پایان رسید. (تایم‌اوت)',
        'EHOSTUNREACH': 'آدرس سرور یافت نشد.',
        'ENOTFOUND': 'نام دامنه معتبر نیست.'
    };
    
    return messages[error.code] || error.message || 'خطای ناشناخته در ارتباط با سرور.';
}

// مسیر پیش‌فرض برای تست
app.get('/', (req, res) => {
    res.json({
        name: 'Minecraft Status API',
        version: '1.0.0',
        description: 'API for checking Minecraft server status',
        endpoints: {
            health: '/health',
            status: '/api/status?host=SERVER_IP&port=PORT'
        },
        example: 'https://your-api.com/api/status?host=play.hypixel.net&port=25565',
        documentation: 'https://github.com/yourusername/minecraft-status-backend'
    });
});

// هندلر خطاهای ۴۰۴
app.use((req, res) => {
    res.status(404).json({
        error: 'مسیر یافت نشد',
        path: req.originalUrl
    });
});

// هندلر خطاهای عمومی
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'خطای داخلی سرور',
        message: err.message
    });
});

// شروع سرور
app.listen(port, () => {
    console.log(`✅ Minecraft Status API running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`🔍 Example: http://localhost:${port}/api/status?host=play.hypixel.net`);
});
