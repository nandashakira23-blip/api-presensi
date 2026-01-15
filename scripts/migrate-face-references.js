const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { detectFaces } = require('../utils/face-recognition');
require('dotenv').config();

async function migrateFaceReferences() {
    console.log('Starting face reference migration...\n');
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('Connected to database\n');

        // Get all karyawan with foto_referensi but no face reference
        const [karyawan] = await connection.execute(`
            SELECT k.id, k.nik, k.nama, k.foto_referensi
            FROM karyawan k
            LEFT JOIN karyawan_face_reference fr ON k.id = fr.karyawan_id AND fr.is_active = TRUE
            WHERE k.foto_referensi IS NOT NULL AND fr.id IS NULL
        `);

        if (karyawan.length === 0) {
            console.log('No karyawan found that need face reference migration');
            return;
        }

        console.log(`Found ${karyawan.length} karyawan with photos but no face reference:\n`);

        let successCount = 0;
        let failCount = 0;

        for (const k of karyawan) {
            console.log(`Processing: ${k.nik} - ${k.nama}`);
            
            // Construct full path
            const photoPath = path.join(__dirname, '..', 'uploads', 'faces', k.foto_referensi);
            
            // Check if file exists
            if (!fs.existsSync(photoPath)) {
                console.log(`  Photo file not found: ${photoPath}\n`);
                failCount++;
                continue;
            }

            try {
                // Detect faces
                console.log(`  Detecting faces...`);
                const faces = await detectFaces(photoPath);
                
                if (faces.length === 0) {
                    console.log(`  No faces detected in photo\n`);
                    failCount++;
                    continue;
                }

                console.log(`  Detected ${faces.length} face(s)`);

                // Save to karyawan_face_reference
                await connection.execute(`
                    INSERT INTO karyawan_face_reference 
                    (karyawan_id, filename, original_name, file_path, faces_data, faces_count, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, TRUE)
                `, [
                    k.id,
                    k.foto_referensi,
                    k.foto_referensi,
                    photoPath,
                    JSON.stringify(faces),
                    faces.length
                ]);

                console.log(`  Face reference saved to database\n`);
                successCount++;

            } catch (error) {
                console.log(`  Error processing: ${error.message}\n`);
                failCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Migration Summary:');
        console.log(`   Success: ${successCount}`);
        console.log(`   Failed: ${failCount}`);
        console.log(`   Total: ${karyawan.length}`);
        console.log('='.repeat(60) + '\n');

        if (successCount > 0) {
            console.log('Face reference migration completed!');
            console.log('   Karyawan with migrated photos can now activate with PIN only.\n');
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration
migrateFaceReferences();
