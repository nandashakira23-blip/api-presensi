/**
 * Migration: Create Security Tables
 * File: 006_create_security_tables.js
 * Purpose: Membuat tabel untuk sistem keamanan PIN dan audit
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Create Security Tables');
    
    try {
        // 1. Create pin_security_log table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pin_security_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_karyawan INT NOT NULL,
                action ENUM('validate', 'change', 'reset', 'lock', 'unlock') NOT NULL,
                success BOOLEAN NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE
            )
        `);
        console.log('✓ PIN security log table created');
        
        console.log('Migration completed: Create Security Tables');
        
    } catch (error) {
        console.error('Error in security tables migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Create Security Tables');
    
    try {
        await connection.execute('DROP TABLE IF EXISTS pin_security_log');
        console.log('✓ Security tables dropped');
        
    } catch (error) {
        console.error('Error rolling back security tables migration:', error);
        throw error;
    }
}

module.exports = { up, down };