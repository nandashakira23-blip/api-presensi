/**
 * Migration: Create Work Schedule Tables
 * File: 002_create_work_schedule_tables.js
 * Purpose: Membuat tabel jadwal kerja dan shift
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Create Work Schedule Tables');
    
    try {
        // 1. Create jadwal_kerja table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS jadwal_kerja (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                jam_masuk TIME NOT NULL,
                jam_keluar TIME NOT NULL,
                batas_absen_masuk_awal TIME,
                batas_absen_masuk_akhir TIME,
                batas_absen_keluar_awal TIME,
                batas_absen_keluar_akhir TIME,
                jam_istirahat_mulai TIME,
                jam_istirahat_selesai TIME,
                hari_kerja JSON NOT NULL,
                toleransi_terlambat INT DEFAULT 15,
                durasi_istirahat INT DEFAULT 60,
                batas_lembur INT DEFAULT 480,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Jadwal kerja table created');
        
        console.log('Migration completed: Create Work Schedule Tables');
        
    } catch (error) {
        console.error('Error in work schedule tables migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Create Work Schedule Tables');
    
    try {
        await connection.execute('DROP TABLE IF EXISTS jadwal_kerja');
        console.log('✓ Work schedule tables dropped');
        
    } catch (error) {
        console.error('Error rolling back work schedule tables migration:', error);
        throw error;
    }
}

module.exports = { up, down };