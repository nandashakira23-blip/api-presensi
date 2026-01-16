/**
 * Migration: Create Core Tables
 * File: 001_create_core_tables.js
 * Purpose: Membuat tabel-tabel inti sistem (admin, jabatan, pengaturan)
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Create Core Tables');
    
    try {
        // 1. Create admin table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Admin table created');
        
        // 2. Create jabatan table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS jabatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_jabatan VARCHAR(100) NOT NULL,
                deskripsi TEXT,
                gaji_pokok DECIMAL(15,2) DEFAULT 0,
                tunjangan DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Jabatan table created');
        
        // 3. Create pengaturan table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pengaturan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lat_kantor DECIMAL(10,8) NOT NULL DEFAULT -6.20000000,
                long_kantor DECIMAL(11,8) NOT NULL DEFAULT 106.81666600,
                radius_meter INT NOT NULL DEFAULT 100,
                pin_required BOOLEAN DEFAULT TRUE,
                pin_max_attempts INT DEFAULT 3,
                pin_lockout_minutes INT DEFAULT 30,
                face_and_pin_required BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Pengaturan table created');
        
        console.log('Migration completed: Create Core Tables');
        
    } catch (error) {
        console.error('Error in core tables migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Create Core Tables');
    
    try {
        await connection.execute('DROP TABLE IF EXISTS pengaturan');
        await connection.execute('DROP TABLE IF EXISTS jabatan');
        await connection.execute('DROP TABLE IF EXISTS admin');
        console.log('✓ Core tables dropped');
        
    } catch (error) {
        console.error('Error rolling back core tables migration:', error);
        throw error;
    }
}

module.exports = { up, down };