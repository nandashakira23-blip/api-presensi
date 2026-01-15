require('dotenv').config();
const mysql = require('mysql2/promise');

async function testInsert() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Testing presensi insert...\n');
    
    // Test data
    const testData = {
      id_karyawan: 21, // From the error log
      attendance_type: 'clock_in',
      lat_absen: -8.4000232,
      long_absen: 115.5430156,
      foto_checkin: 'test-photo.jpg',
      status_lokasi: 'Dalam Area',
      jarak_meter: 50.5,
      face_recognition_id: null, // This might be the issue
      similarity_score: 0.85,
      is_late: false,
      work_schedule_id: null
    };

    console.log('Test data:', testData);
    
    // Try to insert
    try {
      const [result] = await connection.execute(`
        INSERT INTO presensi 
        (id_karyawan, attendance_type, lat_absen, long_absen, foto_checkin, status_lokasi, jarak_meter, face_recognition_id, similarity_score, is_late, work_schedule_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testData.id_karyawan,
        testData.attendance_type,
        testData.lat_absen,
        testData.long_absen,
        testData.foto_checkin,
        testData.status_lokasi,
        testData.jarak_meter,
        testData.face_recognition_id,
        testData.similarity_score,
        testData.is_late,
        testData.work_schedule_id
      ]);
      
      console.log('\nInsert successful!');
      console.log('Insert ID:', result.insertId);
      
      // Clean up test record
      await connection.execute('DELETE FROM presensi WHERE id = ?', [result.insertId]);
      console.log('Test record cleaned up');
      
    } catch (insertError) {
      console.error('\nInsert failed!');
      console.error('Error code:', insertError.code);
      console.error('SQL Message:', insertError.sqlMessage);
      console.error('SQL State:', insertError.sqlState);
      console.error('Error number:', insertError.errno);
    }

    // Check if employee exists
    const [employee] = await connection.execute(
      'SELECT id, nik, nama, is_activated FROM karyawan WHERE id = ?',
      [testData.id_karyawan]
    );
    
    if (employee.length === 0) {
      console.log('\nEmployee ID 21 does not exist!');
    } else {
      console.log('\nEmployee found:', employee[0]);
    }

    // Check if employee has face reference
    const [faceRef] = await connection.execute(
      'SELECT id, karyawan_id, is_active FROM karyawan_face_reference WHERE karyawan_id = ? AND is_active = TRUE',
      [testData.id_karyawan]
    );
    
    if (faceRef.length === 0) {
      console.log('No active face reference found for employee 21');
    } else {
      console.log('Face reference found:', faceRef[0]);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testInsert();
