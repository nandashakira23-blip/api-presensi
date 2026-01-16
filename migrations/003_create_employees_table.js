/**
 * Migration: Create Employees Table
 * File: 003_create_employees_table.js
 * Purpose: Membuat tabel karyawan dengan semua field yang diperlukan
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Create Employees Table');
    
    try {
        // Create karyawan table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS karyawan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nik VARCHAR(16) UNIQUE NOT NULL COMMENT '16 digit angka NIK',
                nama VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE,
                phone VARCHAR(20),
                id_jabatan INT,
                is_activated BOOLEAN DEFAULT FALSE,
                pin VARCHAR(255),
                foto_referensi TEXT,
                face_enrollment_completed BOOLEAN DEFAULT FALSE,
                face_enrollment_data LONGTEXT,
                work_schedule_id INT,
                profile_picture VARCHAR(255),
                address TEXT,
                birth_date DATE,
                hire_date DATE DEFAULT (CURRENT_DATE),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_jabatan) REFERENCES jabatan(id) ON DELETE SET NULL,
                FOREIGN KEY (work_schedule_id) REFERENCES jadwal_kerja(id) ON DELETE SET NULL
            )
        `);
        console.log('✓ Karyawan table created');
        
        console.log('Migration completed: Create Employees Table');
        
    } catch (error) {
        console.error('Error in employees table migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Create Employees Table');
    
    try {
        await connection.execute('DROP TABLE IF EXISTS karyawan');
        console.log('✓ Karyawan table dropped');
        
    } catch (error) {
        console.error('Error rolling back employees table migration:', error);
        throw error;
    }
}

module.exports = { up, down };