/**
 * Migration: Seed Work Schedules
 * File: 103_seed_work_schedules.js
 * Purpose: Mengisi data jadwal kerja untuk FLEUR CAFÉ
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Seed Work Schedules');
    
    try {
        // Check if work schedules already exist
        const [schedulesExist] = await connection.execute(
            'SELECT COUNT(*) as count FROM jadwal_kerja'
        );
        
        if (schedulesExist[0].count === 0) {
            const workSchedules = [
                {
                    nama: 'Morning Shift - Opening Crew',
                    jam_masuk: '06:00:00',
                    jam_keluar: '14:00:00',
                    batas_absen_masuk_awal: '05:45:00',
                    batas_absen_masuk_akhir: '06:15:00',
                    batas_absen_keluar_awal: '13:45:00',
                    batas_absen_keluar_akhir: '14:15:00',
                    jam_istirahat_mulai: '09:00:00',
                    jam_istirahat_selesai: '10:00:00',
                    hari_kerja: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
                    toleransi_terlambat: 15,
                    durasi_istirahat: 60,
                    batas_lembur: 480
                },
                {
                    nama: 'Day Shift - Peak Hours',
                    jam_masuk: '09:00:00',
                    jam_keluar: '17:00:00',
                    batas_absen_masuk_awal: '08:45:00',
                    batas_absen_masuk_akhir: '09:15:00',
                    batas_absen_keluar_awal: '16:45:00',
                    batas_absen_keluar_akhir: '17:15:00',
                    jam_istirahat_mulai: '12:00:00',
                    jam_istirahat_selesai: '13:00:00',
                    hari_kerja: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
                    toleransi_terlambat: 15,
                    durasi_istirahat: 60,
                    batas_lembur: 480
                },
                {
                    nama: 'Evening Shift - Closing Crew',
                    jam_masuk: '14:00:00',
                    jam_keluar: '22:00:00',
                    batas_absen_masuk_awal: '13:45:00',
                    batas_absen_masuk_akhir: '14:15:00',
                    batas_absen_keluar_awal: '21:45:00',
                    batas_absen_keluar_akhir: '22:15:00',
                    jam_istirahat_mulai: '18:00:00',
                    jam_istirahat_selesai: '19:00:00',
                    hari_kerja: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
                    toleransi_terlambat: 15,
                    durasi_istirahat: 60,
                    batas_lembur: 480
                },
                {
                    nama: 'Weekend Shift - Full Day',
                    jam_masuk: '08:00:00',
                    jam_keluar: '20:00:00',
                    batas_absen_masuk_awal: '07:45:00',
                    batas_absen_masuk_akhir: '08:15:00',
                    batas_absen_keluar_awal: '19:45:00',
                    batas_absen_keluar_akhir: '20:15:00',
                    jam_istirahat_mulai: '14:00:00',
                    jam_istirahat_selesai: '15:30:00',
                    hari_kerja: JSON.stringify(['Saturday', 'Sunday']),
                    toleransi_terlambat: 15,
                    durasi_istirahat: 90,
                    batas_lembur: 720
                },
                {
                    nama: 'Holiday Shift - Special Hours',
                    jam_masuk: '10:00:00',
                    jam_keluar: '18:00:00',
                    batas_absen_masuk_awal: '09:45:00',
                    batas_absen_masuk_akhir: '10:15:00',
                    batas_absen_keluar_awal: '17:45:00',
                    batas_absen_keluar_akhir: '18:15:00',
                    jam_istirahat_mulai: '13:00:00',
                    jam_istirahat_selesai: '14:00:00',
                    hari_kerja: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
                    toleransi_terlambat: 15,
                    durasi_istirahat: 60,
                    batas_lembur: 480
                }
            ];
            
            for (const schedule of workSchedules) {
                await connection.execute(`
                    INSERT INTO jadwal_kerja (
                        nama, jam_masuk, jam_keluar, batas_absen_masuk_awal, batas_absen_masuk_akhir,
                        batas_absen_keluar_awal, batas_absen_keluar_akhir, jam_istirahat_mulai, jam_istirahat_selesai,
                        hari_kerja, toleransi_terlambat, durasi_istirahat, batas_lembur, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    schedule.nama, schedule.jam_masuk, schedule.jam_keluar,
                    schedule.batas_absen_masuk_awal, schedule.batas_absen_masuk_akhir,
                    schedule.batas_absen_keluar_awal, schedule.batas_absen_keluar_akhir,
                    schedule.jam_istirahat_mulai, schedule.jam_istirahat_selesai,
                    schedule.hari_kerja, schedule.toleransi_terlambat,
                    schedule.durasi_istirahat, schedule.batas_lembur, true
                ]);
            }
            
            console.log(`✓ ${workSchedules.length} work schedules created`);
        } else {
            console.log('✓ Work schedules already exist');
        }
        
        console.log('Migration completed: Seed Work Schedules');
        
    } catch (error) {
        console.error('Error in work schedules seeding:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Seed Work Schedules');
    
    try {
        await connection.execute('DELETE FROM jadwal_kerja');
        console.log('✓ Work schedules removed');
        
    } catch (error) {
        console.error('Error rolling back work schedules seeding:', error);
        throw error;
    }
}

module.exports = { up, down };