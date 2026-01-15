# Fix Aktivasi - Langkah-langkah

## Masalah
- Aktivasi gagal dengan error "Data too long for column 'pin'"
- Kolom PIN di database terlalu kecil (VARCHAR(6)) untuk bcrypt hash (60 karakter)
- Android app crash setelah aktivasi berhasil

## Solusi yang Sudah Diterapkan

### 1. Fix Migration File
- File `migrations/004_add_pin_security.js` sudah diupdate
- Kolom PIN sekarang VARCHAR(255) bukan VARCHAR(6)

### 2. Fix Android App
- Tambah error handling di `FaceEnrollmentActivity.kt`
- Tambah try-catch untuk mencegah crash
- Tambah flag `FLAG_ACTIVITY_CLEAR_TASK` saat navigasi ke login

### 3. Script Fix Database
- Buat script `scripts/fix-pin-column.js` untuk fix database yang sudah ada

## Langkah Eksekusi di Server

### Step 1: Push ke GitHub
```bash
git add .
git commit -m "Fix: PIN column size and activation crash"
git push origin main
```

### Step 2: Update di Server
SSH ke server dan jalankan:
```bash
cd /var/www/api-presensi
git pull origin main
```

### Step 3: Fix Database
Jalankan script untuk fix kolom PIN:
```bash
node scripts/fix-pin-column.js
```

Output yang diharapkan:
```
Connecting to database...
Connected to database
Current PIN column: { COLUMN_TYPE: 'varchar(6)', CHARACTER_MAXIMUM_LENGTH: 6 }
Fixing PIN column from VARCHAR(6) to VARCHAR(255)...
PIN column fixed successfully!
Database connection closed
```

### Step 4: Restart PM2
```bash
pm2 restart presensi-api
```

### Step 5: Test Aktivasi
1. Buka Android app
2. Coba aktivasi dengan NIK baru
3. Masukkan PIN 4 digit
4. Upload foto wajah
5. Seharusnya berhasil dan redirect ke login

## Verifikasi

### Cek Kolom Database
```bash
mysql -u shakira -p presensi_shakira -e "DESCRIBE karyawan;"
```

Pastikan kolom `pin` adalah `varchar(255)`.

### Cek Log PM2
```bash
pm2 logs presensi-api --lines 50
```

Pastikan tidak ada error "Data too long for column 'pin'".

### Test dari Android
1. Aktivasi akun baru
2. Pastikan tidak crash
3. Pastikan redirect ke login screen
4. Login dengan NIK dan PIN yang baru dibuat

## Troubleshooting

### Jika masih error "Data too long"
Jalankan manual di MySQL:
```sql
USE presensi_shakira;
ALTER TABLE karyawan MODIFY COLUMN pin VARCHAR(255) DEFAULT NULL;
```

### Jika Android app masih crash
1. Cek logcat di Android Studio
2. Pastikan response dari API benar
3. Cek apakah ada error di `LegacyApiAdapter.kt` atau `AuthRepository.kt`

### Jika tidak bisa login setelah aktivasi
1. Cek apakah PIN tersimpan di database
2. Cek apakah `is_activated` = 1
3. Cek apakah `foto_referensi` tersimpan

```sql
SELECT id, nik, nama, pin, is_activated, foto_referensi 
FROM karyawan 
WHERE nik = 'NIK_YANG_DIAKTIVASI';
```
