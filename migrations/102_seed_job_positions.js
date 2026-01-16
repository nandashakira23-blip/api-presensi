/**
 * Migration: Seed Job Positions
 * File: 102_seed_job_positions.js
 * Purpose: Mengisi data jabatan untuk FLEUR CAFÉ
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Seed Job Positions');
    
    try {
        // Check if job positions already exist
        const [jobsExist] = await connection.execute(
            'SELECT COUNT(*) as count FROM jabatan'
        );
        
        if (jobsExist[0].count === 0) {
            const jobPositions = [
                {
                    nama_jabatan: 'Manager',
                    deskripsi: 'Mengelola operasional café secara keseluruhan',
                    gaji_pokok: 8000000,
                    tunjangan: 1500000
                },
                {
                    nama_jabatan: 'Supervisor',
                    deskripsi: 'Mengawasi operasional harian dan staff',
                    gaji_pokok: 6000000,
                    tunjangan: 1000000
                },
                {
                    nama_jabatan: 'Barista Senior',
                    deskripsi: 'Membuat kopi dan minuman dengan keahlian tinggi',
                    gaji_pokok: 5000000,
                    tunjangan: 750000
                },
                {
                    nama_jabatan: 'Barista',
                    deskripsi: 'Membuat kopi dan minuman sesuai standar',
                    gaji_pokok: 4000000,
                    tunjangan: 500000
                },
                {
                    nama_jabatan: 'Cashier',
                    deskripsi: 'Melayani pembayaran dan customer service',
                    gaji_pokok: 3500000,
                    tunjangan: 400000
                },
                {
                    nama_jabatan: 'Kitchen Staff',
                    deskripsi: 'Menyiapkan makanan dan pastry',
                    gaji_pokok: 3500000,
                    tunjangan: 400000
                },
                {
                    nama_jabatan: 'Waitress',
                    deskripsi: 'Melayani customer dan mengantarkan pesanan',
                    gaji_pokok: 3200000,
                    tunjangan: 350000
                },
                {
                    nama_jabatan: 'Cleaning Staff',
                    deskripsi: 'Menjaga kebersihan café',
                    gaji_pokok: 3000000,
                    tunjangan: 300000
                }
            ];
            
            for (const job of jobPositions) {
                await connection.execute(`
                    INSERT INTO jabatan (nama_jabatan, deskripsi, gaji_pokok, tunjangan)
                    VALUES (?, ?, ?, ?)
                `, [job.nama_jabatan, job.deskripsi, job.gaji_pokok, job.tunjangan]);
            }
            
            console.log(`✓ ${jobPositions.length} job positions created`);
        } else {
            console.log('✓ Job positions already exist');
        }
        
        console.log('Migration completed: Seed Job Positions');
        
    } catch (error) {
        console.error('Error in job positions seeding:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Seed Job Positions');
    
    try {
        await connection.execute('DELETE FROM jabatan');
        console.log('✓ Job positions removed');
        
    } catch (error) {
        console.error('Error rolling back job positions seeding:', error);
        throw error;
    }
}

module.exports = { up, down };