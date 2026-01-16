/**
 * ============================================
 * KONFIGURASI CORS (Cross-Origin Resource Sharing)
 * ============================================
 * File ini mengatur siapa saja yang boleh mengakses API.
 * CORS penting untuk keamanan - mencegah website lain
 * mengakses API kita tanpa izin.
 */

const cors = require('cors');

// Cek apakah mode development atau production
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Konfigurasi utama CORS
 * Mengatur origin mana yang diizinkan mengakses API
 */
const corsOptions = {
    // Fungsi untuk mengecek apakah origin diizinkan
    origin: function (origin, callback) {
        // Izinkan request tanpa origin (mobile apps, Postman, curl, dll)
        if (!origin) {
            return callback(null, true);
        }

        // Mode development - izinkan semua origin (untuk testing)
        if (isDevelopment) {
            console.log(`CORS: Allowing origin: ${origin}`);
            return callback(null, true);
        }

        // Mode production - cek daftar origin yang diizinkan
        const allowedOrigins = process.env.CORS_ORIGIN ?
            // Ambil dari environment variable jika ada
            process.env.CORS_ORIGIN.split(',').map(o => o.trim()) :
            // Default: daftar origin yang diizinkan
            [
                'http://localhost:3000',       // Development local
                'http://127.0.0.1:3000',       // Development local (alternatif)
                'http://192.168.1.102:3000',   // IP lokal (sesuaikan)
                'http://76.13.19.34',        // Android emulator
                'https://api.fleuratelier.com', // Production API
                'fleurpresensi.online'     // Production website
            ];

        // Cek apakah origin ada di daftar yang diizinkan
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            console.log(`CORS: Allowed origin: ${origin}`);
            callback(null, true);
        } else {
            // Origin tidak diizinkan - tolak request
            console.log(`CORS: Blocked origin: ${origin}`);
            console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
            callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
        }
    },

    // Izinkan pengiriman cookies/credentials
    credentials: true,

    // HTTP methods yang diizinkan
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

    // Headers yang diizinkan dari client
    allowedHeaders: [
        'Content-Type',      // Tipe konten (JSON, form-data, dll)
        'Authorization',     // Token JWT untuk autentikasi
        'X-Requested-With',  // Untuk AJAX requests
        'Accept',            // Tipe response yang diterima
        'Origin',            // Asal request
        'Cache-Control',     // Kontrol cache
        'X-File-Name',       // Nama file saat upload
        'X-API-Key',         // API key (jika digunakan)
        'Access-Control-Allow-Origin'
    ],

    // Headers yang boleh dibaca oleh client
    exposedHeaders: [
        'Content-Length',    // Ukuran response
        'X-Total-Count',     // Total data (untuk pagination)
        'X-Page-Count',      // Total halaman
        'Access-Control-Allow-Origin'
    ],

    // Cache preflight request selama 24 jam
    maxAge: 86400,

    // Status code untuk preflight (200 untuk browser lama)
    optionsSuccessStatus: 200
};

// Buat middleware CORS dari konfigurasi
const corsMiddleware = cors(corsOptions);

/**
 * Handler untuk preflight request (OPTIONS)
 * Browser mengirim OPTIONS request sebelum request sebenarnya
 * untuk mengecek apakah request diizinkan
 */
const handlePreflight = (req, res) => {
    const origin = req.headers.origin;

    // Set semua CORS headers
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name, X-API-Key');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');

    console.log(`CORS Preflight: ${req.method} ${req.path} from ${origin || 'unknown'}`);

    res.sendStatus(200);
};

/**
 * Middleware untuk debugging CORS (hanya di development)
 * Menampilkan log request dan response headers
 */
const corsDebugger = (req, res, next) => {
    if (isDevelopment) {
        const origin = req.headers.origin;
        const method = req.method;
        const path = req.path;

        if (origin) {
            console.log(`CORS Request: ${method} ${path} from ${origin}`);
        }

        // Log response headers setelah dikirim
        const originalSend = res.send;
        res.send = function (data) {
            if (isDevelopment && origin) {
                console.log(`CORS Response headers:`, {
                    'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials')
                });
            }
            originalSend.call(this, data);
        };
    }
    next();
};

/**
 * Setup CORS untuk Express app
 * Dipanggil di app.js saat inisialisasi server
 * 
 * @param {Express} app - Instance Express application
 */
const setupCORS = (app) => {
    console.log(`Setting up CORS for ${isDevelopment ? 'development' : 'production'} mode`);

    if (isDevelopment) {
        // Development: CORS untuk semua route
        app.use(corsMiddleware);
        app.use(corsDebugger);
        console.log('CORS: Development mode - All origins allowed globally');
    } else {
        // Production: CORS hanya untuk route /api
        app.use('/api', corsMiddleware);
        console.log('CORS: Production mode - Restricted to API routes only');
    }

    // Handle semua preflight OPTIONS requests
    app.options('*', handlePreflight);

    // Error handler khusus untuk CORS errors
    app.use((err, req, res, next) => {
        if (err.message && err.message.includes('CORS')) {
            console.error(`CORS Error: ${err.message}`);
            return res.status(403).json({
                success: false,
                message: 'CORS policy violation',
                error: isDevelopment ? err.message : 'Origin not allowed'
            });
        }
        next(err);
    });
};

/**
 * Setup CORS khusus untuk Swagger UI
 * Swagger butuh CORS khusus karena diakses dari browser
 * 
 * @param {Express} app - Instance Express application
 */
const setupSwaggerCORS = (app) => {
    // CORS untuk halaman Swagger UI (/api-docs)
    app.use('/api-docs*', (req, res, next) => {
        const origin = req.headers.origin;

        // Selalu izinkan akses ke Swagger UI
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-API-Key');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');

        // Handle preflight untuk Swagger
        if (req.method === 'OPTIONS') {
            console.log(`Swagger CORS Preflight: ${req.path} from ${origin || 'unknown'}`);
            return res.sendStatus(200);
        }

        console.log(`Swagger CORS: ${req.method} ${req.path} from ${origin || 'unknown'}`);
        next();
    });

    // CORS untuk API routes yang diakses dari Swagger
    app.use('/api*', (req, res, next) => {
        const origin = req.headers.origin;
        const userAgent = req.headers['user-agent'] || '';

        // Deteksi apakah request dari Swagger UI
        const isSwaggerRequest = userAgent.includes('swagger') ||
            req.headers.referer?.includes('/api-docs') ||
            req.headers['x-requested-with'] === 'swagger-ui';

        // Izinkan jika dari Swagger atau mode development
        if (isSwaggerRequest || isDevelopment) {
            res.header('Access-Control-Allow-Origin', origin || '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-API-Key');
            res.header('Access-Control-Allow-Credentials', 'true');

            if (req.method === 'OPTIONS') {
                console.log(`API CORS Preflight for Swagger: ${req.path} from ${origin || 'unknown'}`);
                return res.sendStatus(200);
            }

            console.log(`API CORS for Swagger: ${req.method} ${req.path} from ${origin || 'unknown'}`);
        }

        next();
    });

    console.log('Swagger CORS: Enhanced CORS setup for Swagger UI');
};

/**
 * Export semua fungsi dan konfigurasi
 */
module.exports = {
    corsOptions,        // Konfigurasi CORS mentah
    corsMiddleware,     // Middleware CORS siap pakai
    handlePreflight,    // Handler untuk OPTIONS request
    corsDebugger,       // Middleware debugging (development only)
    setupCORS,          // Setup CORS untuk app
    setupSwaggerCORS    // Setup CORS khusus Swagger
};
