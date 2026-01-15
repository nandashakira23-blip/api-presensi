const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
    console.log('Starting database seeding...');
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('Connected to database');

        // 1. Insert default pengaturan (office location settings)
        console.log('Seeding pengaturan...');
        await connection.execute(`
            INSERT IGNORE INTO pengaturan (lat_kantor, long_kantor, radius_meter) 
            VALUES (-8.8155675, 115.1253343, 100)
        `);

        // 2. Insert jabatan (job positions)
        console.log('Seeding jabatan...');
        await connection.execute(`
            INSERT IGNORE INTO jabatan (nama_jabatan, deskripsi) VALUES 
            ('Manager', 'Manajer operasional'),
            ('Barista', 'Pembuat kopi dan minuman'),
            ('Cashier', 'Kasir dan pelayanan'),
            ('Kitchen Staff', 'Staff dapur'),
            ('Waitress', 'Pelayan'),
            ('Cleaning Service', 'Petugas kebersihan'),
            ('Security', 'Petugas keamanan'),
            ('Admin', 'Staff administrasi')
        `);

        // 3. Insert admin users
        console.log('Seeding admin users...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.execute(`
            INSERT IGNORE INTO admin (username, password) VALUES 
            ('admin', ?),
            ('superadmin', ?)
        `, [hashedPassword, hashedPassword]);

        // 4. Insert sample karyawan (employees)
        console.log('Seeding sample employees...');
        await connection.execute(`
            INSERT IGNORE INTO karyawan (nik, nama, id_jabatan, is_activated) VALUES 
            ('EMP001', 'John Doe', 2, FALSE),
            ('EMP002', 'Jane Smith', 1, FALSE),
            ('EMP003', 'Bob Wilson', 3, FALSE),
            ('EMP004', 'Alice Johnson', 4, FALSE),
            ('EMP005', 'Mike Brown', 5, FALSE),
            ('EMP006', 'Sarah Davis', 6, FALSE),
            ('EMP007', 'Tom Anderson', 7, FALSE),
            ('EMP008', 'Lisa Wilson', 8, FALSE)
        `);

        // 5. Assign default work schedule to employees (use existing schedule from migration)
        console.log('Assigning work schedules to employees...');
        await connection.execute(`
            UPDATE karyawan 
            SET work_schedule_id = (SELECT id FROM jadwal_kerja WHERE is_active = TRUE LIMIT 1)
            WHERE work_schedule_id IS NULL
        `);

        // 7. Insert sample face recognition settings
        console.log('Seeding face recognition settings...');
        await connection.execute(`
            INSERT IGNORE INTO face_recognition_settings (setting_name, setting_value, description) VALUES
            ('model_type', 'full', 'MediaPipe model type: short or full'),
            ('max_faces', '5', 'Maximum number of faces to detect'),
            ('base_threshold', '0.70', 'Base similarity threshold for matching'),
            ('confidence_bonus_enabled', 'true', 'Enable confidence bonus for threshold adjustment'),
            ('image_preprocessing_enabled', 'true', 'Enable advanced image preprocessing'),
            ('quality_validation_enabled', 'true', 'Enable image quality validation'),
            ('algorithm_version', 'enhanced_v1', 'Current algorithm version')
        `);

        console.log('');
        console.log('Database seeding completed successfully!');
        console.log('');
        console.log('Seeded data:');
        console.log('   - 1 office location setting');
        console.log('   - 8 job positions');
        console.log('   - 2 admin users');
        console.log('   - 8 sample employees');
        console.log('   - Work schedules assigned (from migration)');
        console.log('   - 7 face recognition settings');
        console.log('');
        console.log('Admin login credentials:');
        console.log('   Username: admin / superadmin');
        console.log('   Password: admin123');
        console.log('');
        console.log('Sample employees (NIK):');
        console.log('   EMP001 - John Doe (Barista)');
        console.log('   EMP002 - Jane Smith (Manager)');
        console.log('   EMP003 - Bob Wilson (Cashier)');
        console.log('   EMP004 - Alice Johnson (Kitchen Staff)');
        console.log('   EMP005 - Mike Brown (Waitress)');
        console.log('   EMP006 - Sarah Davis (Cleaning Service)');
        console.log('   EMP007 - Tom Anderson (Security)');
        console.log('   EMP008 - Lisa Wilson (Admin)');
        console.log('');
        console.log('Work Schedules (from migration 009):');
        console.log('   - Jam Kerja Setiap Hari (07:00-18:00, 7 days)');
        console.log('   - Morning Shift (06:30-14:30)');
        console.log('   - Middle Shift (08:30-16:30)');
        console.log('   - Evening Shift (10:30-18:30)');
        console.log('');
        console.log('Ready to run: npm start');

    } catch (error) {
        console.error('Seeding failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('Tips:');
            console.log('   - Make sure MySQL server is running');
            console.log('   - Check your .env database credentials');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('Tips:');
            console.log('   - Check your MySQL username/password in .env');
            console.log('   - Make sure user has INSERT privileges');
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('Tips:');
            console.log('   - Run migrations first: npm run migrate:up');
            console.log('   - Or run fresh install: npm run db:fresh');
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function clearSeeds() {
    console.log('Clearing seed data...');
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        // Clear data in reverse order of dependencies
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        console.log('Clearing attendance data...');
        await connection.execute('DELETE FROM presensi');
        await connection.execute('DELETE FROM attendance_summary');
        await connection.execute('DELETE FROM absensi_face_log');
        await connection.execute('DELETE FROM face_recognition_stats');
        await connection.execute('DELETE FROM face_recognition_audit');
        await connection.execute('DELETE FROM karyawan_face_reference');
        await connection.execute('DELETE FROM pin_security_log');
        
        console.log('Clearing employee data...');
        await connection.execute('DELETE FROM karyawan');
        
        console.log('Clearing job positions...');
        await connection.execute('DELETE FROM jabatan');
        
        console.log('Clearing admin users...');
        await connection.execute('DELETE FROM admin');
        
        console.log('Clearing work schedules...');
        await connection.execute('DELETE FROM jadwal_kerja WHERE id > 4'); // Keep the 4 default schedules from migration
        
        console.log('Clearing face recognition settings...');
        await connection.execute('DELETE FROM face_recognition_settings');
        
        console.log('Clearing office settings...');
        await connection.execute('DELETE FROM pengaturan');
        
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Seed data cleared successfully!');

    } catch (error) {
        console.error('Clear seeds failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Command line interface
const command = process.argv[2];

if (command === 'run') {
    seedDatabase();
} else if (command === 'clear') {
    clearSeeds();
} else {
    console.log('Usage:');
    console.log('  npm run seed        - Run database seeding');
    console.log('  npm run seed:clear  - Clear seed data');
    console.log('');
    console.log('Or directly:');
    console.log('  node scripts/seed.js run    - Run seeding');
    console.log('  node scripts/seed.js clear  - Clear seeds');
}

module.exports = { seedDatabase, clearSeeds };
