require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Checking presensi table schema...\n');
    
    // Get table structure
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'presensi'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Presensi table columns:');
    console.log('='.repeat(100));
    columns.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(30)} | ${col.COLUMN_TYPE.padEnd(30)} | Nullable: ${col.IS_NULLABLE}`);
    });
    console.log('='.repeat(100));

    // Check for recent errors
    console.log('\nChecking recent presensi records...');
    const [recentRecords] = await connection.execute(`
      SELECT id, id_karyawan, attendance_type, waktu, foto_checkin 
      FROM presensi 
      ORDER BY waktu DESC 
      LIMIT 5
    `);
    
    console.log('\nRecent records:');
    recentRecords.forEach(record => {
      console.log(`ID: ${record.id}, Employee: ${record.id_karyawan}, Type: ${record.attendance_type}, Photo: ${record.foto_checkin}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkSchema();
