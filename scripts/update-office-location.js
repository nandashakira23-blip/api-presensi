const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateOfficeLocation() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Updating office location to Bali coordinates...');
    
    // User's current location from error log
    const latitude = -8.4000271;
    const longitude = 115.5430133;
    const radius = 100; // 100 meters

    await connection.execute(
      'UPDATE pengaturan SET lat_kantor = ?, long_kantor = ?, radius_meter = ? WHERE id = 1',
      [latitude, longitude, radius]
    );

    console.log('Office location updated successfully!');
    console.log(`  Latitude: ${latitude}`);
    console.log(`  Longitude: ${longitude}`);
    console.log(`  Radius: ${radius} meters`);

    // Verify the update
    const [rows] = await connection.execute('SELECT * FROM pengaturan LIMIT 1');
    console.log('\nCurrent settings:');
    console.log(rows[0]);

  } catch (error) {
    console.error('Error updating office location:', error);
  } finally {
    await connection.end();
  }
}

updateOfficeLocation();
