require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanDuplicateSettings() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Checking for duplicate settings...\n');

    // Get all settings
    const [rows] = await connection.execute(
      'SELECT * FROM pengaturan ORDER BY id'
    );

    console.log(`Found ${rows.length} rows in pengaturan table`);

    if (rows.length <= 1) {
      console.log('No duplicates found. All good!');
      return;
    }

    // Keep the first one, delete the rest
    const keepId = rows[0].id;
    console.log(`\nKeeping row with ID: ${keepId}`);
    console.log(`  Lokasi: ${rows[0].lat_kantor}, ${rows[0].long_kantor}`);
    console.log(`  Radius: ${rows[0].radius_meter}m`);

    console.log(`\nDeleting ${rows.length - 1} duplicate rows...`);
    
    const [result] = await connection.execute(
      'DELETE FROM pengaturan WHERE id != ?',
      [keepId]
    );

    console.log(`Deleted ${result.affectedRows} rows`);
    console.log('\nDone! Only one setting remains.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

cleanDuplicateSettings();
