/**
 * Script to update office location radius to 300 meters
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateRadius() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'presensi_fleur_atelier'
        });
        
        console.log('✓ Connected to database');
        
        // Update radius to 300 meters
        console.log('\nUpdating radius to 300 meters...');
        await connection.execute(
            'UPDATE pengaturan SET radius_meter = 300 WHERE id = 1'
        );
        console.log('✓ Radius updated to 300 meters');
        
        // Show current settings
        console.log('\nCurrent office location settings:');
        const [rows] = await connection.execute('SELECT * FROM pengaturan WHERE id = 1');
        
        if (rows.length > 0) {
            const setting = rows[0];
            console.log('─────────────────────────────────────');
            console.log(`Latitude:  ${setting.lat_kantor}`);
            console.log(`Longitude: ${setting.long_kantor}`);
            console.log(`Radius:    ${setting.radius_meter} meters`);
            console.log('─────────────────────────────────────');
        }
        
        console.log('\n✓ Radius update completed successfully!');
        
    } catch (error) {
        console.error('Error updating radius:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the update
updateRadius();
