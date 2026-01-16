/**
 * Script to check employee schedule
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchedule() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'presensi_fleur_atelier'
        });
        
        console.log('✓ Connected to database\n');
        
        // Check employee with NIK 0000000000000000
        console.log('Checking employee with NIK 0000000000000000...');
        const [employees] = await connection.execute(
            'SELECT id, nik, nama, work_schedule_id FROM karyawan WHERE nik = ?',
            ['0000000000000000']
        );
        
        if (employees.length === 0) {
            console.log('Employee not found!');
            return;
        }
        
        const employee = employees[0];
        console.log('Employee found:');
        console.log(`  ID: ${employee.id}`);
        console.log(`  NIK: ${employee.nik}`);
        console.log(`  Nama: ${employee.nama}`);
        console.log(`  Work Schedule ID: ${employee.work_schedule_id}\n`);
        
        // Check work schedule
        if (employee.work_schedule_id) {
            const [schedules] = await connection.execute(
                'SELECT * FROM jadwal_kerja WHERE id = ?',
                [employee.work_schedule_id]
            );
            
            if (schedules.length > 0) {
                const schedule = schedules[0];
                console.log('Current Work Schedule:');
                console.log(`  ID: ${schedule.id}`);
                console.log(`  Nama: ${schedule.nama}`);
                console.log(`  Jam Masuk: ${schedule.jam_masuk}`);
                console.log(`  Jam Keluar: ${schedule.jam_keluar}`);
                console.log(`  Hari Kerja: ${schedule.hari_kerja}\n`);
            }
        }
        
        // Show all available schedules
        console.log('Available Work Schedules:');
        const [allSchedules] = await connection.execute(
            'SELECT id, nama, jam_masuk, jam_keluar FROM jadwal_kerja ORDER BY id'
        );
        
        allSchedules.forEach(s => {
            console.log(`  [${s.id}] ${s.nama}: ${s.jam_masuk} - ${s.jam_keluar}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkSchedule();
