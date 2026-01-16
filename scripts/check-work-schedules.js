const db = require('../config/database');

async function checkWorkSchedules() {
    try {
        console.log('Checking work schedules in database...\n');
        
        // Check jadwal_kerja table
        const schedules = await db.query(`
            SELECT ws.*, 
                   COUNT(k.id) as employee_count
            FROM jadwal_kerja ws
            LEFT JOIN karyawan k ON ws.id = k.work_schedule_id
            GROUP BY ws.id
            ORDER BY ws.created_at DESC
        `);
        
        console.log(`Found ${schedules.length} work schedules:\n`);
        
        if (schedules.length > 0) {
            schedules.forEach((schedule, index) => {
                console.log(`${index + 1}. ${schedule.nama}`);
                console.log(`   ID: ${schedule.id}`);
                console.log(`   Jam: ${schedule.jam_masuk} - ${schedule.jam_keluar}`);
                console.log(`   Hari Kerja: ${schedule.hari_kerja}`);
                console.log(`   Status: ${schedule.is_active ? 'Aktif' : 'Nonaktif'}`);
                console.log(`   Karyawan: ${schedule.employee_count} orang`);
                console.log('');
            });
        } else {
            console.log('No work schedules found in database!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkWorkSchedules();
