# Clean Photos Script

Script untuk membersihkan semua foto yang ada di folder uploads.

## Penggunaan

### Cara 1: Menggunakan npm script (Recommended)
```bash
npm run clean-photos
```

### Cara 2: Langsung dengan node
```bash
node scripts/clean-photos.js
```

## Folder yang Dibersihkan

Script ini akan menghapus semua file gambar di folder berikut:
- `public/uploads/karyawan/` - Foto referensi wajah karyawan
- `public/uploads/profiles/` - Foto profil karyawan
- `public/uploads/absensi/` - Foto absensi (checkin/checkout)
- `uploads/` - Folder upload lainnya (termasuk subfolder)

## File yang Dihapus

Script akan menghapus file dengan ekstensi:
- `.jpg`
- `.jpeg`
- `.png`
- `.gif`
- `.bmp`
- `.webp`

## File yang TIDAK Dihapus

- File `.gitkeep` akan tetap dipertahankan
- File non-gambar tidak akan dihapus

## Output

Script akan menampilkan:
- Daftar file yang dihapus
- Total file yang berhasil dihapus
- Total error (jika ada)

## Contoh Output

```
==============================================
⚠️  PERINGATAN
==============================================
Script ini akan menghapus SEMUA foto di:
  - public/uploads/karyawan
  - public/uploads/profiles
  - public/uploads/absensi
  - uploads

File .gitkeep akan tetap dipertahankan.
==============================================

==============================================
MEMBERSIHKAN SEMUA FOTO
==============================================

Membersihkan folder: public/uploads/karyawan
----------------------------------------------
Dihapus: public/uploads/karyawan/ref-1768447424107-714311659.jpg
Selesai: 1 file dihapus, 0 error

Membersihkan folder: public/uploads/profiles
----------------------------------------------
Selesai: 0 file dihapus, 0 error

Membersihkan folder: public/uploads/absensi
----------------------------------------------
Folder tidak ditemukan: public/uploads/absensi
Selesai: 0 file dihapus, 0 error

Membersihkan folder: uploads
----------------------------------------------
Dihapus: uploads/test/test-1768348701035-683711860.jpg
Selesai: 1 file dihapus, 0 error

==============================================
RINGKASAN
==============================================
Total file dihapus: 2
Total error: 0
==============================================

✅ Semua foto berhasil dibersihkan!
```

## Kapan Menggunakan Script Ini?

1. **Sebelum deployment** - Bersihkan foto testing dari development
2. **Maintenance** - Bersihkan foto lama untuk menghemat disk space
3. **Testing** - Reset foto untuk testing ulang
4. **Fresh start** - Mulai dari awal tanpa foto lama

## Peringatan

⚠️ **HATI-HATI!** Script ini akan menghapus SEMUA foto di folder yang disebutkan. Pastikan Anda sudah backup jika ada foto penting.

## Backup Sebelum Menghapus

Jika ingin backup dulu:
```bash
# Backup folder uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz public/uploads/ uploads/

# Atau copy ke folder lain
cp -r public/uploads/ public/uploads-backup/
cp -r uploads/ uploads-backup/
```

## Restore Setelah Dihapus

Jika sudah backup dan ingin restore:
```bash
# Extract backup
tar -xzf uploads-backup-20260115.tar.gz

# Atau copy dari backup
cp -r public/uploads-backup/* public/uploads/
cp -r uploads-backup/* uploads/
```
