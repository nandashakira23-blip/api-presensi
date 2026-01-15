# Scripts Documentation

Dokumentasi lengkap untuk semua script yang tersedia di project ini.

## 📋 Daftar Scripts

### Database Management

| Script | Command | Deskripsi |
|--------|---------|-----------|
| Setup Database | `npm run setup-db` | Setup database awal |
| Migrate | `npm run migrate:up` | Jalankan migration |
| Rollback | `npm run migrate:down` | Rollback migration |
| Fresh Install | `npm run db:fresh` | Drop & recreate database |
| Backup | `npm run db:backup` | Backup database ke file SQL |
| Clear Database | `npm run db:clear` | Hapus semua data (struktur tetap) |

### Data Seeding

| Script | Command | Deskripsi |
|--------|---------|-----------|
| Seed Data | `npm run seed` | Insert data dummy |
| Clear Seed | `npm run seed:clear` | Hapus data dummy |

### File Management

| Script | Command | Deskripsi |
|--------|---------|-----------|
| Clean Photos | `npm run clean-photos` | Hapus semua foto upload |

### Maintenance

| Script | Command | Deskripsi |
|--------|---------|-----------|
| Reset All | `npm run reset-all` | Reset database + foto |
| Fix PIN Column | `node scripts/fix-pin-column.js` | Fix kolom PIN ke VARCHAR(255) |

### Development

| Script | Command | Deskripsi |
|--------|---------|-----------|
| Start | `npm start` | Jalankan server production |
| Dev | `npm run dev` | Jalankan server development |
| Kill Port | `npm run kill-port` | Kill process di port 3000 |

## 📖 Dokumentasi Detail

### 1. Database Scripts

#### Setup Database (`setup-database.js`)
Setup database awal dengan struktur tabel dasar.

```bash
npm run setup-db
```

**Kapan digunakan:**
- First time setup
- Setelah clone repository

#### Migrate (`migrate.js`)
Jalankan atau rollback migration.

```bash
# Jalankan migration
npm run migrate:up

# Rollback migration
npm run migrate:down

# Fresh migration (down + up)
npm run migrate:fresh
```

**Kapan digunakan:**
- Setelah pull update yang ada migration baru
- Setelah membuat migration baru
- Fix database schema

#### Fresh Install (`fresh-install.js`)
Drop semua tabel dan buat ulang dari awal.

```bash
npm run db:fresh
```

⚠️ **PERINGATAN:** Ini akan menghapus SEMUA data dan tabel!

**Kapan digunakan:**
- Development: Reset total
- Testing: Mulai dari awal
- Fix corruption: Database rusak

#### Backup Database (`backup-database.js`)
Backup database ke file SQL.

```bash
npm run db:backup
```

**Output:** `backups/backup-YYYYMMDD-HHMMSS.sql`

**Kapan digunakan:**
- Sebelum migration
- Sebelum clear database
- Backup rutin
- Sebelum deployment

#### Clear Database (`clear-database.js`)
Hapus semua data tapi struktur tabel tetap ada.

```bash
npm run db:clear
```

**Data yang dihapus:**
- Semua karyawan (kecuali admin)
- Semua presensi
- Semua log
- Custom jabatan & schedule

**Data yang TIDAK dihapus:**
- Admin user
- Default jabatan
- Default work schedule
- Office settings
- Struktur tabel

**Kapan digunakan:**
- Reset data testing
- Bersihkan data dummy
- Persiapan production

📖 **Detail:** [README-CLEAR-DATABASE.md](./README-CLEAR-DATABASE.md)

### 2. File Management Scripts

#### Clean Photos (`clean-photos.js`)
Hapus semua foto di folder uploads.

```bash
npm run clean-photos
```

**Folder yang dibersihkan:**
- `public/uploads/karyawan/`
- `public/uploads/profiles/`
- `public/uploads/absensi/`
- `uploads/`

**File yang dihapus:**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`

**File yang TIDAK dihapus:**
- `.gitkeep`

**Kapan digunakan:**
- Setelah testing
- Bersihkan foto dummy
- Hemat disk space
- Sebelum deployment

📖 **Detail:** [README-CLEAN-PHOTOS.md](./README-CLEAN-PHOTOS.md)

### 3. Maintenance Scripts

#### Reset All (`reset-all.js`)
Reset database dan foto sekaligus.

```bash
npm run reset-all
```

**Proses:**
1. Konfirmasi user
2. Backup database (opsional)
3. Clear database
4. Clean photos
5. Summary

**Kapan digunakan:**
- Reset total untuk testing
- Persiapan demo
- Bersihkan semua data dummy

#### Fix PIN Column (`fix-pin-column.js`)
Fix kolom PIN dari VARCHAR(6) ke VARCHAR(255).

```bash
node scripts/fix-pin-column.js
```

**Kapan digunakan:**
- Setelah pull update fix PIN
- Error "Data too long for column 'pin'"
- Migration 004 belum jalan dengan benar

### 4. Data Seeding Scripts

#### Seed Data (`seed.js`)
Insert data dummy untuk testing.

```bash
npm run seed
```

**Data yang di-insert:**
- 10 karyawan dummy
- Beberapa presensi dummy
- Face reference dummy

#### Clear Seed (`seed.js clear`)
Hapus data dummy yang di-seed.

```bash
npm run seed:clear
```

## 🔄 Workflow Umum

### Development Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd api-presensi

# 2. Install dependencies
npm install

# 3. Setup .env
cp .env.example .env
# Edit .env dengan database credentials

# 4. Setup database
npm run setup-db
npm run migrate:up

# 5. Seed data (opsional)
npm run seed

# 6. Start server
npm run dev
```

### Testing Workflow
```bash
# 1. Reset semua
npm run reset-all

# 2. Seed data baru
npm run seed

# 3. Test aplikasi
npm run dev

# 4. Jika perlu reset lagi
npm run db:clear
npm run clean-photos
```

### Deployment Workflow
```bash
# 1. Backup production database
npm run db:backup

# 2. Pull update
git pull origin main

# 3. Install dependencies
npm install

# 4. Run migration
npm run migrate:up

# 5. Restart server
pm2 restart presensi-api
```

### Maintenance Workflow
```bash
# 1. Backup dulu
npm run db:backup

# 2. Clear data lama
npm run db:clear
npm run clean-photos

# 3. Verify
npm start
```

## ⚠️ Peringatan

### Production
**JANGAN** jalankan script berikut di production tanpa backup:
- ❌ `npm run db:fresh`
- ❌ `npm run db:clear`
- ❌ `npm run reset-all`
- ❌ `npm run clean-photos`

**SELALU** backup dulu:
```bash
npm run db:backup
```

### Development
Aman untuk jalankan semua script.

### Staging
Gunakan dengan hati-hati, pastikan tidak ada data penting.

## 🆘 Troubleshooting

### Error: Cannot connect to database
```bash
# Cek .env
cat .env

# Cek MySQL running
mysql -u root -p

# Test connection
node scripts/check-karyawan-schema.js
```

### Error: Migration failed
```bash
# Rollback dulu
npm run migrate:down

# Cek error
# Fix migration file

# Jalankan lagi
npm run migrate:up
```

### Error: Permission denied
```bash
# Grant permission
mysql -u root -p
GRANT ALL PRIVILEGES ON presensi_shakira.* TO 'shakira'@'localhost';
FLUSH PRIVILEGES;
```

## 📚 Resources

- [Migration Guide](../migrations/README.md)
- [API Documentation](../swagger.js)
- [Database Schema](../migrations/001_initial_setup.js)
