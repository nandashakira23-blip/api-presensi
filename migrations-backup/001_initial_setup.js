/**
 * Migration 001: Setup Awal Database
 * 
 * Membuat tabel-tabel dasar untuk sistem presensi:
 * - pengaturan: Konfigurasi lokasi kantor dan radius
 * - jabatan: Daftar posisi/jabatan karyawan
 * - karyawan: Data karyawan
 * - presensi: Catatan absensi
 * - admin: Akun administrator
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Fungsi UP: Membuat semua tabel
async function up() {
    // Koneksi ke database MySQL
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Tabel pengaturan: Konfigurasi lokasi kantor
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pengaturan (
                id INT PRIMARY KEY AUTO_INCREMENT,
                lat_kantor DECIMAL(10, 8) NOT NULL DEFAULT -6.200000,
                long_kantor DECIMAL(11, 8) NOT NULL DEFAULT 106.816666,
                radius_meter INT NOT NULL DEFAULT 100,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Tabel jabatan: Daftar posisi karyawan
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS jabatan (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nama_jabatan VARCHAR(50) UNIQUE NOT NULL,
                deskripsi TEXT DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Tabel karyawan: Data pegawai
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS karyawan (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nik VARCHAR(20) UNIQUE NOT NULL,
                nama VARCHAR(100) NOT NULL,
                id_jabatan INT NOT NULL,
                password VARCHAR(255) DEFAULT NULL,
                is_activated BOOLEAN DEFAULT FALSE,
                foto_referensi TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_jabatan) REFERENCES jabatan(id)
            )
        `);

        // Tabel presensi: Catatan absensi harian
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS presensi (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_karyawan INT NOT NULL,
                waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                lat_absen DECIMAL(10, 8) NOT NULL,
                long_absen DECIMAL(11, 8) NOT NULL,
                foto_checkin TEXT NOT NULL,
                status_lokasi ENUM('Dalam Area', 'Luar Area') NOT NULL,
                jarak_meter FLOAT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_karyawan) REFERENCES karyawan(id) ON DELETE CASCADE
            )
        `);

        // Tabel admin: Akun administrator web
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Tables created successfully');
        return true;
    } catch (error) {
        console.error('Migration failed:', error);
        return false;
    } finally {
        await connection.end();
    }
}

// Fungsi DOWN: Menghapus semua tabel (rollback)
async function down() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Hapus tabel secara terbalik (karena ada foreign key)
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('DROP TABLE IF EXISTS presensi');
        await connection.execute('DROP TABLE IF EXISTS karyawan');
        await connection.execute('DROP TABLE IF EXISTS jabatan');
        await connection.execute('DROP TABLE IF EXISTS admin');
        await connection.execute('DROP TABLE IF EXISTS pengaturan');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Tables dropped successfully');
        return true;
    } catch (error) {
        console.error('Rollback failed:', error);
        return false;
    } finally {
        await connection.end();
    }
}

module.exports = { up, down };