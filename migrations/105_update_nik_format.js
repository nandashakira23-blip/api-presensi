/**
 * Migration: Update NIK Format
 * File: 105_update_nik_format.js
 * Purpose: Update NIK format menjadi 16 digit angka dan update data existing
 */

const mysql = require('mysql2/promise');

async function up(connection) {
    console.log('Running migration: Update NIK Format');
    
    try {
        // 1. Update existing employees with new 16-digit NIK format
        const nikUpdates = [
            { oldNik: 'EMP001', newNik: '3201234567890001' },
            { oldNik: 'EMP002', newNik: '3201234567890002' },
            { oldNik: 'EMP003', newNik: '3201234567890003' },
            { oldNik: 'EMP004', newNik: '3201234567890004' },
            { oldNik: 'EMP005', newNik: '3201234567890005' },
            { oldNik: 'EMP006', newNik: '3201234567890006' },
            { oldNik: 'EMP007', newNik: '3201234567890007' },
            { oldNik: 'EMP008', newNik: '3201234567890008' },
            { oldNik: 'FLEUR001', newNik: '3201234567890001' },
            { oldNik: 'FLEUR002', newNik: '3201234567890002' },
            { oldNik: 'FLEUR003', newNik: '3201234567890003' },
            { oldNik: 'FLEUR004', newNik: '3201234567890004' },
            { oldNik: 'FLEUR005', newNik: '3201234567890005' },
            { oldNik: 'FLEUR006', newNik: '3201234567890006' },
            { oldNik: 'FLEUR007', newNik: '3201234567890007' },
            { oldNik: 'FLEUR008', newNik: '3201234567890008' }
        ];
        
        // Get all current employees to see what needs updating
        const [allEmployees] = await connection.execute('SELECT nik, nama FROM karyawan');
        console.log('Current employees:', allEmployees.map(e => `${e.nik} - ${e.nama}`));
        
        for (const update of nikUpdates) {
            const [existing] = await connection.execute(
                'SELECT id FROM karyawan WHERE nik = ?',
                [update.oldNik]
            );
            
            if (existing.length > 0) {
                // Check if target NIK already exists
                const [targetExists] = await connection.execute(
                    'SELECT id FROM karyawan WHERE nik = ?',
                    [update.newNik]
                );
                
                if (targetExists.length === 0) {
                    await connection.execute(
                        'UPDATE karyawan SET nik = ? WHERE nik = ?',
                        [update.newNik, update.oldNik]
                    );
                    console.log(`✓ Updated NIK: ${update.oldNik} -> ${update.newNik}`);
                } else {
                    console.log(`⚠️  Target NIK ${update.newNik} already exists, skipping ${update.oldNik}`);
                }
            }
        }
        
        // 2. Modify NIK column to be exactly 16 characters
        await connection.execute(`
            ALTER TABLE karyawan 
            MODIFY COLUMN nik VARCHAR(16) NOT NULL COMMENT '16 digit angka NIK'
        `);
        console.log('✓ NIK column updated to VARCHAR(16)');
        
        // 3. Add constraint to ensure NIK is exactly 16 digits
        try {
            await connection.execute(`
                ALTER TABLE karyawan 
                ADD CONSTRAINT chk_nik_format 
                CHECK (nik REGEXP '^[0-9]{16}$')
            `);
            console.log('✓ NIK format constraint added (16 digits only)');
        } catch (error) {
            if (error.code !== 'ER_CHECK_CONSTRAINT_DUP_NAME') {
                throw error;
            }
            console.log('✓ NIK format constraint already exists');
        }
        
        console.log('Migration completed: Update NIK Format');
        
    } catch (error) {
        console.error('Error in NIK format update migration:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Update NIK Format');
    
    try {
        // Remove constraint
        try {
            await connection.execute('ALTER TABLE karyawan DROP CONSTRAINT chk_nik_format');
        } catch (error) {
            // Constraint might not exist
        }
        
        // Revert column size
        await connection.execute(`
            ALTER TABLE karyawan 
            MODIFY COLUMN nik VARCHAR(20) NOT NULL
        `);
        
        console.log('✓ NIK format changes reverted');
        
    } catch (error) {
        console.error('Error rolling back NIK format update:', error);
        throw error;
    }
}

module.exports = { up, down };