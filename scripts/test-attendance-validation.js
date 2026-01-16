/**
 * Script untuk test validasi attendance
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// Helper function dari api.js
function parseWorkDays(workDaysString) {
  if (!workDaysString) return [];
  
  if (Array.isArray(workDaysString)) {
    return workDaysString;
  }
  
  if (typeof workDaysString === 'object') {
    workDaysString = workDaysString.toString();
  }
  
  if (typeof workDaysString !== 'string') {
    return [];
  }
  
  try {
    return JSON.parse(workDaysString);
  } catch (e) {
    return workDaysString.split(',').map(day => day.trim()).filter(day => day);
  }
}

async function testValidation() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('✓ Connected to database\n');

        // Get all schedules
        const [schedules] = await connection.execute(
            'SELECT * FROM jadwal_kerja ORDER BY id'
        );

        const currentTime = new Date().toTimeString().split(' ')[0];
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        
        console.log('=== CURRENT TIME INFO ===');
        console.log('Current Time:', currentTime);
        console.log('Today:', todayName);
        console.log('');

        console.log('=== SCHEDULE VALIDATION ===\n');

        for (const schedule of schedules) {
            console.log(`📋 ${schedule.nama}`);
            console.log(`   ID: ${schedule.id}`);
            console.log(`   Jam Kerja: ${schedule.jam_masuk} - ${schedule.jam_keluar}`);
            console.log(`   Clock In Window: ${schedule.batas_absen_masuk_awal} - ${schedule.batas_absen_masuk_akhir}`);
            console.log(`   Clock Out Window: ${schedule.batas_absen_keluar_awal} - ${schedule.batas_absen_keluar_akhir}`);
            
            // Parse work days
            const workDays = parseWorkDays(schedule.hari_kerja);
            console.log(`   Work Days (raw): ${schedule.hari_kerja}`);
            console.log(`   Work Days (parsed): [${workDays.join(', ')}]`);
            
            // Check if today is work day
            const isWorkDay = workDays.some(day => day.toLowerCase() === todayName.toLowerCase());
            console.log(`   Is Today Work Day? ${isWorkDay ? '✅ YES' : '❌ NO'}`);
            
            if (isWorkDay) {
                // Check clock in time
                const canClockInTime = currentTime >= schedule.batas_absen_masuk_awal && 
                                      currentTime <= schedule.batas_absen_masuk_akhir;
                console.log(`   Can Clock In Now? ${canClockInTime ? '✅ YES' : '❌ NO'}`);
                if (!canClockInTime) {
                    console.log(`      (Current: ${currentTime}, Window: ${schedule.batas_absen_masuk_awal} - ${schedule.batas_absen_masuk_akhir})`);
                }
                
                // Check clock out time
                const canClockOutTime = currentTime >= schedule.batas_absen_keluar_awal && 
                                       currentTime <= schedule.batas_absen_keluar_akhir;
                console.log(`   Can Clock Out Now? ${canClockOutTime ? '✅ YES' : '❌ NO'}`);
                if (!canClockOutTime) {
                    console.log(`      (Current: ${currentTime}, Window: ${schedule.batas_absen_keluar_awal} - ${schedule.batas_absen_keluar_akhir})`);
                }
            }
            
            console.log('');
        }

        // Test with specific employee
        console.log('=== EMPLOYEE TEST ===\n');
        const [employees] = await connection.execute(`
            SELECT k.id, k.nik, k.nama, k.work_schedule_id, jk.nama as schedule_name
            FROM karyawan k
            LEFT JOIN jadwal_kerja jk ON k.work_schedule_id = jk.id
            WHERE k.work_schedule_id IS NOT NULL
            LIMIT 5
        `);

        for (const emp of employees) {
            console.log(`👤 ${emp.nama} (${emp.nik})`);
            console.log(`   Schedule: ${emp.schedule_name || 'None'}`);
            
            if (emp.work_schedule_id) {
                const schedule = schedules.find(s => s.id === emp.work_schedule_id);
                if (schedule) {
                    const workDays = parseWorkDays(schedule.hari_kerja);
                    const isWorkDay = workDays.some(day => day.toLowerCase() === todayName.toLowerCase());
                    
                    if (!isWorkDay) {
                        console.log(`   ❌ Today is NOT a work day for this employee`);
                    } else {
                        const canClockIn = currentTime >= schedule.batas_absen_masuk_awal && 
                                          currentTime <= schedule.batas_absen_masuk_akhir;
                        const canClockOut = currentTime >= schedule.batas_absen_keluar_awal && 
                                           currentTime <= schedule.batas_absen_keluar_akhir;
                        
                        console.log(`   ✅ Today IS a work day`);
                        console.log(`   Clock In: ${canClockIn ? '✅ Allowed' : '❌ Not allowed'}`);
                        console.log(`   Clock Out: ${canClockOut ? '✅ Allowed' : '❌ Not allowed'}`);
                    }
                }
            }
            console.log('');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testValidation();
