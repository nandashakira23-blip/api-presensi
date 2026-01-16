const db = require('../config/database');

async function checkNIK() {
    try {
        const nik = '1111111111111111';
        console.log(`Checking NIK: ${nik}\n`);
        
        const query = `
            SELECT k.*, 
                   j.nama_jabatan,
                   jk.nama as jadwal_kerja,
                   (SELECT COUNT(*) FROM karyawan_face_reference 
                    WHERE id_karyawan = k.id AND is_active = TRUE) as face_ref_count
            FROM karyawan k
            LEFT JOIN jabatan j ON k.id_jabatan = j.id
            LEFT JOIN jadwal_kerja jk ON k.work_schedule_id = jk.id
            WHERE k.nik = ?
        `;
        
        const results = await db.query(query, [nik]);
        
        if (results.length === 0) {
            console.log('❌ NIK NOT FOUND in database!');
            console.log('\nSearching for similar NIKs...');
            
            const similarQuery = 'SELECT nik, nama FROM karyawan WHERE nik LIKE ? LIMIT 10';
            const similar = await db.query(similarQuery, [`%${nik.substring(0, 8)}%`]);
            
            if (similar.length > 0) {
                console.log('\nSimilar NIKs found:');
                similar.forEach(emp => {
                    console.log(`  - ${emp.nik}: ${emp.nama}`);
                });
            }
        } else {
            const emp = results[0];
            console.log('✅ NIK FOUND!\n');
            console.log('=== EMPLOYEE DETAILS ===');
            console.log(`ID: ${emp.id}`);
            console.log(`NIK: ${emp.nik}`);
            console.log(`Nama: ${emp.nama}`);
            console.log(`Email: ${emp.email || 'N/A'}`);
            console.log(`Phone: ${emp.phone || 'N/A'}`);
            console.log(`Jabatan: ${emp.nama_jabatan || 'N/A'}`);
            console.log(`Jadwal Kerja: ${emp.jadwal_kerja || 'N/A'}`);
            console.log(`Is Activated: ${emp.is_activated ? 'YES' : 'NO'}`);
            console.log(`PIN: ${emp.pin ? 'SET' : 'NOT SET'}`);
            console.log(`Foto Referensi: ${emp.foto_referensi || 'N/A'}`);
            console.log(`Profile Picture: ${emp.profile_picture || 'N/A'}`);
            console.log(`Face References: ${emp.face_ref_count} record(s)`);
            console.log(`Created: ${emp.created_at}`);
            console.log(`Updated: ${emp.updated_at}`);
            
            // Check face reference details
            if (emp.face_ref_count > 0) {
                console.log('\n=== FACE REFERENCE DETAILS ===');
                const faceQuery = `
                    SELECT id, photo_path, enrollment_date, quality_score, is_active
                    FROM karyawan_face_reference
                    WHERE id_karyawan = ?
                    ORDER BY enrollment_date DESC
                `;
                const faceRefs = await db.query(faceQuery, [emp.id]);
                
                faceRefs.forEach((ref, index) => {
                    console.log(`\nReference ${index + 1}:`);
                    console.log(`  ID: ${ref.id}`);
                    console.log(`  Photo Path: ${ref.photo_path}`);
                    console.log(`  Enrollment Date: ${ref.enrollment_date}`);
                    console.log(`  Quality Score: ${ref.quality_score || 'N/A'}`);
                    console.log(`  Is Active: ${ref.is_active ? 'YES' : 'NO'}`);
                });
            }
            
            // Check recent attendance
            console.log('\n=== RECENT ATTENDANCE (Last 5) ===');
            const attendanceQuery = `
                SELECT tanggal, jam_masuk, jam_keluar, status
                FROM presensi
                WHERE id_karyawan = ?
                ORDER BY tanggal DESC, jam_masuk DESC
                LIMIT 5
            `;
            const attendance = await db.query(attendanceQuery, [emp.id]);
            
            if (attendance.length > 0) {
                attendance.forEach((att, index) => {
                    console.log(`${index + 1}. ${att.tanggal.toISOString().split('T')[0]} - In: ${att.jam_masuk || 'N/A'}, Out: ${att.jam_keluar || 'N/A'}, Status: ${att.status}`);
                });
            } else {
                console.log('No attendance records found.');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkNIK();
