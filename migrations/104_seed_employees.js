/**
 * Migration: Seed Employees
 * File: 104_seed_employees.js
 * Purpose: Mengisi data karyawan FLEUR CAFÉ
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function up(connection) {
    console.log('Running migration: Seed Employees');
    
    try {
        // Check if employees already exist
        const [employeesExist] = await connection.execute(
            'SELECT COUNT(*) as count FROM karyawan'
        );
        
        if (employeesExist[0].count === 0) {
            // Get job positions and work schedules
            const [jobPositions] = await connection.execute('SELECT id, nama_jabatan FROM jabatan ORDER BY id');
            const [workSchedules] = await connection.execute('SELECT id, nama FROM jadwal_kerja ORDER BY id');
            
            if (jobPositions.length === 0 || workSchedules.length === 0) {
                throw new Error('Job positions or work schedules not found. Please run previous migrations first.');
            }
            
            const employees = [
                {
                    nik: '3201234567890001',
                    nama: 'Sarah Manager',
                    email: 'sarah.manager@fleurcafe.com',
                    phone: '081234567001',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Manager')?.id || 1,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Day Shift - Peak Hours')?.id || 2,
                    address: 'Jl. Kemang Raya No. 15, Jakarta Selatan',
                    birth_date: '1990-05-15',
                    hire_date: '2023-01-15'
                },
                {
                    nik: '3201234567890002',
                    nama: 'Ahmad Supervisor',
                    email: 'ahmad.supervisor@fleurcafe.com',
                    phone: '081234567002',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Supervisor')?.id || 2,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Day Shift - Peak Hours')?.id || 2,
                    address: 'Jl. Senopati No. 22, Jakarta Selatan',
                    birth_date: '1988-08-20',
                    hire_date: '2023-02-01'
                },
                {
                    nik: '3201234567890003',
                    nama: 'Maya Barista Senior',
                    email: 'maya.barista@fleurcafe.com',
                    phone: '081234567003',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Barista Senior')?.id || 3,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Morning Shift - Opening Crew')?.id || 1,
                    address: 'Jl. Blok M No. 8, Jakarta Selatan',
                    birth_date: '1995-03-10',
                    hire_date: '2023-03-01'
                },
                {
                    nik: '3201234567890004',
                    nama: 'Rina Cashier',
                    email: 'rina.cashier@fleurcafe.com',
                    phone: '081234567004',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Cashier')?.id || 5,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Day Shift - Peak Hours')?.id || 2,
                    address: 'Jl. Fatmawati No. 12, Jakarta Selatan',
                    birth_date: '1997-07-25',
                    hire_date: '2023-04-15'
                },
                {
                    nik: '3201234567890005',
                    nama: 'Budi Kitchen Staff',
                    email: 'budi.kitchen@fleurcafe.com',
                    phone: '081234567005',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Kitchen Staff')?.id || 6,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Morning Shift - Opening Crew')?.id || 1,
                    address: 'Jl. Cipete No. 5, Jakarta Selatan',
                    birth_date: '1992-12-05',
                    hire_date: '2023-05-01'
                },
                {
                    nik: '3201234567890006',
                    nama: 'Sari Waitress',
                    email: 'sari.waitress@fleurcafe.com',
                    phone: '081234567006',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Waitress')?.id || 7,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Evening Shift - Closing Crew')?.id || 3,
                    address: 'Jl. Pondok Indah No. 18, Jakarta Selatan',
                    birth_date: '1996-09-18',
                    hire_date: '2023-06-01'
                },
                {
                    nik: '3201234567890007',
                    nama: 'Doni Barista',
                    email: 'doni.barista@fleurcafe.com',
                    phone: '081234567007',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Barista')?.id || 4,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Evening Shift - Closing Crew')?.id || 3,
                    address: 'Jl. Kebayoran No. 9, Jakarta Selatan',
                    birth_date: '1994-11-30',
                    hire_date: '2023-07-15'
                },
                {
                    nik: '3201234567890008',
                    nama: 'Lina Cleaning Staff',
                    email: 'lina.cleaning@fleurcafe.com',
                    phone: '081234567008',
                    id_jabatan: jobPositions.find(j => j.nama_jabatan === 'Cleaning Staff')?.id || 8,
                    work_schedule_id: workSchedules.find(s => s.nama === 'Weekend Shift - Full Day')?.id || 4,
                    address: 'Jl. Cilandak No. 7, Jakarta Selatan',
                    birth_date: '1993-04-12',
                    hire_date: '2023-08-01'
                }
            ];
            
            // Hash default PIN
            const defaultPin = await bcrypt.hash('1234', 10);
            
            for (const employee of employees) {
                await connection.execute(`
                    INSERT INTO karyawan (
                        nik, nama, email, phone, id_jabatan, work_schedule_id,
                        address, birth_date, hire_date, is_activated, pin
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    employee.nik, employee.nama, employee.email, employee.phone,
                    employee.id_jabatan, employee.work_schedule_id, employee.address,
                    employee.birth_date, employee.hire_date, true, defaultPin
                ]);
            }
            
            console.log(`✓ ${employees.length} employees created`);
            console.log('✓ Default PIN for all employees: 1234');
        } else {
            console.log('✓ Employees already exist');
        }
        
        console.log('Migration completed: Seed Employees');
        
    } catch (error) {
        console.error('Error in employees seeding:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Seed Employees');
    
    try {
        await connection.execute('DELETE FROM karyawan');
        console.log('✓ Employees removed');
        
    } catch (error) {
        console.error('Error rolling back employees seeding:', error);
        throw error;
    }
}

module.exports = { up, down };