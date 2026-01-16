/**
 * Migration Runner - Structured Migration System
 * File: scripts/run-migrations.js
 * Purpose: Menjalankan migration dengan struktur yang rapi dan terorganisir
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'presensi_fleur_atelier'
};

async function createDatabase() {
  console.log('📊 Step 1: Creating database...');
  
  const connectionWithoutDB = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });
  
  try {
    await connectionWithoutDB.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`✅ Database '${dbConfig.database}' created/verified`);
  } finally {
    await connectionWithoutDB.end();
  }
}

async function createMigrationsTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecutedMigrations(connection) {
  try {
    const [rows] = await connection.execute('SELECT filename FROM migrations ORDER BY filename');
    return rows.map(row => row.filename);
  } catch (error) {
    return [];
  }
}

async function markMigrationAsExecuted(connection, filename) {
  await connection.execute(
    'INSERT INTO migrations (filename) VALUES (?)',
    [filename]
  );
}

async function runMigrations() {
  console.log('🚀 Starting Structured Migration System...');
  console.log('=====================================\n');
  
  let connection;
  
  try {
    // Create database if not exists
    await createDatabase();
    
    console.log('🔗 Step 2: Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');
    
    // Create migrations tracking table
    await createMigrationsTable(connection);
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations(connection);
    
    console.log('📋 Step 3: Running migrations...');
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure proper order
    
    let executedCount = 0;
    
    for (const file of migrationFiles) {
      if (executedMigrations.includes(file)) {
        console.log(`   ⏭️  ${file} (already executed)`);
        continue;
      }
      
      console.log(`   Running migration: ${file}`);
      
      try {
        const migrationPath = path.join(migrationsDir, file);
        const migration = require(migrationPath);
        
        if (typeof migration.up === 'function') {
          await migration.up(connection);
          await markMigrationAsExecuted(connection, file);
          console.log(`   ✅ ${file} completed`);
          executedCount++;
        } else {
          console.log(`   ⚠️  ${file} - No 'up' function found`);
        }
      } catch (error) {
        console.error(`   ❌ ${file} failed:`, error.message);
        throw error;
      }
    }
    
    console.log(`\n✅ All migrations completed (${executedCount} new migrations executed)`);
    
    // Verify database structure
    console.log('\n🔍 Step 4: Verifying database structure...');
    const [tables] = await connection.execute(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_schema = DATABASE() AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   📋 ${table.table_name} (${table.column_count} columns)`);
    });
    
    console.log('\n🎉 Structured Migration System Completed Successfully!');
    console.log('\n📝 Database Structure:');
    console.log('   ✅ Core tables (admin, jabatan, pengaturan)');
    console.log('   ✅ Work schedule tables (jadwal_kerja)');
    console.log('   ✅ Employee tables (karyawan)');
    console.log('   ✅ Attendance tables (presensi, attendance_summary)');
    console.log('   ✅ Face recognition tables (face_*, absensi_face_log)');
    console.log('   ✅ Security tables (pin_security_log)');
    console.log('   ✅ Sample data seeded');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Access admin panel: http://localhost:3000/admin');
    console.log('   3. Test Android app with employee NIK (16 digit): 3201234567890001-3201234567890008');
    console.log('   4. Default PIN for all employees: 1234');
    console.log('   5. NIK Format: 16 digit angka (contoh: 3201234567890001)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('\nMigration process finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };