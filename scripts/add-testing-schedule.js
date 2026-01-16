/**
 * Script untuk menambahkan jadwal testing
 * Clock in dan out bisa dilakukan dalam waktu berdekatan
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function addTestingSchedule() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('✓ Connected to database\n');

        // Get current time
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Set clock in window: current time - 5 minutes to current time + 30 minutes
        const clockInStart = new Date(now.getTime() - 5 * 60000);
        const clockInEnd = new Date(now.getTime() + 30 * 60000);
        
        // Set clock out window: current time + 2 minutes to current time + 60 minutes
        const clockOutStart = new Date(now.getTime() + 2 * 60000);
        const clockOutEnd = new Date(now.getTime() + 60 * 60000);
        
        // Format times
        const formatTime = (date) => {
            const h = date.getHours().toString().padStart(2, '0');
            const m = date.getMinutes().toString().padStart(2, '0');
            return `${h}:${m}:00`;
        };
        
        const jamMasuk = formatTime(clockInStart);
        const jamKeluar = formatTime(clockOutEnd);
        const batasAbsenMasukAwal = formatTime(clockInStart);
        const batasAbsenMasukAkhir = formatTime(clockInEnd);
        const batasAbsenKeluarAwal = formatTime(clockOutStart);
        const batasAbsenKeluarAkhir = formatTime(clockOutEnd);
        
        console.log('=== TESTING SCHEDULE ===');
        console.log('Current Time:', formatTime(now));
        console.log('');
        console.log('Jam Kerja:', jamMasuk, '-', jamKeluar);
        console.log('Clock In Window:', batasAbsenMasukAwal, '-', batasAbsenMasukAkhir);
        console.log('Clock Out Window:', batasAbsenKeluarAwal, '-', batasAbsenKeluarAkhir);
        console.log('');
        
        // Get today's day name
        const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        const workDays = JSON.stringify([todayName]); // Only today
        
        console.log('Work Days:', todayName);
        console.log('');

        // Check if testing schedule already exists
        const [existing] = await connection.execute(
            "SELECT id FROM jadwal_kerja WHERE nama = 'Testing Shift - Quick Test'"
        );

        if (existing.length > 0) {
            // Update existing
            console.log('Updating existing testing schedule...');
            await connection.execute(`
                UPDATE jadwal_kerja 
                SET jam_masuk = ?,
                    jam_keluar = ?,
                    batas_absen_masuk_awal = ?,
                    batas_absen_masuk_akhir = ?,
                    batas_absen_keluar_awal = ?,
                    batas_absen_keluar_akhir = ?,
                    hari_kerja = ?,
                    is_active = TRUE
                WHERE nama = 'Testing Shift - Quick Test'
            `, [
                jamMasuk,
                jamKeluar,
                batasAbsenMasukAwal,
                batasAbsenMasukAkhir,
                batasAbsenKeluarAwal,
                batasAbsenKeluarAkhir,
                workDays
            ]);
            console.log('✅ Testing schedule updated!');
        } else {
            // Insert new
            console.log('Creating new testing schedule...');
            await connection.execute(`
                INSERT INTO jadwal_kerja (
                    nama, jam_masuk, jam_keluar,
                    batas_absen_masuk_awal, batas_absen_masuk_akhir,
                    batas_absen_keluar_awal, batas_absen_keluar_akhir,
                    hari_kerja, toleransi_terlambat, durasi_istirahat, batas_lembur, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'Testing Shift - Quick Test',
                jamMasuk,
                jamKeluar,
                batasAbsenMasukAwal,
                batasAbsenMasukAkhir,
                batasAbsenKeluarAwal,
                batasAbsenKeluarAkhir,
                workDays,
                15, // toleransi_terlambat
                0,  // durasi_istirahat (no break for quick test)
                60, // batas_lembur
                true // is_active
            ]);
            console.log('✅ Testing schedule created!');
        }

        // Get the schedule ID
        const [schedule] = await connection.execute(
            "SELECT id FROM jadwal_kerja WHERE nama = 'Testing Shift - Quick Test'"
        );
        const scheduleId = schedule[0].id;

        console.log('');
        console.log('=== NEXT STEPS ===');
        console.log('1. Assign this schedule to your employee:');
        console.log(`   UPDATE karyawan SET work_schedule_id = ${scheduleId} WHERE nik = 'YOUR_NIK';`);
        console.log('');
        console.log('2. Or use the web admin to assign the schedule');
        console.log('');
        console.log('3. You can now:');
        console.log(`   - Clock IN between ${batasAbsenMasukAwal} - ${batasAbsenMasukAkhir}`);
        console.log(`   - Clock OUT between ${batasAbsenKeluarAwal} - ${batasAbsenKeluarAkhir}`);
        console.log('');
        console.log('⚠️  This schedule is valid for TODAY only!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✓ Database connection closed');
        }
    }
}

addTestingSchedule();
