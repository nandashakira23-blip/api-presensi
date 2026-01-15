/**
 * Script untuk memperbaiki path foto di database
 * Menambahkan prefix 'uploads/karyawan/' atau 'uploads/profiles/' ke foto yang belum punya path lengkap
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPhotoPaths() {
    console.log('Starting photo path fix...');
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('Connected to database');

        // Fix foto_referensi in karyawan table
        console.log('\nFixing foto_referensi in karyawan table...');
        const [karyawan] = await connection.execute(`
            SELECT id, foto_referensi 
            FROM karyawan 
            WHERE foto_referensi IS NOT NULL 
            AND foto_referensi NOT LIKE 'uploads/%'
        `);

        console.log(`Found ${karyawan.length} records to fix`);

        for (const k of karyawan) {
            const newPath = `uploads/karyawan/${k.foto_referensi}`;
            await connection.execute(
                'UPDATE karyawan SET foto_referensi = ? WHERE id = ?',
                [newPath, k.id]
            );
            console.log(`  Updated karyawan ${k.id}: ${k.foto_referensi} -> ${newPath}`);
        }

        // Fix profile_picture in karyawan table
        console.log('\nFixing profile_picture in karyawan table...');
        const [profiles] = await connection.execute(`
            SELECT id, profile_picture 
            FROM karyawan 
            WHERE profile_picture IS NOT NULL 
            AND profile_picture NOT LIKE 'uploads/%'
        `);

        console.log(`Found ${profiles.length} records to fix`);

        for (const p of profiles) {
            const newPath = `uploads/profiles/${p.profile_picture}`;
            await connection.execute(
                'UPDATE karyawan SET profile_picture = ? WHERE id = ?',
                [newPath, p.id]
            );
            console.log(`  Updated profile ${p.id}: ${p.profile_picture} -> ${newPath}`);
        }

        // Fix foto_checkin in presensi table
        console.log('\nFixing foto_checkin in presensi table...');
        const [presensi] = await connection.execute(`
            SELECT id, foto_checkin 
            FROM presensi 
            WHERE foto_checkin IS NOT NULL 
            AND foto_checkin NOT LIKE 'uploads/%'
        `);

        console.log(`Found ${presensi.length} records to fix`);

        for (const p of presensi) {
            const newPath = `uploads/karyawan/${p.foto_checkin}`;
            await connection.execute(
                'UPDATE presensi SET foto_checkin = ? WHERE id = ?',
                [newPath, p.id]
            );
            console.log(`  Updated presensi ${p.id}: ${p.foto_checkin} -> ${newPath}`);
        }

        console.log('\n✅ Photo paths fixed successfully!');
        console.log('');
        console.log('Summary:');
        console.log(`  - Karyawan foto_referensi: ${karyawan.length} updated`);
        console.log(`  - Karyawan profile_picture: ${profiles.length} updated`);
        console.log(`  - Presensi foto_checkin: ${presensi.length} updated`);

    } catch (error) {
        console.error('Error fixing photo paths:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixPhotoPaths();
