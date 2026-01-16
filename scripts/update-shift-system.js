const mysql = require('mysql2/promise');

async function updateShiftSystem() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'presensi_fleur_atelier'
    });
    
    try {
        console.log('Updating shift system for FLEUR CAFÉ...\n');
        
        // 1. Update work schedules dengan data yang lebih realistis
        console.log('1. Updating work schedules...');
        
        const schedules = [
            {
                id: 5,
                nama: 'Morning Shift - Opening',
                jam_masuk: '06:00:00',
                jam_keluar: '14:00:00',
                batas_absen_masuk_awal: '05:45:00',
                batas_absen_masuk_akhir: '06:15:00',
                batas_absen_keluar_awal: '13:45:00',
                batas_absen_keluar_akhir: '14:15:00',
                hari_kerja: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
            },
            {
                id: 6,
                nama: 'Day Shift - Peak Hours',
                jam_masuk: '09:00:00',
                jam_keluar: '17:00:00',
                batas_absen_masuk_awal: '08:45:00',
                batas_absen_masuk_akhir: '09:15:00',
                batas_absen_keluar_awal: '16:45:00',
                batas_absen_keluar_akhir: '17:15:00',
                hari_kerja: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
            },
            {
                id: 7,
                nama: 'Evening Shift - Closing',
                jam_masuk: '14:00:00',
                jam_keluar: '22:00:00',
                batas_absen_masuk_awal: '13:45:00',
                batas_absen_masuk_akhir: '14:15:00',
                batas_absen_keluar_awal: '21:45:00',
                batas_absen_keluar_akhir: '22:15:00',
                hari_kerja: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
            },
            {
                id: 8,
                nama: 'Weekend Shift - Full Day',
                jam_masuk: '08:00:00',
                jam_keluar: '20:00:00',
                batas_absen_masuk_awal: '07:45:00',
                batas_absen_masuk_akhir: '08:15:00',
                batas_absen_keluar_awal: '19:45:00',
                batas_absen_keluar_akhir: '20:15:00',
                hari_kerja: JSON.stringify(['Saturday', 'Sunday'])
            }
        ];
        
        for (const schedule of schedules) {
            await connection.execute(`
                UPDATE jadwal_kerja SET
                    nama = ?,
                    jam_masuk = ?,
                    jam_keluar = ?,
                    batas_absen_masuk_awal = ?,
                    batas_absen_masuk_akhir = ?,
                    batas_absen_keluar_awal = ?,
                    batas_absen_keluar_akhir = ?,
                    hari_kerja = ?
                WHERE id = ?
            `, [
                schedule.nama, schedule.jam_masuk, schedule.jam_keluar,
                schedule.batas_absen_masuk_awal, schedule.batas_absen_masuk_akhir,
                schedule.batas_absen_keluar_awal, schedule.batas_absen_keluar_akhir,
                schedule.hari_kerja, schedule.id
            ]);
        }
        console.log('✓ Work schedules updated');
        
        // 2. Assign different shifts to employees
        console.log('\n2. Assigning shifts to employees...');
        
        const employeeShifts = [
            { nik: '3201234567890001', shift_id: 6, role: 'Manager - Day Shift' },
            { nik: '3201234567890002', shift_id: 6, role: 'Supervisor - Day Shift' },
            { nik: '3201234567890003', shift_id: 5, role: 'Barista - Morning Shift' },
            { nik: '3201234567890004', shift_id: 6, role: 'Cashier - Day Shift' },
            { nik: '3201234567890005', shift_id: 5, role: 'Kitchen - Morning Shift' },
            { nik: '3201234567890006', shift_id: 7, role: 'Waitress - Evening Shift' },
            { nik: '3201234567890007', shift_id: 7, role: 'Barista - Evening Shift' },
            { nik: '3201234567890008', shift_id: 5, role: 'Cleaning - Morning Shift' }
        ];
        
        for (const emp of employeeShifts) {
            await connection.execute(
                'UPDATE karyawan SET work_schedule_id = ? WHERE nik = ?',
                [emp.shift_id, emp.nik]
            );
            console.log(`✓ ${emp.nik}: ${emp.role}`);
        }
        
        // 3. Show current shift assignments
        console.log('\n3. Current shift assignments:');
        const [assignments] = await connection.execute(`
            SELECT k.nik, k.nama, j.nama as shift_name, j.jam_masuk, j.jam_keluar
            FROM karyawan k
            JOIN jadwal_kerja j ON k.work_schedule_id = j.id
            ORDER BY j.jam_masuk, k.nama
        `);
        
        assignments.forEach(emp => {
            console.log(`   ${emp.nik} - ${emp.nama}: ${emp.shift_name} (${emp.jam_masuk}-${emp.jam_keluar})`);
        });
        
        // 4. Create sample attendance data
        console.log('\n4. Creating sample attendance data...');
        
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
        
        const sampleAttendance = [
            {
                nik: '3201234567890001',
                tanggal: yesterday,
                jam_masuk: '08:55:00',
                jam_keluar: '17:05:00',
                status: 'hadir'
            },
            {
                nik: '3201234567890003',
                tanggal: yesterday,
                jam_masuk: '06:02:00',
                jam_keluar: '14:01:00',
                status: 'hadir'
            },
            {
                nik: '3201234567890004',
                tanggal: yesterday,
                jam_masuk: '09:08:00',
                jam_keluar: '17:02:00',
                status: 'terlambat'
            }
        ];
        
        for (const att of sampleAttendance) {
            // Get employee ID
            const [empResult] = await connection.execute(
                'SELECT id FROM karyawan WHERE nik = ?',
                [att.nik]
            );
            
            if (empResult.length > 0) {
                const empId = empResult[0].id;
                
                // Check if attendance already exists
                const [existing] = await connection.execute(
                    'SELECT id FROM presensi WHERE id_karyawan = ? AND tanggal = ?',
                    [empId, att.tanggal]
                );
                
                if (existing.length === 0) {
                    await connection.execute(`
                        INSERT INTO presensi (
                            id_karyawan, tanggal, jam_masuk, jam_keluar, status,
                            lat_masuk, long_masuk, lat_keluar, long_keluar
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        empId, att.tanggal, att.jam_masuk, att.jam_keluar, att.status,
                        -6.2615, 106.8106, -6.2615, 106.8106
                    ]);
                    console.log(`✓ Sample attendance created for ${att.nik}`);
                }
            }
        }
        
        console.log('\n🎉 Shift system updated successfully!');
        console.log('\nShift Summary:');
        console.log('- Morning Shift (06:00-14:00): Barista, Kitchen, Cleaning');
        console.log('- Day Shift (09:00-17:00): Manager, Supervisor, Cashier');
        console.log('- Evening Shift (14:00-22:00): Waitress, Barista');
        console.log('- Weekend Shift (08:00-20:00): Available for all');
        
    } catch (error) {
        console.error('Error updating shift system:', error);
    } finally {
        await connection.end();
    }
}

updateShiftSystem();