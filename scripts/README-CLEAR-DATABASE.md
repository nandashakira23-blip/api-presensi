# Clear Database Script

Script untuk membersihkan semua data di database tapi tetap mempertahankan struktur tabel.

## ⚠️ PERINGATAN

**Script ini akan menghapus SEMUA data di database!**

Data yang akan dihapus:
- ✅ Semua karyawan (kecuali admin)
- ✅ Semua presensi/attendance
- ✅ Semua log (face recognition, PIN security)
- ✅ Semua referensi wajah
- ✅ Semua summary attendance
- ✅ Custom jabatan (kecuali default)
- ✅ Custom work schedule (kecuali default)

Data yang TIDAK dihapus:
- ❌ Admin user (username: admin, password: admin123)
- ❌ Default jabatan (Manager, Staff, Intern)
- ❌ Default work schedule (Regular 08:00-17:00)
- ❌ Office settings (lokasi kantor, radius, dll)
- ❌ Struktur tabel

## Penggunaan

### Cara 1: Menggunakan npm script (Recommended)
```bash
npm run db:clear
```

### Cara 2: Langsung dengan node
```bash
node scripts/clear-database.js
```

## Proses

Script akan:
1. Menunggu 5 detik untuk konfirmasi (tekan Ctrl+C untuk cancel)
2. Connect ke database
3. Disable foreign key checks
4. Truncate/delete data dari semua tabel
5. Reset admin password ke default
6. Enable foreign key checks kembali
7. Tampilkan summary

## Output

```
==============================================
⚠️  PERINGATAN - CLEAR DATABASE
==============================================
Script ini akan menghapus SEMUA data di database!
Struktur tabel akan tetap dipertahankan.
==============================================

⚠️  WARNING: This will delete ALL data from the database!
Press Ctrl+C to cancel, or wait 5 seconds to continue...

Connecting to database...
Connected to database: presensi_shakira

Starting data cleanup...

1. Clearing attendance_summary...
   Deleted 45 records
2. Clearing face_recognition_stats...
   Deleted 120 records
3. Clearing absensi_face_log...
   Deleted 230 records
4. Clearing pin_security_log...
   Deleted 15 records
5. Clearing presensi...
   Deleted 180 records
6. Clearing karyawan_face_reference...
   Deleted 25 records
7. Clearing karyawan (keeping admin only)...
   Deleted 24 employee records
8. Resetting admin password...
   Admin password reset to: admin123
9. Clearing jabatan (keeping defaults)...
   Deleted 2 custom positions
10. Clearing work_schedule (keeping default)...
   Deleted 1 custom schedules

==============================================
DATABASE CLEANUP SUMMARY
==============================================
✅ All data cleared successfully!

Remaining data:
  - Admin user (username: admin, password: admin123)
  - Default jabatan (Manager, Staff, Intern)
  - Default work schedule (Regular 08:00-17:00)
  - Office settings

Database is ready for fresh data!
==============================================

Database connection closed
```

## Kapan Menggunakan Script Ini?

### 1. Development/Testing
- Reset database untuk testing ulang
- Bersihkan data dummy
- Mulai dari awal dengan data bersih

### 2. Sebelum Production
- Bersihkan data testing sebelum go-live
- Pastikan hanya data production yang ada

### 3. Maintenance
- Bersihkan data lama yang tidak diperlukan
- Reset database setelah demo/presentation

### 4. Troubleshooting
- Fix data corruption
- Reset setelah error migration
- Mulai fresh setelah testing gagal

## Backup Sebelum Clear

**SANGAT DISARANKAN** untuk backup database sebelum menjalankan script ini!

### Cara 1: Menggunakan npm script
```bash
npm run db:backup
```

### Cara 2: Manual MySQL dump
```bash
mysqldump -u shakira -p presensi_shakira > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Cara 3: Copy database
```sql
CREATE DATABASE presensi_shakira_backup;
-- Copy semua tabel ke database backup
```

## Restore Setelah Clear

Jika sudah backup dan ingin restore:

```bash
mysql -u shakira -p presensi_shakira < backup-20260115-120000.sql
```

## Kombinasi dengan Script Lain

### Clear Database + Clean Photos
Bersihkan database dan foto sekaligus:
```bash
npm run db:clear
npm run clean-photos
```

### Clear Database + Fresh Install
Bersihkan dan install ulang dari awal:
```bash
npm run db:clear
npm run db:fresh
```

### Clear Database + Migrate + Seed
Bersihkan, migrate, dan seed data:
```bash
npm run db:clear
npm run migrate:up
npm run seed
```

## Perbedaan dengan Script Lain

### db:clear vs db:fresh
- **db:clear**: Hapus data, struktur tabel tetap ada
- **db:fresh**: Drop semua tabel, buat ulang dari awal

### db:clear vs seed:clear
- **db:clear**: Hapus SEMUA data (kecuali admin & defaults)
- **seed:clear**: Hanya hapus data yang di-seed (karyawan dummy)

## Troubleshooting

### Error: Foreign Key Constraint
Script sudah handle dengan `SET FOREIGN_KEY_CHECKS = 0/1`

### Error: Access Denied
Pastikan user database punya permission DELETE dan TRUNCATE:
```sql
GRANT DELETE, DROP ON presensi_shakira.* TO 'shakira'@'localhost';
```

### Error: Table doesn't exist
Jalankan migration dulu:
```bash
npm run migrate:up
```

## Keamanan

### Production
**JANGAN** jalankan script ini di production tanpa:
1. ✅ Backup database lengkap
2. ✅ Konfirmasi dari stakeholder
3. ✅ Maintenance window
4. ✅ Rollback plan

### Development
Aman dijalankan kapan saja untuk testing.

### Staging
Gunakan dengan hati-hati, pastikan tidak ada data penting.

## Alternatif

Jika tidak ingin hapus semua data, gunakan query manual:

```sql
-- Hapus hanya presensi bulan ini
DELETE FROM presensi WHERE MONTH(tanggal) = MONTH(CURRENT_DATE());

-- Hapus hanya karyawan tertentu
DELETE FROM karyawan WHERE id = 10;

-- Hapus hanya log lama
DELETE FROM absensi_face_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```
