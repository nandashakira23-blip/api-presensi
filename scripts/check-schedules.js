const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchedules() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Checking work schedules and shifts...\n');
    
    // Check jadwal_kerja table
    const [schedules] = await connection.execute('SELECT * FROM jadwal_kerja ORDER BY id');
    
    console.log('Available work schedules:');
    schedules.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.nama}`);
      console.log(`     Jam Kerja: ${schedule.jam_masuk} - ${schedule.jam_keluar}`);
      console.log(`     Clock In: ${schedule.batas_absen_masuk_awal} - ${schedule.batas_absen_masuk_akhir}`);
      console.log(`     Clock Out: ${schedule.batas_absen_keluar_awal} - ${schedule.batas_absen_keluar_akhir}`);
      console.log(`     Hari Kerja: ${schedule.hari_kerja}`);
      console.log(`     Status: ${schedule.is_active ? 'Active' : 'Inactive'}`);
      console.log('');
    });
    
    // Check employee assignments
    const [assignments] = await connection.execute(`
      SELECT k.nama, k.nik, jk.nama as jadwal_nama 
      FROM karyawan k 
      LEFT JOIN jadwal_kerja jk ON k.work_schedule_id = jk.id 
      ORDER BY k.id
    `);
    
    console.log('Employee schedule assignments:');
    assignments.forEach(emp => {
      console.log(`  ${emp.nama} (${emp.nik}): ${emp.jadwal_nama || 'No schedule assigned'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchedules();