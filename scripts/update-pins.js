const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updatePins() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'presensi_fleur_atelier'
    });
    
    try {
        console.log('Updating PINs for all employees...');
        
        // Generate hash for PIN 1234
        const hashedPin = await bcrypt.hash('1234', 10);
        console.log('Generated hash:', hashedPin);
        
        // Update all employees
        const [result] = await connection.execute(
            'UPDATE karyawan SET pin = ? WHERE nik LIKE ?',
            [hashedPin, '32%']
        );
        
        console.log(`Updated ${result.affectedRows} employees with new PIN hash`);
        
        // Verify
        const [employees] = await connection.execute(
            'SELECT nik, nama FROM karyawan WHERE nik LIKE ? LIMIT 3',
            ['32%']
        );
        
        console.log('Sample employees:');
        employees.forEach(emp => {
            console.log(`- ${emp.nik}: ${emp.nama}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

updatePins();