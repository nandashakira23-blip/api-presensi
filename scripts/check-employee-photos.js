const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function checkEmployeePhotos() {
    try {
        console.log('Checking employee photos...\n');
        
        const query = `
            SELECT k.id, k.nik, k.nama, 
                   k.foto_referensi, 
                   k.profile_picture,
                   (SELECT photo_path FROM karyawan_face_reference 
                    WHERE id_karyawan = k.id AND is_active = TRUE 
                    ORDER BY enrollment_date DESC LIMIT 1) as trained_photo
            FROM karyawan k
            ORDER BY k.id
        `;
        
        const employees = await db.query(query);
        
        console.log(`Found ${employees.length} employees:\n`);
        
        employees.forEach((emp, index) => {
            console.log(`${index + 1}. ${emp.nama} (NIK: ${emp.nik})`);
            console.log(`   ID: ${emp.id}`);
            
            // Check trained photo
            if (emp.trained_photo) {
                console.log(`   ✓ Trained Photo: ${emp.trained_photo}`);
                const trainedPath = path.join(__dirname, '..', emp.trained_photo);
                if (fs.existsSync(trainedPath)) {
                    console.log(`     [EXISTS] File found at: ${trainedPath}`);
                } else {
                    console.log(`     [MISSING] File NOT found at: ${trainedPath}`);
                }
            } else {
                console.log(`   ✗ Trained Photo: NONE`);
            }
            
            // Check foto referensi
            if (emp.foto_referensi) {
                console.log(`   ✓ Foto Referensi: ${emp.foto_referensi}`);
                const refPath = path.join(__dirname, '..', emp.foto_referensi);
                if (fs.existsSync(refPath)) {
                    console.log(`     [EXISTS] File found at: ${refPath}`);
                } else {
                    console.log(`     [MISSING] File NOT found at: ${refPath}`);
                }
            } else {
                console.log(`   ✗ Foto Referensi: NONE`);
            }
            
            // Check profile picture
            if (emp.profile_picture) {
                console.log(`   ✓ Profile Picture: ${emp.profile_picture}`);
                const profilePath = path.join(__dirname, '..', emp.profile_picture);
                if (fs.existsSync(profilePath)) {
                    console.log(`     [EXISTS] File found at: ${profilePath}`);
                } else {
                    console.log(`     [MISSING] File NOT found at: ${profilePath}`);
                }
            } else {
                console.log(`   ✗ Profile Picture: NONE`);
            }
            
            console.log('');
        });
        
        // Summary
        const withTrainedPhoto = employees.filter(e => e.trained_photo).length;
        const withFotoReferensi = employees.filter(e => e.foto_referensi).length;
        const withProfilePicture = employees.filter(e => e.profile_picture).length;
        const withNoPhoto = employees.filter(e => !e.trained_photo && !e.foto_referensi && !e.profile_picture).length;
        
        console.log('=== SUMMARY ===');
        console.log(`Total Employees: ${employees.length}`);
        console.log(`With Trained Photo: ${withTrainedPhoto}`);
        console.log(`With Foto Referensi: ${withFotoReferensi}`);
        console.log(`With Profile Picture: ${withProfilePicture}`);
        console.log(`With NO Photo: ${withNoPhoto}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkEmployeePhotos();
