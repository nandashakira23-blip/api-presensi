/**
 * Migration: Create Employees Table Structure
 * File: 010_create_employees_table.js
 * Purpose: Dedicated migration for employee table structure
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Create Employees Table Structure');
    
    try {
        // Check if karyawan table exists
        const [tables] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'karyawan'
        `);
        
        if (tables[0].count === 0) {
            // Create karyawan table with proper structure
            await connection.execute(`
                CREATE TABLE karyawan (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nik VARCHAR(20) UNIQUE NOT NULL,
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
                    hire_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_jabatan) REFERENCES jabatan(id),
                    FOREIGN KEY (work_schedule_id) REFERENCES jadwal_kerja(id)
                )
            `);
            console.log('✓ Karyawan table created');
        } else {
            console.log('✓ Karyawan table already exists');
        }
        
        console.log('Migration completed: Create Employees Table Structure');
        
    } catch (error) {
        console.error('Error in employees table migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Create Employees Table Structure');
    
    try {
        await connection.execute('DROP TABLE IF EXISTS karyawan');
        console.log('✓ Karyawan table dropped');
        
    } catch (error) {
        console.error('Error rolling back employees table migration:', error);
        throw error;
    }
}

module.exports = { up, down };