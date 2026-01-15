/**
 * Script untuk memperbaiki field mapping schedule di routes/api.js
 * Mengganti field dari format lama ke format database jadwal_kerja
 */

const fs = require('fs');
const path = require('path');

const apiFilePath = path.join(__dirname, '..', 'routes', 'api.js');

console.log('Reading routes/api.js...');
let content = fs.readFileSync(apiFilePath, 'utf8');

console.log('Replacing field mappings...');

// Replace schedule field references
// Note: Harus hati-hati dengan urutan replacement agar tidak double replace

// 1. Replace schedule.work_days -> schedule.hari_kerja
content = content.replace(/schedule\.work_days/g, 'schedule.hari_kerja');

// 2. Replace schedule.clock_in_start -> schedule.batas_absen_masuk_awal
content = content.replace(/schedule\.clock_in_start/g, 'schedule.batas_absen_masuk_awal');

// 3. Replace schedule.clock_in_end -> schedule.batas_absen_masuk_akhir
content = content.replace(/schedule\.clock_in_end/g, 'schedule.batas_absen_masuk_akhir');

// 4. Replace schedule.clock_out_start -> schedule.batas_absen_keluar_awal
content = content.replace(/schedule\.clock_out_start/g, 'schedule.batas_absen_keluar_awal');

// 5. Replace schedule.clock_out_end -> schedule.batas_absen_keluar_akhir
content = content.replace(/schedule\.clock_out_end/g, 'schedule.batas_absen_keluar_akhir');

// 6. Replace schedule.start_time -> schedule.jam_masuk
content = content.replace(/schedule\.start_time/g, 'schedule.jam_masuk');

// 7. Replace schedule.end_time -> schedule.jam_keluar
content = content.replace(/schedule\.end_time/g, 'schedule.jam_keluar');

// 8. Replace schedule.name (tapi jangan yang schedule.name_jabatan)
content = content.replace(/schedule\.name([^_])/g, 'schedule.nama$1');
content = content.replace(/schedule\.name$/gm, 'schedule.nama');

console.log('Writing updated file...');
fs.writeFileSync(apiFilePath, content, 'utf8');

console.log('✅ Field mapping fixed successfully!');
console.log('');
console.log('Replaced:');
console.log('  - schedule.work_days -> schedule.hari_kerja');
console.log('  - schedule.clock_in_start -> schedule.batas_absen_masuk_awal');
console.log('  - schedule.clock_in_end -> schedule.batas_absen_masuk_akhir');
console.log('  - schedule.clock_out_start -> schedule.batas_absen_keluar_awal');
console.log('  - schedule.clock_out_end -> schedule.batas_absen_keluar_akhir');
console.log('  - schedule.start_time -> schedule.jam_masuk');
console.log('  - schedule.end_time -> schedule.jam_keluar');
console.log('  - schedule.name -> schedule.nama');
