/**
 * Migration: Create Face Recognition Tables
 * File: 005_create_face_recognition_tables.js
 * Purpose: Membuat tabel-tabel untuk sistem face recognition
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Create Face Recognition Tables');
    
    try {
        // 1. Create karyawan_face_reference table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS karyawan_face_reference (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_karyawan INT NOT NULL,
                face_encoding LONGTEXT NOT NULL,
                photo_path VARCHAR(255) NOT NULL,
                enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                quality_score DECIMAL(5,4),
                face_landmarks JSON,
                enrollment_method ENUM('manual', 'auto', 'bulk') DEFAULT 'manual',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE
            )
        `);
        console.log('✓ Karyawan face reference table created');
        
        // 2. Create absensi_face_log table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS absensi_face_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_karyawan INT NOT NULL,
                id_presensi INT,
                photo_path VARCHAR(255) NOT NULL,
                face_encoding LONGTEXT,
                similarity_score DECIMAL(5,4),
                recognition_status ENUM('match', 'no_match', 'no_face', 'multiple_faces', 'error') NOT NULL,
                confidence_level ENUM('high', 'medium', 'low') DEFAULT 'medium',
                processing_time_ms INT,
                faces_detected INT DEFAULT 0,
                face_landmarks JSON,
                recognition_method ENUM('realtime', 'batch', 'manual') DEFAULT 'realtime',
                error_message TEXT,
                device_info JSON,
                location_lat DECIMAL(10,8),
                location_lng DECIMAL(11,8),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE,
                FOREIGN KEY (id_presensi) REFERENCES presensi(id) ON DELETE SET NULL
            )
        `);
        console.log('✓ Absensi face log table created');
        
        // 3. Create face_recognition_stats table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS face_recognition_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_karyawan INT NOT NULL,
                total_attempts INT DEFAULT 0,
                successful_matches INT DEFAULT 0,
                failed_matches INT DEFAULT 0,
                avg_similarity_score DECIMAL(5,4),
                avg_processing_time_ms INT,
                last_recognition_date DATETIME,
                best_similarity_score DECIMAL(5,4),
                worst_similarity_score DECIMAL(5,4),
                total_processing_time_ms BIGINT DEFAULT 0,
                recognition_accuracy DECIMAL(5,4),
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE
            )
        `);
        console.log('✓ Face recognition stats table created');
        
        // 4. Create face_recognition_settings table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS face_recognition_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                similarity_threshold DECIMAL(5,4) DEFAULT 0.6000,
                max_face_distance DECIMAL(5,4) DEFAULT 0.4000,
                min_face_size INT DEFAULT 50,
                max_processing_time_ms INT DEFAULT 5000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Face recognition settings table created');
        
        // 5. Create face_recognition_audit table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS face_recognition_audit (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_karyawan INT NOT NULL,
                action ENUM('enrollment', 'recognition', 'update', 'delete') NOT NULL,
                old_data JSON,
                new_data JSON,
                performed_by VARCHAR(100),
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE
            )
        `);
        console.log('✓ Face recognition audit table created');
        
        console.log('Migration completed: Create Face Recognition Tables');
        
    } catch (error) {
        console.error('Error in face recognition tables migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Create Face Recognition Tables');
    
    try {
        await connection.execute('DROP TABLE IF EXISTS face_recognition_audit');
        await connection.execute('DROP TABLE IF EXISTS face_recognition_settings');
        await connection.execute('DROP TABLE IF EXISTS face_recognition_stats');
        await connection.execute('DROP TABLE IF EXISTS absensi_face_log');
        await connection.execute('DROP TABLE IF EXISTS karyawan_face_reference');
        console.log('✓ Face recognition tables dropped');
        
    } catch (error) {
        console.error('Error rolling back face recognition tables migration:', error);
        throw error;
    }
}

module.exports = { up, down };