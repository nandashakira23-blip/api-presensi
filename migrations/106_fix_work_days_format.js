/**
 * Migration: Fix Work Days Format
 * File: 106_fix_work_days_format.js
 * Purpose: Normalisasi format hari kerja ke PascalCase (Monday, Tuesday, dll)
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Fix Work Days Format');
    
    try {
        // Ambil semua jadwal kerja
        const [schedules] = await connection.execute(
            'SELECT id, nama, hari_kerja FROM jadwal_kerja'
        );

        console.log(`Found ${schedules.length} work schedules to check`);

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

        let updatedCount = 0;

        // Proses setiap jadwal
        for (const schedule of schedules) {
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

            // Update hanya jika ada perubahan
            if (jsonDays !== JSON.stringify(workDays)) {
                await connection.execute(
                    'UPDATE jadwal_kerja SET hari_kerja = ? WHERE id = ?',
                    [jsonDays, schedule.id]
                );
                updatedCount++;
                console.log(`✓ Updated: ${schedule.nama}`);
            }
        }

        console.log(`✓ Migration completed: ${updatedCount} schedules normalized`);
        
    } catch (error) {
        console.error('Error in fix work days format migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Fix Work Days Format');
    console.log('⚠ No rollback needed - data normalization is idempotent');
}

module.exports = { up, down };
