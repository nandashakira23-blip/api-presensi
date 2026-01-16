/**
 * Script untuk memperbaiki format hari kerja yang tidak konsisten
 * Mengubah semua format menjadi PascalCase (Monday, Tuesday, dll)
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixWorkDaysFormat() {
    let connection;
    
    try {
        // Koneksi ke database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('✓ Connected to database');

        // Ambil semua jadwal kerja
        const [schedules] = await connection.execute(
            'SELECT id, nama, hari_kerja FROM jadwal_kerja'
        );

        console.log(`\nFound ${schedules.length} work schedules\n`);

        // Mapping untuk normalisasi nama hari
        const dayNormalization = {
            'monday': 'Monday',
            'tuesday': 'Tuesday',
            'wednesday': 'Wednesday',
            'thursday': 'Thursday',
            'friday': 'Friday',
            'saturday': 'Saturday',
            'sunday': 'Sunday'
        };

        // Proses setiap jadwal
        for (const schedule of schedules) {
            console.log(`Processing: ${schedule.nama}`);
            console.log(`  Current: ${schedule.hari_kerja}`);

            let workDays = [];
            
            // Parse hari_kerja
            if (typeof schedule.hari_kerja === 'string') {
                try {
                    // Coba parse sebagai JSON
                    workDays = JSON.parse(schedule.hari_kerja);
                } catch (e) {
                    // Jika bukan JSON, split by comma
                    workDays = schedule.hari_kerja.split(',').map(d => d.trim());
                }
            } else if (Array.isArray(schedule.hari_kerja)) {
                workDays = schedule.hari_kerja;
            }

            // Normalisasi setiap hari ke PascalCase
            const normalizedDays = workDays.map(day => {
                const lowerDay = day.toLowerCase();
                return dayNormalization[lowerDay] || day;
            });

            // Convert ke JSON string untuk MySQL
            const jsonDays = JSON.stringify(normalizedDays);

            console.log(`  Fixed:   ${jsonDays}`);

            // Update database
            await connection.execute(
                'UPDATE jadwal_kerja SET hari_kerja = ? WHERE id = ?',
                [jsonDays, schedule.id]
            );

            console.log(`  ✓ Updated\n`);
        }

        console.log('✓ All work schedules have been normalized to PascalCase format');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✓ Database connection closed');
        }
    }
}

// Run the script
fixWorkDaysFormat();
