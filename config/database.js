/**
 * ============================================
 * KONFIGURASI DATABASE
 * ============================================
 * File ini mengatur koneksi database untuk aplikasi.
 * Mendukung 2 jenis database:
 * 1. MySQL (utama) - untuk production
 * 2. SQLite (cadangan) - jika MySQL tidak tersedia
 */

const mysql = require('mysql2');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Variabel global untuk menyimpan koneksi database
let db = null;

// Tipe database yang sedang digunakan ('mysql' atau 'sqlite')
let dbType = null;

/**
 * Inisialisasi koneksi database
 * Mencoba MySQL dulu, kalau gagal pakai SQLite sebagai cadangan
 */
async function initializeDatabase() {
    // Coba koneksi ke MySQL dulu
    try {
        // Konfigurasi MySQL dari environment variables
        const mysqlConfig = {
            host: process.env.DB_HOST || 'localhost',      // Alamat server MySQL
            user: process.env.DB_USER || 'root',           // Username MySQL
            password: process.env.DB_PASS || '',           // Password MySQL
            database: process.env.DB_NAME || 'presensi_fleur_atelier', // Nama database
            waitForConnections: true,                       // Tunggu jika koneksi penuh
            connectionLimit: 10,                            // Maksimal 10 koneksi bersamaan
            queueLimit: 0                                   // Tidak ada batas antrian
        };

        // Buat connection pool untuk MySQL
        const pool = mysql.createPool(mysqlConfig);

        // Test koneksi MySQL
        await new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    reject(err); // Gagal koneksi
                } else {
                    connection.release(); // Lepas koneksi test
                    resolve();
                }
            });
        });

        // Koneksi MySQL berhasil
        db = pool;
        dbType = 'mysql';
        console.log('Database connected: MySQL');

        // Handle error koneksi MySQL (auto-reconnect)
        pool.on('error', (err) => {
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('MySQL reconnecting...');
            }
        });

    } catch (mysqlError) {
        // MySQL gagal, pakai SQLite sebagai cadangan
        console.log('MySQL not available, using SQLite');

        // Buat folder data jika belum ada
        const dbDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Buat/buka file database SQLite
        const dbPath = path.join(dbDir, 'presensi.db');
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.log('SQLite connection failed');
            } else {
                console.log('Database connected: SQLite');
            }
        });

        dbType = 'sqlite';

        // Buat tabel-tabel untuk SQLite
        await createSQLiteTables();
    }
}

/**
 * Membuat tabel-tabel yang diperlukan di SQLite
 * Dipanggil otomatis saat menggunakan SQLite
 */
