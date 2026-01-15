/**
 * Migration 004: Sistem Keamanan PIN
 * 
 * Menambahkan fitur keamanan PIN untuk verifikasi tambahan:
 * - Kolom PIN di tabel karyawan (6 digit)
 * - Sistem penguncian setelah gagal berkali-kali
 * - Log aktivitas PIN untuk audit
 * - Pengaturan PIN di tabel pengaturan
 */

const mysql = require('mysql2/promise');

// Menambahkan sistem keamanan PIN
async function up(connection) {
    console.log('Running migration: Add PIN security...');

    try {
        // Kolom PIN di tabel karyawan
        await connection.execute(`
            ALTER TABLE karyawan 
            ADD COLUMN pin VARCHAR(6) DEFAULT NULL AFTER password,
            ADD COLUMN pin_attempts INT DEFAULT 0 AFTER pin,
            ADD COLUMN pin_locked_until TIMESTAMP NULL DEFAULT NULL AFTER pin_attempts
        `);
        console.log('PIN security columns added successfully');

        // Kolom verifikasi PIN di tabel presensi
        await connection.execute(`
            ALTER TABLE presensi 
            ADD COLUMN pin_verified BOOLEAN DEFAULT FALSE AFTER foto_checkin,
            ADD COLUMN verification_method ENUM('face_only', 'pin_only', 'face_and_pin') DEFAULT 'face_and_pin' AFTER pin_verified
        `);

        console.log('PIN verification columns added to presensi table');

        // Tabel log keamanan PIN untuk audit
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pin_security_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_karyawan INT NOT NULL,
                action ENUM('pin_set', 'pin_change', 'pin_verify_success', 'pin_verify_failed', 'pin_locked', 'pin_unlocked') NOT NULL,
                ip_address VARCHAR(45) DEFAULT NULL,
                user_agent TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE
            )
        `);

        console.log('PIN security log table created');

        // Pengaturan PIN di tabel pengaturan
        await connection.execute(`
            ALTER TABLE pengaturan 
            ADD COLUMN pin_required BOOLEAN DEFAULT TRUE AFTER radius_meter,
            ADD COLUMN pin_max_attempts INT DEFAULT 3 AFTER pin_required,
            ADD COLUMN pin_lockout_minutes INT DEFAULT 30 AFTER pin_max_attempts,
            ADD COLUMN face_and_pin_required BOOLEAN DEFAULT TRUE AFTER pin_lockout_minutes
        `);

        console.log('PIN settings added to pengaturan table');

        // Set nilai default pengaturan PIN
        await connection.execute(`
            UPDATE pengaturan 
            SET pin_required = TRUE, 
                pin_max_attempts = 3, 
                pin_lockout_minutes = 30,
                face_and_pin_required = TRUE
            WHERE id = 1
        `);

        console.log('Default PIN security settings configured');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('PIN security columns already exist, skipping...');
        } else {
            console.error('Error adding PIN security:', error.message);
            throw error;
        }
    }
}

// Fungsi DOWN: Menghapus fitur PIN (rollback)
async function down(connection) {
    console.log('Rolling back migration: Remove PIN security...');

    try {
        // Hapus tabel log PIN
        await connection.execute('DROP TABLE IF EXISTS pin_security_log');

        // Remove PIN columns from pengaturan table
        await connection.execute(`
            ALTER TABLE pengaturan 
            DROP COLUMN IF EXISTS pin_required,
            DROP COLUMN IF EXISTS pin_max_attempts,
            DROP COLUMN IF EXISTS pin_lockout_minutes,
            DROP COLUMN IF EXISTS face_and_pin_required
        `);

        // Remove PIN columns from presensi table
        await connection.execute(`
            ALTER TABLE presensi 
            DROP COLUMN IF EXISTS pin_verified,
            DROP COLUMN IF EXISTS verification_method
        `);

        // Remove PIN columns from karyawan table
        await connection.execute(`
            ALTER TABLE karyawan 
            DROP COLUMN IF EXISTS pin,
            DROP COLUMN IF EXISTS pin_attempts,
            DROP COLUMN IF EXISTS pin_locked_until
        `);

        console.log('PIN security rollback completed');

    } catch (error) {
        console.error('PIN security rollback failed:', error.message);
        throw error;
    }
}

module.exports = { up, down };