#!/usr/bin/env node

/**
 * Development Server Starter
 * Loads development environment and starts the server
 */

const path = require('path');
const fs = require('fs');

// Load development environment
const envPath = path.join(__dirname, '..', '.env');
const envDevPath = path.join(__dirname, '..', '.env.development');

// Check if .env.development exists, if so, use it
if (fs.existsSync(envDevPath)) {
    require('dotenv').config({ path: envDevPath });
    console.log('Loaded .env.development');
} else {
    require('dotenv').config({ path: envPath });
    console.log('Loaded .env');
}

// Set development environment
process.env.NODE_ENV = 'development';

// Start the application
require('../app.js');