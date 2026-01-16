/**
 * Check face reference data for employee
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFaceReference() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('=== CHECKING FACE REFERENCE ===\n');

    const employeeId = 10; // SHAKIRA
    console.log('Employee ID:', employeeId);

    // Check karyawan_face_reference table
    const [faceRefs] = await connection.execute(
      'SELECT * FROM karyawan_face_reference WHERE id_karyawan = ?',
      [employeeId]
    );

    console.log('\n--- FACE REFERENCE TABLE ---');
    if (faceRefs.length > 0) {
      console.log(`✅ Found ${faceRefs.length} face reference(s):`);
      faceRefs.forEach((ref, i) => {
        console.log(`\nReference ${i + 1}:`);
        console.log('  ID:', ref.id);
        console.log('  Photo Path:', ref.photo_path);
        console.log('  Is Active:', ref.is_active);
        console.log('  Enrollment Date:', ref.enrollment_date);
        console.log('  Has face_encoding:', !!ref.face_encoding);
        console.log('  Has faces_data:', !!ref.faces_data);
        
        if (ref.face_encoding) {
          console.log('  face_encoding type:', typeof ref.face_encoding);
          if (typeof ref.face_encoding === 'string') {
            try {
              const parsed = JSON.parse(ref.face_encoding);
              console.log('  face_encoding parsed length:', Array.isArray(parsed) ? parsed.length : 'not array');
            } catch (e) {
              console.log('  face_encoding parse error:', e.message);
            }
          }
        }
        
        if (ref.faces_data) {
          console.log('  faces_data type:', typeof ref.faces_data);
          if (typeof ref.faces_data === 'string') {
            try {
              const parsed = JSON.parse(ref.faces_data);
              console.log('  faces_data parsed length:', Array.isArray(parsed) ? parsed.length : 'not array');
            } catch (e) {
              console.log('  faces_data parse error:', e.message);
            }
          }
        }
      });
    } else {
      console.log('❌ No face reference found!');
      console.log('\nEmployee needs to complete face enrollment first.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkFaceReference();
