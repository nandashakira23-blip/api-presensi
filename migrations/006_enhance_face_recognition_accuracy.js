/**
 * Migration 006: Peningkatan Akurasi Face Recognition
 * 
 * Menambahkan fitur untuk meningkatkan akurasi pengenalan wajah:
 * - Kolom confidence score dan rekomendasi AI
 * - Penilaian kualitas gambar
 * - Tabel pengaturan algoritma face recognition
 * - Tabel audit untuk tracking perubahan
 */

const mysql = require('mysql2/promise');

// Menambahkan fitur peningkatan akurasi
async function up(connection) {
  console.log('Running migration: Enhance Face Recognition Accuracy');
  
  try {
    // Kolom tambahan di tabel absensi_face_log
    await connection.execute(`
      ALTER TABLE absensi_face_log 
      ADD COLUMN overall_confidence DECIMAL(5,4) DEFAULT NULL COMMENT 'Skor confidence keseluruhan',
      ADD COLUMN recommendation TEXT DEFAULT NULL COMMENT 'Rekomendasi AI berdasarkan analisis',
      ADD COLUMN image_quality_score DECIMAL(5,4) DEFAULT NULL COMMENT 'Skor kualitas gambar',
      ADD COLUMN processing_time_ms INT DEFAULT NULL COMMENT 'Waktu proses dalam milidetik'
    `);
    
    // Index untuk performa query
    await connection.execute(`
      CREATE INDEX idx_overall_confidence ON absensi_face_log(overall_confidence)
    `);
    
    await connection.execute(`
      CREATE INDEX idx_absen_time_confidence ON absensi_face_log(absen_time, overall_confidence)
    `);
    
    // Kolom statistik detail di face_recognition_stats
    await connection.execute(`
      ALTER TABLE face_recognition_stats 
      ADD COLUMN high_confidence_matches INT DEFAULT 0 COMMENT 'Match dengan confidence > 0.8',
      ADD COLUMN medium_confidence_matches INT DEFAULT 0 COMMENT 'Match dengan confidence 0.6-0.8',
      ADD COLUMN low_confidence_matches INT DEFAULT 0 COMMENT 'Match dengan confidence < 0.6',
      ADD COLUMN average_processing_time DECIMAL(8,2) DEFAULT 0 COMMENT 'Rata-rata waktu proses (ms)',
      ADD COLUMN best_similarity_score DECIMAL(5,4) DEFAULT 0 COMMENT 'Skor similarity terbaik',
      ADD COLUMN algorithm_version VARCHAR(20) DEFAULT 'enhanced_v1' COMMENT 'Versi algoritma'
    `);
    
    // Tabel pengaturan algoritma face recognition
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS face_recognition_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_name VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Nilai default pengaturan algoritma
    await connection.execute(`
      INSERT INTO face_recognition_settings (setting_name, setting_value, description) VALUES
      ('model_type', 'full', 'Tipe model MediaPipe: short atau full'),
      ('max_faces', '5', 'Maksimal wajah yang dideteksi'),
      ('base_threshold', '0.70', 'Threshold dasar untuk pencocokan'),
      ('confidence_bonus_enabled', 'true', 'Aktifkan bonus confidence'),
      ('image_preprocessing_enabled', 'true', 'Aktifkan preprocessing gambar'),
      ('quality_validation_enabled', 'true', 'Aktifkan validasi kualitas'),
      ('algorithm_version', 'enhanced_v1', 'Versi algoritma saat ini')
      ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value),
        updated_at = CURRENT_TIMESTAMP
    `);
    
    // Tabel audit untuk tracking perubahan
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS face_recognition_audit (
        id INT PRIMARY KEY AUTO_INCREMENT,
        karyawan_id INT NOT NULL,
        action_type ENUM('register', 'match', 'delete', 'update') NOT NULL,
        old_confidence DECIMAL(5,4) DEFAULT NULL,
        new_confidence DECIMAL(5,4) DEFAULT NULL,
        algorithm_version VARCHAR(20) DEFAULT NULL,
        processing_details JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('Migration completed: Enhanced face recognition accuracy features added');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Fungsi DOWN: Menghapus fitur peningkatan akurasi (rollback)
async function down(connection) {
  console.log('Rolling back migration: Enhance Face Recognition Accuracy');
  
  try {
    // Hapus tabel audit
    await connection.execute('DROP TABLE IF EXISTS face_recognition_audit');
    
    // Hapus tabel pengaturan
    await connection.execute('DROP TABLE IF EXISTS face_recognition_settings');
    
    // Hapus index jika ada
    try {
      // Check if index exists before dropping
      const [indexes] = await connection.execute(`
        SHOW INDEX FROM absensi_face_log WHERE Key_name = 'idx_overall_confidence'
      `);
      if (indexes.length > 0) {
        await connection.execute('DROP INDEX idx_overall_confidence ON absensi_face_log');
      }
    } catch (error) {
      console.log('Index idx_overall_confidence does not exist, skipping...');
    }
    
    // Hapus index kedua
    try {
      const [indexes] = await connection.execute(`
        SHOW INDEX FROM absensi_face_log WHERE Key_name = 'idx_absen_time_confidence'
      `);
      if (indexes.length > 0) {
        await connection.execute('DROP INDEX idx_absen_time_confidence ON absensi_face_log');
      }
    } catch (error) {
      console.log('Index idx_absen_time_confidence does not exist, skipping...');
    }
    
    // Hapus kolom dari face_recognition_stats
    await connection.execute(`
      ALTER TABLE face_recognition_stats 
      DROP COLUMN IF EXISTS high_confidence_matches,
      DROP COLUMN IF EXISTS medium_confidence_matches,
      DROP COLUMN IF EXISTS low_confidence_matches,
      DROP COLUMN IF EXISTS average_processing_time,
      DROP COLUMN IF EXISTS best_similarity_score,
      DROP COLUMN IF EXISTS algorithm_version
    `);
    
    // Hapus kolom dari absensi_face_log
    await connection.execute(`
      ALTER TABLE absensi_face_log 
      DROP COLUMN IF EXISTS overall_confidence,
      DROP COLUMN IF EXISTS recommendation,
      DROP COLUMN IF EXISTS image_quality_score,
      DROP COLUMN IF EXISTS processing_time_ms
    `);
    
    console.log('Migration rollback completed');
    
  } catch (error) {
    console.error('Migration rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };