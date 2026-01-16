/**
 * Check if attendance data exists in database
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAttendance() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('=== CHECKING ATTENDANCE DATA ===\n');

    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);
    console.log('Employee ID: 10 (SHAKIRA)\n');

    // Check presensi table
    console.log('--- PRESENSI TABLE ---');
    const [presensi] = await connection.execute(
      'SELECT * FROM presensi WHERE id_karyawan = 10 AND tanggal = ?',
      [today]
    );

    if (presensi.length > 0) {
      console.log('✅ Found attendance record:');
      console.log(JSON.stringify(presensi[0], null, 2));
    } else {
      console.log('❌ No attendance record found for today');
    }

    // Check face log
    console.log('\n--- FACE LOG TABLE ---');
    const [faceLogs] = await connection.execute(
      'SELECT * FROM absensi_face_log WHERE id_karyawan = 10 ORDER BY timestamp DESC LIMIT 5'
    );

    if (faceLogs.length > 0) {
      console.log(`✅ Found ${faceLogs.length} face log(s):`);
      faceLogs.forEach((log, i) => {
        console.log(`\nLog ${i + 1}:`);
        console.log('  ID:', log.id);
        console.log('  Timestamp:', log.timestamp);
        console.log('  Similarity:', log.similarity_score);
        console.log('  Confidence:', log.confidence_level);
        console.log('  Status:', log.recognition_status);
      });
    } else {
      console.log('❌ No face logs found');
    }

    // Check all presensi for employee 10
    console.log('\n--- ALL ATTENDANCE RECORDS ---');
    const [allPresensi] = await connection.execute(
      'SELECT tanggal, jam_masuk, jam_keluar, status FROM presensi WHERE id_karyawan = 10 ORDER BY tanggal DESC LIMIT 10'
    );

    if (allPresensi.length > 0) {
      console.log(`Found ${allPresensi.length} record(s):`);
      allPresensi.forEach((p, i) => {
        console.log(`${i + 1}. ${p.tanggal} - In: ${p.jam_masuk || 'N/A'}, Out: ${p.jam_keluar || 'N/A'}, Status: ${p.status}`);
      });
    } else {
      console.log('❌ No attendance records found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAttendance();
