/**
 * Script untuk memperbaiki kolom PIN di database
 * Mengubah VARCHAR(6) menjadi VARCHAR(255) untuk bcrypt hash
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPinColumn() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('Connected to database');

    // Check current column definition
    const [columns] = await connection.execute(`
      SELECT COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'karyawan' 
      AND COLUMN_NAME = 'pin'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('Current PIN column:', columns[0]);
      
      const currentType = columns[0].COLUMN_TYPE;
      if (currentType === 'varchar(6)') {
        console.log('Fixing PIN column from VARCHAR(6) to VARCHAR(255)...');
        
        await connection.execute(`
          ALTER TABLE karyawan 
          MODIFY COLUMN pin VARCHAR(255) DEFAULT NULL
        `);
        
        console.log('PIN column fixed successfully!');
      } else if (currentType === 'varchar(255)') {
        console.log('PIN column already correct (VARCHAR(255))');
      } else {
        console.log('PIN column has unexpected type:', currentType);
      }
    } else {
      console.log('PIN column not found in karyawan table');
    }

  } catch (error) {
    console.error('Error fixing PIN column:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

fixPinColumn();
