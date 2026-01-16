/**
 * Migration 005: Tabel Face Recognition untuk Absensi
 * 
 * Membuat tabel-tabel untuk sistem pengenalan wajah:
 * - karyawan_face_reference: Foto referensi wajah karyawan
 * - absensi_face_log: Log pencocokan wajah saat absen
 * - face_recognition_stats: Statistik akurasi pengenalan
 */

const mysql = require('mysql2/promise');

const migration = {
  // Membuat tabel-tabel face recognition
  up: async (connection) => {
    console.log('Running migration: Add Face Recognition Attendance Tables');

    // Tabel foto referensi wajah karyawan
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS karyawan_face_reference (
        id INT AUTO_INCREMENT PRIMARY KEY,
        karyawan_id INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        faces_data JSON NOT NULL,
        faces_count INT NOT NULL DEFAULT 1,
        upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE,
        INDEX idx_karyawan_active (karyawan_id, is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel log pencocokan wajah saat absen
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS absensi_face_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        karyawan_id INT NOT NULL,
        reference_id INT NOT NULL,
        match_filename VARCHAR(255),
        match_file_path VARCHAR(500),
        faces_detected INT DEFAULT 1,
        match_results JSON,
        similarity_score DECIMAL(5,4) DEFAULT 0,
        confidence_level ENUM('Tinggi', 'Sedang', 'Rendah') DEFAULT 'Rendah',
        is_match BOOLEAN DEFAULT FALSE,
        absen_type ENUM('masuk', 'keluar') NOT NULL,
        absen_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        location_info JSON,
        device_info VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE,
        FOREIGN KEY (reference_id) REFERENCES karyawan_face_reference(id) ON DELETE CASCADE,
        INDEX idx_karyawan_absen (karyawan_id, absen_time),
        INDEX idx_absen_time (absen_time),
        INDEX idx_match_status (is_match, confidence_level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabel statistik akurasi pengenalan per karyawan
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS face_recognition_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        karyawan_id INT NOT NULL,
        total_attempts INT DEFAULT 0,
        successful_matches INT DEFAULT 0,
        failed_matches INT DEFAULT 0,
        average_similarity DECIMAL(5,4) DEFAULT 0,
        last_match_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE,
        UNIQUE KEY unique_karyawan (karyawan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tambah kolom face recognition ke tabel presensi
    try {
      await connection.execute(`
        ALTER TABLE presensi 
        ADD COLUMN face_recognition_id INT NULL,
        ADD COLUMN similarity_score DECIMAL(5,4) NULL,
        ADD INDEX idx_face_recognition (face_recognition_id),
        ADD FOREIGN KEY (face_recognition_id) REFERENCES absensi_face_log(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Face recognition columns already exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('Migration completed: Face Recognition Attendance Tables');
  },

  // Fungsi DOWN: Menghapus tabel face recognition (rollback)
  down: async (connection) => {
    console.log('Rolling back migration: Face Recognition Attendance Tables');

    // Hapus kolom dari tabel presensi
    try {
      await connection.execute(`
        ALTER TABLE presensi 
        DROP FOREIGN KEY presensi_ibfk_2,
        DROP INDEX idx_face_recognition,
        DROP COLUMN face_recognition_id,
        DROP COLUMN similarity_score
      `);
    } catch (error) {
      console.log('Face recognition columns may not exist, skipping...');
    }

    // Hapus tabel secara terbalik
    await connection.execute('DROP TABLE IF EXISTS face_recognition_stats');
    await connection.execute('DROP TABLE IF EXISTS absensi_face_log');
    await connection.execute('DROP TABLE IF EXISTS karyawan_face_reference');

    console.log('Rollback completed: Face Recognition Attendance Tables');
  }
};

module.exports = migration;