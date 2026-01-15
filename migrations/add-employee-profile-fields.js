/**
 * Migration: Tambah Field Profil Karyawan
 * 
 * Menambahkan kolom tambahan untuk profil karyawan:
 * - email: Alamat email karyawan
 * - phone: Nomor telepon
 * - profile_picture: URL/path foto profil
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Menambahkan kolom profil ke tabel karyawan
async function addEmployeeProfileFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'attendance_db'
  });

  try {
    console.log('Adding employee profile fields...\n');

    // Kolom email
    console.log('Adding email column...');
    await connection.execute(`
      ALTER TABLE karyawan 
      ADD COLUMN email VARCHAR(100) NULL AFTER nama
    `);
    console.log('Email column added');

    // Kolom nomor telepon
    console.log('Adding phone column...');
    await connection.execute(`
      ALTER TABLE karyawan 
      ADD COLUMN phone VARCHAR(20) NULL AFTER email
    `);
    console.log('Phone column added');

    // Kolom foto profil
    console.log('Adding profile_picture column...');
    await connection.execute(`
      ALTER TABLE karyawan 
      ADD COLUMN profile_picture TEXT NULL AFTER phone
    `);
    console.log('Profile picture column added');

    console.log('\nMigration completed successfully!');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist, skipping...');
    } else {
      console.error('Migration failed:', error.message);
      throw error;
    }
  } finally {
    await connection.end();
  }
}

addEmployeeProfileFields();
