/**
 * Test Script: No Schedule Scenario
 * 
 * Script ini untuk testing skenario ketika karyawan tidak memiliki jadwal kerja
 * atau hari ini bukan hari kerja mereka.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testNoScheduleScenario() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('=== TEST NO SCHEDULE SCENARIO ===\n');

    // Test 1: Find employee without schedule
    console.log('Test 1: Employees WITHOUT work schedule');
    console.log('─'.repeat(50));
    const [noScheduleEmployees] = await connection.execute(`
      SELECT id, nik, nama, work_schedule_id
      FROM karyawan
      WHERE work_schedule_id IS NULL
      LIMIT 5
    `);
    
    if (noScheduleEmployees.length > 0) {
      console.log('✓ Found employees without schedule:');
      noScheduleEmployees.forEach(emp => {
        console.log(`  - ${emp.nama} (NIK: ${emp.nik}) - No Schedule`);
      });
    } else {
      console.log('✗ No employees found without schedule');
      console.log('  Creating test employee without schedule...');
      
      // Create test employee without schedule
      await connection.execute(`
        INSERT INTO karyawan (nik, nama, id_jabatan, work_schedule_id, is_activated, pin)
        VALUES ('TEST999', 'Test No Schedule', 1, NULL, TRUE, '$2b$10$abcdefghijklmnopqrstuvwxyz')
      `);
      console.log('  ✓ Test employee created: TEST999');
    }

    console.log('\n');

    // Test 2: Find employees with schedule but today is not work day
    console.log('Test 2: Employees with schedule (check work days)');
    console.log('─'.repeat(50));
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`Today is: ${today}\n`);
    
    const [employeesWithSchedule] = await connection.execute(`
      SELECT 
        k.id, k.nik, k.nama,
        ws.nama as schedule_name,
        ws.hari_kerja
      FROM karyawan k
      JOIN jadwal_kerja ws ON k.work_schedule_id = ws.id
      LIMIT 10
    `);

    if (employeesWithSchedule.length > 0) {
      console.log('Employees with schedule:');
      employeesWithSchedule.forEach(emp => {
        let workDays = [];
        
        if (!emp.hari_kerja) {
          workDays = [];
        } else if (Array.isArray(emp.hari_kerja)) {
          workDays = emp.hari_kerja;
        } else if (typeof emp.hari_kerja === 'object') {
          // Buffer or object
          try {
            const str = emp.hari_kerja.toString();
            workDays = JSON.parse(str);
          } catch (e) {
            workDays = [];
          }
        } else if (typeof emp.hari_kerja === 'string') {
          try {
            workDays = JSON.parse(emp.hari_kerja);
          } catch (e) {
            workDays = emp.hari_kerja.split(',').map(d => d.trim());
          }
        }
        
        const isWorkDay = workDays.some(day => day.toLowerCase() === today.toLowerCase());
        const status = isWorkDay ? '✓ WORK DAY' : '✗ HOLIDAY';
        
        console.log(`  ${status} - ${emp.nama} (${emp.schedule_name})`);
        console.log(`    Work days: ${workDays.join(', ')}`);
      });
    }

    console.log('\n');

    // Test 3: API Response simulation
    console.log('Test 3: Expected API Response');
    console.log('─'.repeat(50));
    
    console.log('\nScenario A: No Schedule (workSchedule = null)');
    console.log('Expected behavior:');
    console.log('  - circularButtonContainer: GONE');
    console.log('  - bottomStatsSection: GONE');
    console.log('  - restMessageSection: VISIBLE');
    console.log('  - Message: "Jadwal Kerja Belum Tersedia"');
    
    console.log('\nScenario B: Holiday (today not in work_days)');
    console.log('Expected behavior:');
    console.log('  - circularButtonContainer: GONE');
    console.log('  - bottomStatsSection: GONE');
    console.log('  - restMessageSection: VISIBLE');
    console.log('  - Message: "Selamat Menikmati Hari Libur"');
    
    console.log('\nScenario C: Work Day (today in work_days)');
    console.log('Expected behavior:');
    console.log('  - circularButtonContainer: VISIBLE');
    console.log('  - bottomStatsSection: VISIBLE');
    console.log('  - cardWorkSchedule: VISIBLE');
    console.log('  - restMessageSection: GONE');

    console.log('\n=== TEST COMPLETED ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

// Run test
testNoScheduleScenario();
