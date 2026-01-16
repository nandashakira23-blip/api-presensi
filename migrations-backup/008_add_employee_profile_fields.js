/**
 * Migration 008: Tambah Field Profil Karyawan
 * 
 * Menambahkan kolom tambahan untuk profil karyawan:
 * - email: Alamat email karyawan
 * - phone: Nomor telepon
 * - profile_picture: URL/path foto profil
 */

const mysql = require('mysql2/promise');

// Menambahkan kolom profil ke tabel karyawan
async function up(connection) {
  console.log('Running migration: Add employee profile fields...');

  try {
    // Kolom email
    await connection.execute(`
      ALTER TABLE karyawan 
      ADD COLUMN email VARCHAR(100) NULL AFTER nama
    `);
    console.log('Email column added');

    // Kolom nomor telepon
    await connection.execute(`
      ALTER TABLE karyawan 
      ADD COLUMN phone VARCHAR(20) NULL AFTER email
    `);
    console.log('Phone column added');

    // Kolom foto profil
    await connection.execute(`
      ALTER TABLE karyawan 
      ADD COLUMN profile_picture TEXT NULL AFTER phone
    `);
    console.log('Profile picture column added');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Profile columns already exist, skipping...');
    } else {
      console.error('Error adding profile fields:', error.message);
      throw error;
    }
  }
}

// Fungsi DOWN: Menghapus kolom profil (rollback)
async function down(connection) {
  console.log('Rolling back migration: Remove employee profile fields...');

  try {
    // Hapus kolom profile_picture
    await connection.execute(`
      ALTER TABLE karyawan 
      DROP COLUMN IF EXISTS profile_picture
    `);

    // Hapus kolom phone
    await connection.execute(`
      ALTER TABLE karyawan 
      DROP COLUMN IF EXISTS phone
    `);

    // Hapus kolom email
    await connection.execute(`
      ALTER TABLE karyawan 
      DROP COLUMN IF EXISTS email
    `);

    console.log('Profile fields rollback completed');

  } catch (error) {
    console.error('Profile fields rollback failed:', error.message);
    throw error;
  }
}

module.exports = { up, down };
