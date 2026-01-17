/**
 * ============================================
 * KONFIGURASI DATABASE - MySQL ONLY
 * ============================================
 * File ini mengatur koneksi database MySQL untuk aplikasi.
 * Hanya menggunakan MySQL sebagai database utama.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Variabel global untuk menyimpan koneksi database
let pool = null;

/**
 * Inisialisasi koneksi database MySQL
 * Membuat connection pool untuk performa yang lebih baik
 */
async function initializeDatabase() {
    try {
        // Konfigurasi MySQL dari environment variables
        const mysqlConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'presensi_fleur_atelier',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            timezone: '+08:00' // WITA timezone (UTC+8) - Fixed, tidak bergantung env
        };

        // Buat connection pool untuk MySQL
        pool = mysql.createPool(mysqlConfig);

        // Test koneksi MySQL
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();

        console.log('✅ Database connected: MySQL');
        console.log(`📊 Database: ${mysqlConfig.database}`);
        console.log(`🏠 Host: ${mysqlConfig.host}`);

        return true;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        console.error('💡 Please check your MySQL configuration in .env file');
        console.error('💡 Make sure MySQL server is running');
        process.exit(1); // Exit aplikasi jika MySQL tidak bisa connect
    }
}

/**
 * Fungsi untuk mendapatkan koneksi database
 * @returns {Promise} MySQL connection dari pool
 */
async function getConnection() {
    if (!pool) {
        await initializeDatabase();
    }
    return await pool.getConnection();
}

/**
 * Fungsi untuk menjalankan query database
 * @param {string} query - SQL query yang akan dijalankan
 * @param {array} params - Parameter untuk query (mencegah SQL injection)
 * @returns {Promise} - Hasil query dalam bentuk Promise
 */
async function execute(query, params = []) {
    if (!pool) {
        await initializeDatabase();
    }
    
    try {
        const [results] = await pool.execute(query, params);
        return [results];
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Fungsi untuk menjalankan query dengan connection yang sudah ada
 * @param {object} connection - MySQL connection object
 * @param {string} query - SQL query
 * @param {array} params - Parameter query
 * @returns {Promise} - Hasil query
 */
async function executeWithConnection(connection, query, params = []) {
    try {
        const [results] = await connection.execute(query, params);
        return [results];
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Jalankan inisialisasi database saat module di-load
initializeDatabase();

/**
 * Export fungsi-fungsi database
 * - execute: untuk query dengan Promise
 * - getConnection: untuk mendapatkan koneksi dari pool
 * - executeWithConnection: untuk query dengan koneksi yang sudah ada
 * - query: wrapper yang support callback dan Promise (untuk kompatibilitas)
 */
module.exports = {
    execute,
    getConnection,
    executeWithConnection,
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
