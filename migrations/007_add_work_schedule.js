/**
 * Migration 007: Sistem Jadwal Kerja
 * 
 * Menambahkan fitur jadwal kerja lengkap:
 * - Tabel work_schedule: Definisi jadwal (jam masuk/pulang, hari kerja)
 * - Kolom work_schedule_id di karyawan untuk assign jadwal
 * - Kolom attendance_type di presensi (clock_in/clock_out)
 * - Deteksi terlambat, pulang awal, dan lembur
 * - Tabel attendance_summary: Ringkasan harian
 */

const mysql = require('mysql2/promise');

// Membuat sistem jadwal kerja
async function up(connection) {
    console.log('Running migration: Add Work Schedule System');
    
    try {
        // Tabel jadwal kerja
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS work_schedule (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL COMMENT 'Nama jadwal kerja (e.g., Regular, Shift Pagi, Shift Malam)',
                start_time TIME NOT NULL COMMENT 'Jam mulai kerja',
                end_time TIME NOT NULL COMMENT 'Jam selesai kerja',
                clock_in_start TIME NOT NULL COMMENT 'Jam mulai bisa clock in',
                clock_in_end TIME NOT NULL COMMENT 'Jam terakhir bisa clock in',
                clock_out_start TIME NOT NULL COMMENT 'Jam mulai bisa clock out',
                clock_out_end TIME NOT NULL COMMENT 'Jam terakhir bisa clock out',
                break_start TIME NULL COMMENT 'Jam mulai istirahat (optional)',
                break_end TIME NULL COMMENT 'Jam selesai istirahat (optional)',
                work_days JSON NOT NULL COMMENT 'Hari kerja: ["monday","tuesday","wednesday","thursday","friday"]',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Created work_schedule table');

        // Cek apakah kolom work_schedule_id sudah ada
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'karyawan' 
            AND COLUMN_NAME = 'work_schedule_id'
        `);

        if (columns.length === 0) {
            // Tambah kolom work_schedule_id ke tabel karyawan
            await connection.execute(`
                ALTER TABLE karyawan 
                ADD COLUMN work_schedule_id INT NULL AFTER id_jabatan
            `);
            console.log('Added work_schedule_id column to karyawan table');

            // Tambah foreign key constraint
            await connection.execute(`
                ALTER TABLE karyawan 
                ADD FOREIGN KEY (work_schedule_id) REFERENCES work_schedule(id)
            `);
            console.log('Added foreign key constraint for work_schedule_id');
        } else {
            console.log('work_schedule_id column already exists in karyawan table');
        }

        // Cek apakah kolom attendance_type sudah ada
        const [presensiColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'presensi' 
            AND COLUMN_NAME = 'attendance_type'
        `);

        if (presensiColumns.length === 0) {
            // Tambah kolom tipe absensi (clock_in/clock_out)
            await connection.execute(`
                ALTER TABLE presensi 
                ADD COLUMN attendance_type ENUM('clock_in', 'clock_out') NOT NULL DEFAULT 'clock_in' AFTER id_karyawan
            `);
            console.log('Added attendance_type column to presensi table');

            // Kolom tambahan untuk tracking keterlambatan dan lembur
            await connection.execute(`
                ALTER TABLE presensi 
                ADD COLUMN work_schedule_id INT NULL AFTER attendance_type,
                ADD COLUMN is_late BOOLEAN DEFAULT FALSE COMMENT 'Apakah terlambat',
                ADD COLUMN is_early BOOLEAN DEFAULT FALSE COMMENT 'Apakah pulang lebih awal',
                ADD COLUMN overtime_minutes INT DEFAULT 0 COMMENT 'Menit lembur',
                ADD COLUMN work_duration_minutes INT NULL COMMENT 'Durasi kerja dalam menit'
            `);
            console.log('Added work schedule columns to presensi table');

            // Tambah foreign key constraint
            await connection.execute(`
                ALTER TABLE presensi 
                ADD FOREIGN KEY (work_schedule_id) REFERENCES work_schedule(id)
            `);
            console.log('Added foreign key constraint for presensi work_schedule_id');
        } else {
            console.log('attendance_type column already exists in presensi table');
        }

        // Jadwal kerja default (7 hari seminggu: 07:00-18:00)
        const [existingSchedules] = await connection.execute('SELECT COUNT(*) as count FROM work_schedule');
        if (existingSchedules[0].count === 0) {
            await connection.execute(`
                INSERT INTO work_schedule (name, start_time, end_time, clock_in_start, clock_in_end, clock_out_start, clock_out_end, work_days) VALUES
                ('Jam Kerja Setiap Hari', '07:00:00', '18:00:00', '06:30:00', '08:00:00', '17:30:00', '19:00:00', '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]')
            `);
            console.log('Inserted default work schedule (7AM-6PM, 7 days a week)');
        } else {
            console.log('Work schedules already exist, skipping insert');
        }

        // Assign jadwal default ke karyawan yang belum punya
        await connection.execute(`
            UPDATE karyawan 
            SET work_schedule_id = 1 
            WHERE work_schedule_id IS NULL
        `);
        console.log('Assigned default work schedule to existing employees');

        // Tabel ringkasan kehadiran harian
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS attendance_summary (
                id INT AUTO_INCREMENT PRIMARY KEY,
                karyawan_id INT NOT NULL,
                work_date DATE NOT NULL,
                work_schedule_id INT NOT NULL,
                clock_in_time TIME NULL,
                clock_out_time TIME NULL,
                clock_in_status ENUM('on_time', 'late', 'very_late') NULL,
                clock_out_status ENUM('on_time', 'early', 'overtime') NULL,
                total_work_minutes INT DEFAULT 0,
                break_minutes INT DEFAULT 0,
                overtime_minutes INT DEFAULT 0,
                is_complete BOOLEAN DEFAULT FALSE COMMENT 'Apakah clock in dan clock out lengkap',
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (karyawan_id) REFERENCES karyawan(id) ON DELETE CASCADE,
                FOREIGN KEY (work_schedule_id) REFERENCES work_schedule(id),
                UNIQUE KEY unique_employee_date (karyawan_id, work_date)
            )
        `);
        console.log('Created attendance_summary table');

        console.log('Migration completed successfully!');
        console.log('Work Schedule System Features:');
        console.log('   - Multiple work schedules support');
        console.log('   - Clock In/Clock Out validation');
        console.log('   - Late/Early detection');
        console.log('   - Overtime calculation');
        console.log('   - Daily attendance summary');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Fungsi DOWN: Menghapus sistem jadwal kerja (rollback)
async function down(connection) {
    console.log('Rolling back migration: Add Work Schedule System');
    
    try {
        // Hapus tabel dan constraint secara terbalik
        await connection.execute('DROP TABLE IF EXISTS attendance_summary');
        
        // Hapus kolom dari tabel presensi (cek dulu apakah ada)
        const [presensiColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'presensi' 
            AND COLUMN_NAME IN ('attendance_type', 'work_schedule_id', 'is_late', 'is_early', 'overtime_minutes', 'work_duration_minutes')
        `);

        if (presensiColumns.length > 0) {
            await connection.execute(`
                ALTER TABLE presensi 
                DROP FOREIGN KEY presensi_ibfk_2
            `);
            
            await connection.execute(`
                ALTER TABLE presensi 
                DROP COLUMN work_schedule_id, 
                DROP COLUMN attendance_type, 
                DROP COLUMN is_late, 
                DROP COLUMN is_early, 
                DROP COLUMN overtime_minutes, 
                DROP COLUMN work_duration_minutes
            `);
        }

        // Hapus kolom dari tabel karyawan
        const [karyawanColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'karyawan' 
            AND COLUMN_NAME = 'work_schedule_id'
        `);

        if (karyawanColumns.length > 0) {
            await connection.execute(`
                ALTER TABLE karyawan 
                DROP FOREIGN KEY karyawan_ibfk_2
            `);
            
            await connection.execute('ALTER TABLE karyawan DROP COLUMN work_schedule_id');
        }
        
        // Drop work_schedule table
        await connection.execute('DROP TABLE IF EXISTS work_schedule');
        
        console.log('Migration rolled back successfully');
        
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };