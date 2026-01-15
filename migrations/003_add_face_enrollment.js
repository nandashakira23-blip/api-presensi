/**
 * Migration 003: Tambah Kolom Face Enrollment
 * 
 * Menambahkan kolom untuk menyimpan data pendaftaran wajah karyawan.
 * Data disimpan dalam format JSON berisi descriptor wajah.
 */

const mysql = require('mysql2/promise');

// Menambahkan kolom face_enrollment_data ke tabel karyawan
async function up(connection) {
    console.log('Running migration: Add face enrollment data column...');
    
    try {
        // Kolom JSON untuk menyimpan descriptor wajah
        await connection.execute(`
            ALTER TABLE karyawan 
            ADD COLUMN face_enrollment_data JSON DEFAULT NULL
        `);
        
        console.log('Successfully added face_enrollment_data column');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column face_enrollment_data already exists, skipping...');
        } else {
            console.error('Migration failed:', error.message);
            throw error;
        }
    }
}

// Fungsi DOWN: Menghapus kolom (rollback)
async function down(connection) {
    console.log('Rolling back migration: Remove face enrollment data column...');
    
    try {
        await connection.execute(`
            ALTER TABLE karyawan 
            DROP COLUMN IF EXISTS face_enrollment_data
        `);
        
        console.log('Successfully removed face_enrollment_data column');
    } catch (error) {
        console.error('Rollback failed:', error.message);
        throw error;
    }
}

module.exports = { up, down };