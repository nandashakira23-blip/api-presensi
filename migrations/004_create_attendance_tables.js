/**
 * Migration: Create Attendance Tables
 * File: 004_create_attendance_tables.js
 * Purpose: Membuat tabel-tabel untuk sistem absensi
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Create Attendance Tables');
    
    try {
        // 1. Create presensi table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS presensi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_karyawan INT NOT NULL,
                tanggal DATE NOT NULL,
                jam_masuk TIME,
                jam_keluar TIME,
                foto_masuk TEXT,
                foto_keluar TEXT,
                lat_masuk DECIMAL(10,8),
                long_masuk DECIMAL(11,8),
                lat_keluar DECIMAL(10,8),
                long_keluar DECIMAL(11,8),
                status ENUM('hadir', 'terlambat', 'tidak_hadir', 'izin', 'sakit') DEFAULT 'hadir',
                keterangan TEXT,
                face_similarity_in DECIMAL(5,4),
                face_similarity_out DECIMAL(5,4),
                distance_in DECIMAL(8,2),
                distance_out DECIMAL(8,2),
                attendance_type ENUM('regular', 'overtime', 'holiday') DEFAULT 'regular',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE,
                UNIQUE KEY unique_employee_date (id_karyawan, tanggal)
            )
        `);
        console.log('✓ Presensi table created');
        
        // 2. Create attendance_summary table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS attendance_summary (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_karyawan INT NOT NULL,
                date DATE NOT NULL,
                clock_in_time DATETIME,
                clock_out_time DATETIME,
                work_duration_minutes INT DEFAULT 0,
                break_duration_minutes INT DEFAULT 0,
                overtime_minutes INT DEFAULT 0,
                late_minutes INT DEFAULT 0,
                early_leave_minutes INT DEFAULT 0,
                status ENUM('present', 'late', 'absent', 'partial', 'overtime') DEFAULT 'present',
                is_holiday BOOLEAN DEFAULT FALSE,
                is_weekend BOOLEAN DEFAULT FALSE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE,
                UNIQUE KEY unique_employee_summary_date (id_karyawan, date)
            )
        `);
        console.log('✓ Attendance summary table created');
        
        console.log('Migration completed: Create Attendance Tables');
        
    } catch (error) {
        console.error('Error in attendance tables migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Create Attendance Tables');
    
    try {
        await connection.execute('DROP TABLE IF EXISTS attendance_summary');
        await connection.execute('DROP TABLE IF EXISTS presensi');
        console.log('✓ Attendance tables dropped');
        
    } catch (error) {
        console.error('Error rolling back attendance tables migration:', error);
        throw error;
    }
}

module.exports = { up, down };