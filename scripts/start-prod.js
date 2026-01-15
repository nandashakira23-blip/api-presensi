#!/usr/bin/env node

/**
 * Production Server Starter
 * Loads production environment and starts the server
 */

const path = require('path');
const fs = require('fs');

// Load production environment
const envProdPath = path.join(__dirname, '..', '.env.production');
const envPath = path.join(__dirname, '..', '.env');

// Check if .env.production exists, if so, use it
if (fs.existsSync(envProdPath)) {
    require('dotenv').config({ path: envProdPath });
    console.log('Loaded .env.production');
} else {
    require('dotenv').config({ path: envPath });
    console.log('Loaded .env (fallback)');
}

// Set production environment
process.env.NODE_ENV = 'production';

// Start the application
require('../app.js');