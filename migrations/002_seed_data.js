/**
 * Migration 002: Data Awal (Seed)
 * 
 * Mengisi data default untuk sistem:
 * - Pengaturan lokasi kantor default
 * - Daftar jabatan (Manager, Barista, Cashier, dll)
 * - Akun admin default (username: admin, password: admin123)
 * - Contoh data karyawan
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Fungsi UP: Mengisi data awal
async function up() {
    // Koneksi ke database
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Pengaturan lokasi kantor default (koordinat Bali)
        await connection.execute(`
            INSERT IGNORE INTO pengaturan (lat_kantor, long_kantor, radius_meter) 
            VALUES (-8.8155675, 115.1253343, 100)
        `);

        // Daftar jabatan default untuk cafe/restoran
        await connection.execute(`
            INSERT IGNORE INTO jabatan (nama_jabatan, deskripsi) VALUES 
            ('Manager', 'Manajer operasional'),
            ('Barista', 'Pembuat kopi dan minuman'),
            ('Cashier', 'Kasir dan pelayanan'),
            ('Kitchen Staff', 'Staff dapur'),
            ('Waitress', 'Pelayan'),
            ('Cleaning Service', 'Petugas kebersihan')
        `);

        // Akun admin default (GANTI PASSWORD setelah deploy!)
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.execute(`
            INSERT IGNORE INTO admin (username, password) 
            VALUES ('admin', ?)
        `, [hashedPassword]);

        // Contoh data karyawan untuk testing
        await connection.execute(`
            INSERT IGNORE INTO karyawan (nik, nama, id_jabatan, is_activated) VALUES 
            ('EMP001', 'John Doe', 2, FALSE),
            ('EMP002', 'Jane Smith', 1, FALSE),
            ('EMP003', 'Bob Wilson', 3, FALSE)
        `);

        console.log('Seed data inserted successfully');
        return true;
    } catch (error) {
        console.error('Seed failed:', error);
        return false;
    } finally {
        await connection.end();
    }
}

// Fungsi DOWN: Menghapus semua data (rollback)
async function down() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Hapus data secara terbalik (karena ada foreign key)
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('DELETE FROM presensi');
        await connection.execute('DELETE FROM karyawan');
        await connection.execute('DELETE FROM jabatan');
        await connection.execute('DELETE FROM admin');
        await connection.execute('DELETE FROM pengaturan');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Seed data removed successfully');
        return true;
    } catch (error) {
        console.error('Seed rollback failed:', error);
        return false;
    } finally {
        await connection.end();
    }
}

module.exports = { up, down };