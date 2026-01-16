/**
 * Migration: Seed Core Data
 * File: 101_seed_core_data.js
 * Purpose: Mengisi data dasar (admin, pengaturan, face recognition settings)
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function up(connection) {
    console.log('Running migration: Seed Core Data');
    
    try {
        // 1. Insert default admin
        const [adminExists] = await connection.execute(
            'SELECT COUNT(*) as count FROM admin WHERE username = ?',
            ['admin']
        );
        
        if (adminExists[0].count === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.execute(
                'INSERT INTO admin (username, password) VALUES (?, ?)',
                ['admin', hashedPassword]
            );
            console.log('✓ Default admin created');
        } else {
            console.log('✓ Admin already exists');
        }
        
        // 2. Insert default pengaturan
        const [settingsExists] = await connection.execute(
            'SELECT COUNT(*) as count FROM pengaturan'
        );
        
        if (settingsExists[0].count === 0) {
            await connection.execute(`
                INSERT INTO pengaturan (
                    lat_kantor, long_kantor, radius_meter,
                    pin_required, pin_max_attempts, pin_lockout_minutes,
                    face_and_pin_required
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [-6.2615, 106.8106, 50, true, 3, 30, true]);
            console.log('✓ Default settings created');
        } else {
            console.log('✓ Settings already exist');
        }
        
        // 3. Insert face recognition settings
        const [faceSettingsExists] = await connection.execute(
            'SELECT COUNT(*) as count FROM face_recognition_settings'
        );
        
        if (faceSettingsExists[0].count === 0) {
            await connection.execute(`
                INSERT INTO face_recognition_settings (
                    similarity_threshold, max_face_distance,
                    min_face_size, max_processing_time_ms
                ) VALUES (?, ?, ?, ?)
            `, [0.6000, 0.4000, 50, 5000]);
            console.log('✓ Face recognition settings created');
        } else {
            console.log('✓ Face recognition settings already exist');
        }
        
        console.log('Migration completed: Seed Core Data');
        
    } catch (error) {
        console.error('Error in core data seeding:', error);
        throw error;
    }
}

async function down(connection) {
    console.log('Rolling back: Seed Core Data');
    
    try {
        await connection.execute('DELETE FROM face_recognition_settings');
        await connection.execute('DELETE FROM pengaturan');
        await connection.execute('DELETE FROM admin WHERE username = ?', ['admin']);
        console.log('✓ Core data removed');
        
    } catch (error) {
        console.error('Error rolling back core data seeding:', error);
        throw error;
    }
}

module.exports = { up, down };