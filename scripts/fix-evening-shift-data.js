/**
 * Script untuk memperbaiki data Evening Shift yang corrupt
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixEveningShift() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('✓ Connected to database\n');

        // Get current data
        const [current] = await connection.execute(
            'SELECT * FROM jadwal_kerja WHERE id = 3'
        );

        console.log('=== CURRENT DATA (CORRUPT) ===');
        console.log('Nama:', current[0].nama);
        console.log('Jam Masuk:', current[0].jam_masuk);
        console.log('Jam Keluar:', current[0].jam_keluar);
        console.log('Clock In Window:', current[0].batas_absen_masuk_awal, '-', current[0].batas_absen_masuk_akhir);
        console.log('Clock Out Window:', current[0].batas_absen_keluar_awal, '-', current[0].batas_absen_keluar_akhir);
        console.log('');

        // Fix data to match seed
        const correctData = {
            jam_masuk: '14:00:00',
            jam_keluar: '22:00:00',
            batas_absen_masuk_awal: '13:45:00',
            batas_absen_masuk_akhir: '14:15:00',
            batas_absen_keluar_awal: '21:45:00',
            batas_absen_keluar_akhir: '22:15:00'
        };

        console.log('=== CORRECT DATA (FROM SEED) ===');
        console.log('Nama: Evening Shift - Closing Crew');
        console.log('Jam Masuk:', correctData.jam_masuk);
        console.log('Jam Keluar:', correctData.jam_keluar);
        console.log('Clock In Window:', correctData.batas_absen_masuk_awal, '-', correctData.batas_absen_masuk_akhir);
        console.log('Clock Out Window:', correctData.batas_absen_keluar_awal, '-', correctData.batas_absen_keluar_akhir);
        console.log('');

        // Update
        await connection.execute(`
            UPDATE jadwal_kerja 
            SET jam_masuk = ?,
                jam_keluar = ?,
                batas_absen_masuk_awal = ?,
                batas_absen_masuk_akhir = ?,
                batas_absen_keluar_awal = ?,
                batas_absen_keluar_akhir = ?
            WHERE id = 3
        `, [
            correctData.jam_masuk,
            correctData.jam_keluar,
            correctData.batas_absen_masuk_awal,
            correctData.batas_absen_masuk_akhir,
            correctData.batas_absen_keluar_awal,
            correctData.batas_absen_keluar_akhir
        ]);

        console.log('✅ Evening Shift data has been fixed!');
        console.log('');

        // Verify
        const [updated] = await connection.execute(
            'SELECT * FROM jadwal_kerja WHERE id = 3'
        );

        console.log('=== VERIFIED DATA ===');
        console.log('Nama:', updated[0].nama);
        console.log('Jam Masuk:', updated[0].jam_masuk);
        console.log('Jam Keluar:', updated[0].jam_keluar);
        console.log('Clock In Window:', updated[0].batas_absen_masuk_awal, '-', updated[0].batas_absen_masuk_akhir);
        console.log('Clock Out Window:', updated[0].batas_absen_keluar_awal, '-', updated[0].batas_absen_keluar_akhir);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✓ Database connection closed');
        }
    }
}

fixEveningShift();
