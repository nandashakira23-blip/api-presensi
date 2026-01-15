# Face Matching App - AI Powered with Database

Aplikasi web Express.js untuk pencocokan wajah dengan AI face detection dan database SQLite untuk persistence.

## ✨ Fitur Utama

- **🤖 AI Face Detection** - TensorFlow.js MediaPipe
- **📸 Multiple Input Methods** - Upload file, camera capture, real-time
- **💾 Database Storage** - SQLite untuk menyimpan foto dan hasil
- **📊 Match History** - Riwayat pencocokan tersimpan
- **🎥 Real-time Matching** - Live face matching dari kamera
- **📈 Statistics** - Match rate dan analytics

## 🗄️ Database Features

- **Persistent Storage** - Foto referensi tersimpan di database
- **Match History** - Semua hasil pencocokan disimpan
- **Auto Cleanup** - File management otomatis
- **Reference Management** - Hanya satu referensi aktif per waktu

## 🚀 Instalasi

1. Install dependencies:
```bash
npm install
```

2. Jalankan aplikasi:
```bash
npm start
```

3. Buka browser: `http://localhost:3000`

## 📋 Cara Penggunaan

### 1. Upload Foto Referensi
- **Upload File** atau **Ambil dari Kamera**
- Foto otomatis disimpan ke database
- AI akan mendeteksi wajah dan menyimpan data

### 2. Pencocokan Wajah (3 Mode)
- **📁 Upload File** - Upload gambar untuk dicocokkan
- **📷 Ambil Foto** - Capture dari kamera
- **🎥 Real-time** - Live matching dengan overlay visual

### 3. Real-time Mode
- Live camera feed dengan face detection
- Visual indicators (hijau = match, merah = no match)
- Real-time statistics dan match rate

## 🛠️ Teknologi

- **Backend**: Express.js, Node.js
- **Database**: SQLite3 dengan auto-schema
- **AI/ML**: TensorFlow.js, MediaPipe Face Detection
- **Image Processing**: Sharp
- **Frontend**: HTML5, CSS3, JavaScript
- **File Upload**: Multer v2

## 📊 API Endpoints

- `POST /upload-reference` - Upload foto referensi ke database
- `POST /match-face` - Cocokkan wajah dan simpan hasil
- `GET /reference-status` - Status foto referensi dari database
- `DELETE /reference` - Hapus foto referensi dari database
- `GET /match-history` - Ambil riwayat pencocokan
- `GET /uploads/:filename` - Akses file yang diupload

## 🗃️ Database Schema

### reference_photos
- `id` - Primary key
- `filename` - Nama file unik
- `original_name` - Nama file asli
- `file_path` - Path file di server
- `faces_data` - Data wajah (JSON)
- `faces_count` - Jumlah wajah terdeteksi
- `upload_time` - Waktu upload
- `is_active` - Status aktif (hanya 1 yang aktif)

### match_history
- `id` - Primary key
- `reference_id` - FK ke reference_photos
- `match_filename` - File yang dicocokkan
- `faces_detected` - Jumlah wajah terdeteksi
- `match_results` - Hasil pencocokan (JSON)
- `match_time` - Waktu pencocokan

## 🔧 Fitur Database

### Auto-Management
- **Single Active Reference** - Hanya satu foto referensi aktif
- **File Cleanup** - Hapus file otomatis saat delete dari database
- **Error Handling** - Rollback file jika database error

### Persistence
- **Restart Safe** - Data tetap ada setelah restart server
- **History Tracking** - Semua aktivitas tersimpan
- **Statistics Ready** - Data siap untuk analytics

## 📈 Performance

- **Database Indexing** - Query cepat dengan proper indexing
- **File Management** - Efficient file storage dan cleanup
- **Memory Optimization** - Database connection pooling
- **AI Model Caching** - Model dimuat sekali saat startup

## 🔒 Data Security

- **Input Validation** - Validasi file dan data input
- **SQL Injection Protection** - Prepared statements
- **File Type Validation** - Hanya image files yang diterima
- **Error Handling** - Proper error handling dan logging

## 📝 Catatan

- Database SQLite otomatis dibuat saat pertama kali run
- Foto referensi lama otomatis di-deactivate saat upload baru
- File cleanup otomatis saat delete dari database
- Real-time mode membutuhkan camera permission