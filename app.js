const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const path = require('path');
const net = require('net');
require('dotenv').config();

// Set timezone to WITA (UTC+8) - Fixed timezone, tidak bergantung env
process.env.TZ = 'Asia/Makassar';

// Suppress deprecation warnings
process.noDeprecation = true;

// Handle deprecation warnings
process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning' && warning.message.includes('util.isArray')) {
        // Silently ignore util.isArray deprecation warnings
        return;
    }
    // Log other warnings
    console.warn(warning.name, warning.message);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Function to check if port is available
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        server.on('error', () => {
            resolve(false);
        });
    });
}

// Function to find available port
async function findAvailablePort(startPort) {
    let port = startPort;
    while (port < startPort + 100) {
        if (await isPortAvailable(port)) {
            return port;
        }
        port++;
    }
    throw new Error('No available port found');
}

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';

// Import routes
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { serve, setup } = require('./swagger');

// Middleware
app.use(express.json({ 
    limit: process.env.MAX_FILE_SIZE || '5mb' 
}));
app.use(express.urlencoded({ 
    extended: true,
    limit: process.env.MAX_FILE_SIZE || '5mb'
}));
app.use(express.static('public'));
// Serve uploads folder for images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to false for development, true for production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    },
    name: 'fleur.session.id' // Custom session name
}));

app.use(flash());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Pass environment variables ke semua views
app.locals.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Routes
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Swagger documentation
app.use('/api-docs', serve, setup);

// Root redirect
app.get('/', (req, res) => {
    res.redirect('/admin/login');
});

// 404 handler
app.use((req, res) => {
    // Check if request is for API endpoint
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ 
            success: false, 
            message: 'API endpoint not found',
            code: 'ENDPOINT_NOT_FOUND'
        });
    }
    
    // Render 404 page for web requests
    res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    // Check if request is for API endpoint
    if (req.path.startsWith('/api')) {
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            code: 'SERVER_ERROR',
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
    
    // Render 500 page for web requests
    res.status(500).render('500', { 
        error: err,
        message: err.message 
    });
});

// Start server with port availability check
async function startServer() {
    try {
        const availablePort = await findAvailablePort(PORT);
        
        if (availablePort !== PORT) {
            console.log(`Port ${PORT} is busy, using port ${availablePort} instead`);
        }
        
        app.listen(availablePort, '0.0.0.0', () => {
            console.log(`Server running at http://localhost:${availablePort}`);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start the server
startServer();