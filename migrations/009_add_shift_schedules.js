/**
 * Migration 009: Tambah Jadwal Shift Karyawan
 * 
 * Menambahkan 3 shift kerja:
 * - Morning Shift: 06:30 - 14:30 (2:30 PM)
 * - Middle Shift: 08:30 - 16:30 (4:30 PM)
 * - Evening Shift: 10:30 - 18:30 (6:30 PM)
 * 
 * Setiap shift memiliki:
 * - Window clock in: 30 menit sebelum sampai 30 menit setelah jam masuk
 * - Window clock out: 30 menit sebelum sampai 1 jam setelah jam keluar
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Add Shift Schedules');
    
    try {
        // Cek apakah shift sudah ada
        const [existingShifts] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM jadwal_kerja 
            WHERE nama IN ('Morning Shift', 'Middle Shift', 'Evening Shift')
        `);

        if (existingShifts[0].count > 0) {
            console.log('Shift schedules already exist, skipping insert');
            return;
        }

        // Insert 3 shift schedules
        await connection.execute(`
            INSERT INTO jadwal_kerja 
            (nama, jam_masuk, jam_keluar, batas_absen_masuk_awal, batas_absen_masuk_akhir, batas_absen_keluar_awal, batas_absen_keluar_akhir, hari_kerja, is_active) 
            VALUES 
            (
                'Morning Shift', 
                '06:30:00', 
                '14:30:00', 
                '06:00:00', 
                '07:00:00', 
                '14:00:00', 
                '15:30:00', 
                '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
                TRUE
            ),
            (
                'Middle Shift', 
                '08:30:00', 
                '16:30:00', 
                '08:00:00', 
                '09:00:00', 
                '16:00:00', 
                '17:30:00', 
                '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
                TRUE
            ),
            (
                'Evening Shift', 
                '10:30:00', 
                '18:30:00', 
                '10:00:00', 
                '11:00:00', 
                '18:00:00', 
                '19:30:00', 
                '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
                TRUE
            )
        `);

        console.log('Migration completed successfully!');
        console.log('Added 3 shift schedules:');
        console.log('   1. Morning Shift: 06:30 - 14:30');
        console.log('      Clock In: 06:00 - 07:00');
        console.log('      Clock Out: 14:00 - 15:30');
        console.log('');
        console.log('   2. Middle Shift: 08:30 - 16:30');
        console.log('      Clock In: 08:00 - 09:00');
        console.log('      Clock Out: 16:00 - 17:30');
        console.log('');
        console.log('   3. Evening Shift: 10:30 - 18:30');
        console.log('      Clock In: 10:00 - 11:00');
        console.log('      Clock Out: 18:00 - 19:30');
        console.log('');
        console.log('All shifts work 7 days a week');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back migration: Remove Shift Schedules');
    
    try {
        // Hapus shift schedules
        await connection.execute(`
            DELETE FROM jadwal_kerja 
            WHERE nama IN ('Morning Shift', 'Middle Shift', 'Evening Shift')
        `);
        
        console.log('Shift schedules removed successfully');
        
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };
