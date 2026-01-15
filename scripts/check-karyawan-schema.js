const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkKaryawanSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'attendance_db'
  });

  try {
    console.log('Checking karyawan table schema...\n');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'karyawan'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'attendance_db']);

    console.log('Karyawan table columns:');
    console.log('='.repeat(100));
    columns.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(30)} | ${col.COLUMN_TYPE.padEnd(30)} | Nullable: ${col.IS_NULLABLE}`);
    });
    console.log('='.repeat(100));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkKaryawanSchema();
