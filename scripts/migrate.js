const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    });

    try {
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`Database '${process.env.DB_NAME}' created/verified`);
    } catch (error) {
        console.error('Failed to create database:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

async function runMigrations() {
    console.log('Starting database migration...');
    
    let connection;
    
    try {
        // Create database first
        await createDatabase();
        
        // Connect to the database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        
        // Get all migration files
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.js'))
            .sort();

        console.log(`Found ${migrationFiles.length} migration files`);

        // Run each migration
        for (const file of migrationFiles) {
            console.log(`Running migration: ${file}`);
            const migration = require(path.join(migrationsDir, file));
            
            if (migration.up) {
                await migration.up(connection);
                console.log(`Migration ${file} completed`);
            } else {
                console.log(`Migration ${file} has no up function, skipping`);
            }
        }

        console.log('');
        console.log('All migrations completed successfully!');
        console.log('');
        console.log('Default admin login:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('');
        console.log('Ready to run: npm start');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('Tips:');
            console.log('   - Make sure MySQL server is running');
            console.log('   - Check your .env database credentials');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('Tips:');
            console.log('   - Check your MySQL username/password in .env');
            console.log('   - Make sure user has CREATE DATABASE privileges');
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function rollbackMigrations() {
    console.log('Rolling back migrations...');
    
    let connection;
    
    try {
        // Connect to the database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.js'))
            .sort()
            .reverse(); // Rollback in reverse order

        for (const file of migrationFiles) {
            console.log(`Rolling back: ${file}`);
            const migration = require(path.join(migrationsDir, file));
            
            if (migration.down) {
                await migration.down(connection);
                console.log(`Rollback ${file} completed`);
            } else {
                console.log(`Migration ${file} has no down function, skipping`);
            }
        }

        console.log('All rollbacks completed!');
        
    } catch (error) {
        console.error('Rollback failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Command line interface
const command = process.argv[2];

if (command === 'up') {
    runMigrations();
} else if (command === 'down') {
    rollbackMigrations();
} else {
    console.log('Usage:');
    console.log('  npm run migrate up    - Run migrations');
    console.log('  npm run migrate down  - Rollback migrations');
}

// Export for use in other scripts
module.exports = { runMigrations, rollbackMigrations };