async function createSQLiteTables() {
    return new Promise((resolve) => {
        db.serialize(() => {
            // Tabel admin - untuk login admin web
            db.run(`CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabel jabatan - daftar posisi/jabatan karyawan
            db.run(`CREATE TABLE IF NOT EXISTS jabatan (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nama_jabatan TEXT NOT NULL,
                deskripsi TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabel karyawan - data semua karyawan
            db.run(`CREATE TABLE IF NOT EXISTS karyawan (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nama TEXT NOT NULL,
                nik TEXT UNIQUE NOT NULL,
                email TEXT,
                no_telepon TEXT,
                alamat TEXT,
                tanggal_lahir DATE,
                jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L', 'P')),
                id_jabatan INTEGER,
                foto_referensi TEXT,
                pin TEXT,
                is_activated INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_jabatan) REFERENCES jabatan(id)
            )`);

            // Tabel absensi - catatan kehadiran harian
            db.run(`CREATE TABLE IF NOT EXISTS absensi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                karyawan_id INTEGER NOT NULL,
                tanggal DATE NOT NULL,
                jam_masuk TIME,
                jam_keluar TIME,
                verification_method TEXT DEFAULT 'manual',
                similarity_score REAL,
                face_recognition_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (karyawan_id) REFERENCES karyawan(id)
            )`);

            // Tabel jadwal kerja - pengaturan jam kerja karyawan
            db.run(`CREATE TABLE IF NOT EXISTS work_schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                schedule_name TEXT,
                start_time TIME DEFAULT '08:00:00',
                end_time TIME DEFAULT '17:00:00',
                clock_in_start TIME DEFAULT '07:30:00',
                clock_in_end TIME DEFAULT '08:30:00',
                clock_out_start TIME DEFAULT '16:30:00',
                clock_out_end TIME DEFAULT '17:30:00',
                break_start TIME DEFAULT '12:00:00',
                break_end TIME DEFAULT '13:00:00',
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES karyawan(id)
            )`);

            // Tabel foto referensi wajah - untuk face recognition
            db.run(`CREATE TABLE IF NOT EXISTS karyawan_face_reference (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                karyawan_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                faces_data TEXT NOT NULL,
                faces_count INTEGER NOT NULL,
                is_active INTEGER DEFAULT 1,
                upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (karyawan_id) REFERENCES karyawan(id)
            )`);

            // Tabel statistik face recognition - tracking akurasi
            db.run(`CREATE TABLE IF NOT EXISTS face_recognition_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                karyawan_id INTEGER NOT NULL,
                total_attempts INTEGER DEFAULT 0,
                successful_matches INTEGER DEFAULT 0,
                failed_matches INTEGER DEFAULT 0,
                average_similarity REAL DEFAULT 0,
                last_match_time DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (karyawan_id) REFERENCES karyawan(id)
            )`);

            // Tabel log absensi face - riwayat pencocokan wajah
            db.run(`CREATE TABLE IF NOT EXISTS absensi_face_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                karyawan_id INTEGER NOT NULL,
                absen_type TEXT CHECK(absen_type IN ('clock_in', 'clock_out')),
                faces_detected INTEGER,
                similarity_score REAL,
                confidence_level TEXT,
                is_match INTEGER,
                match_results TEXT,
                location_info TEXT,
                device_info TEXT,
                absen_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (karyawan_id) REFERENCES karyawan(id)
            )`);

            // Insert data default: admin user (password: password)
            db.run(`INSERT OR IGNORE INTO admin_users (username, password, email) 
                    VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@fleuratelier.com')`);

            // Insert data default: jabatan Staff
            db.run(`INSERT OR IGNORE INTO jabatan (id, nama_jabatan, deskripsi) 
                    VALUES (1, 'Staff', 'Staff umum')`);

            resolve();
        });
    });
}

/**
 * Fungsi untuk menjalankan query database
 * Otomatis menyesuaikan syntax MySQL/SQLite
 * 
 * @param {string} query - SQL query yang akan dijalankan
 * @param {array} params - Parameter untuk query (mencegah SQL injection)
 * @returns {Promise} - Hasil query dalam bentuk Promise
 */
function execute(query, params = []) {
    return new Promise((resolve, reject) => {
        if (dbType === 'mysql') {
            // Jalankan query di MySQL
            db.execute(query, params, (err, results) => {
                if (err) reject(err);
                else resolve([results]);
            });
        } else if (dbType === 'sqlite') {
            // Konversi syntax MySQL ke SQLite
            let sqliteQuery = query
                .replace(/CURDATE\(\)/g, "date('now')")      // Tanggal hari ini
                .replace(/CURTIME\(\)/g, "time('now')")      // Waktu sekarang
                .replace(/CURRENT_TIMESTAMP/g, "datetime('now')") // Timestamp sekarang
                .replace(/DATE\(/g, "date(")
                .replace(/TIME\(/g, "time(");

            // Cek apakah query SELECT atau bukan
            if (query.toLowerCase().includes('select')) {
                // SELECT: kembalikan semua baris
                db.all(sqliteQuery, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]);
                });
            } else {
                // INSERT/UPDATE/DELETE: kembalikan info perubahan
                db.run(sqliteQuery, params, function (err) {
                    if (err) reject(err);
                    else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
                });
            }
        }
    });
}

// Jalankan inisialisasi database saat module di-load
initializeDatabase();

/**
 * Export fungsi-fungsi database
 * - execute: untuk query dengan Promise
 * - dbType: tipe database yang digunakan
 * - query: wrapper yang support callback dan Promise
 */
module.exports = {
    execute,
    dbType,
    query: (sql, params, callback) => {
        if (callback) {
            // Mode callback (untuk kompatibilitas kode lama)
            execute(sql, params)
                .then(([results]) => callback(null, results))
                .catch(err => callback(err));
        } else {
            // Mode Promise (recommended)
            return execute(sql, params).then(([results]) => results);
        }
    }
};
