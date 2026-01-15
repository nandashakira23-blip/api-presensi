const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { requireAuth, redirectIfAuth } = require('../middleware/auth');

const router = express.Router();

// Konfigurasi multer untuk upload foto referensi karyawan
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/karyawan/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ref-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Konfigurasi multer untuk testing (temporary uploads)
const testStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/test/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'test-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const testUpload = multer({ 
    storage: testStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Login page
router.get('/login', redirectIfAuth, (req, res) => {
    res.render('admin/login', { 
        title: 'Admin Login - Fleur Atelier',
        error: req.flash('error')
    });
});

// Login process
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, password: password ? '***' : 'empty' });
    
    if (!username || !password) {
        console.log('Missing username or password');
        req.flash('error', 'Username dan password harus diisi');
        return res.redirect('/admin/login');
    }

    const query = 'SELECT id, username, password FROM admin WHERE username = ?';
    
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.flash('error', 'Terjadi kesalahan sistem');
            return res.redirect('/admin/login');
        }

        console.log('Query results:', results.length, 'users found');

        if (results.length === 0) {
            console.log('User not found');
            req.flash('error', 'Username tidak ditemukan');
            return res.redirect('/admin/login');
        }

        const admin = results[0];
        console.log('Found admin:', admin.username);
        
        bcrypt.compare(password, admin.password, (err, isValidPassword) => {
            if (err) {
                console.error('Bcrypt error:', err);
                req.flash('error', 'Terjadi kesalahan sistem');
                return res.redirect('/admin/login');
            }
            
            console.log('Password valid:', isValidPassword);
            
            if (!isValidPassword) {
                console.log('Invalid password');
                req.flash('error', 'Password salah');
                return res.redirect('/admin/login');
            }

            req.session.admin = {
                id: admin.id,
                username: admin.username
            };

            console.log('Session set, saving...');

            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    req.flash('error', 'Terjadi kesalahan saat menyimpan session');
                    return res.redirect('/admin/login');
                }
                console.log('Login successful, redirecting to dashboard');
                res.redirect('/admin/dashboard');
            });
        });
    });
});

// Dashboard
router.get('/dashboard', requireAuth, (req, res) => {
    // Simple stats without complex query for now
    const defaultStats = {
        total_karyawan: 0,
        belum_aktivasi: 0,
        hadir_hari_ini: 0
    };

    db.query('SELECT COUNT(*) as total FROM karyawan', (err, results) => {
        if (err) {
            console.error('Dashboard error:', err);
            return res.render('admin/dashboard', { 
                title: 'Dashboard - Fleur Atelier',
                admin: req.session.admin,
                stats: defaultStats
            });
        }
        
        const stats = {
            total_karyawan: results[0]?.total || 0,
            belum_aktivasi: 0,
            hadir_hari_ini: 0
        };
        
        res.render('admin/dashboard', { 
            title: 'Dashboard - Fleur Atelier',
            admin: req.session.admin,
            stats: stats
        });
    });
});

// API for attendance chart data
router.get('/api/attendance-chart-data', requireAuth, (req, res) => {
    // Get attendance data for the last 7 days
    const query = `
        SELECT 
            DATE(waktu) as tanggal,
            COUNT(*) as jumlah_absensi
        FROM presensi 
        WHERE waktu >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(waktu)
        ORDER BY tanggal ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Chart data error:', err);
            return res.json({ success: false, message: 'Gagal memuat data grafik' });
        }
        
        // Create labels and data arrays for the last 7 days
        const today = new Date();
        const labels = [];
        const data = [];
        const attendanceMap = {};
        
        // Map results by date
        results.forEach(row => {
            const dateStr = row.tanggal.toISOString().split('T')[0];
            attendanceMap[dateStr] = row.jumlah_absensi;
        });
        
        // Generate data for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            labels.push(date.toLocaleDateString('id-ID', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
            }));
            
            data.push(attendanceMap[dateStr] || 0);
        }
        
        res.json({
            success: true,
            chartData: {
                labels: labels,
                data: data
            }
        });
    });
});

// Master Karyawan - List
router.get('/karyawan', requireAuth, (req, res) => {
    const query = `
        SELECT k.id, k.nik, k.nama, k.id_jabatan, j.nama_jabatan as jabatan, k.is_activated, k.foto_referensi, k.created_at 
        FROM karyawan k 
        LEFT JOIN jabatan j ON k.id_jabatan = j.id 
        ORDER BY k.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Karyawan list error:', err);
            return res.render('admin/karyawan/index', { 
                title: 'Master Karyawan - Fleur Atelier',
                admin: req.session.admin,
                karyawan: [],
                success: req.flash('success'),
                error: req.flash('error')
            });
        }
        
        res.render('admin/karyawan/index', { 
            title: 'Master Karyawan - Fleur Atelier',
            admin: req.session.admin,
            karyawan: results,
            success: req.flash('success'),
            error: req.flash('error')
        });
    });
});

// Master Karyawan - Add Form
router.get('/karyawan/add', requireAuth, (req, res) => {
    // Get jabatan list
    const jabatanQuery = 'SELECT id, nama_jabatan, deskripsi FROM jabatan WHERE is_active = TRUE ORDER BY nama_jabatan';
    
    db.query(jabatanQuery, (err, jabatanResults) => {
        if (err) {
            console.error('Jabatan query error:', err);
            return res.render('admin/karyawan/add', { 
                title: 'Tambah Karyawan - Fleur Atelier',
                admin: req.session.admin,
                jabatan: [],
                error: req.flash('error')
            });
        }

        res.render('admin/karyawan/add', { 
            title: 'Tambah Karyawan - Fleur Atelier',
            admin: req.session.admin,
            jabatan: jabatanResults,
            error: req.flash('error')
        });
    });
});

// Master Karyawan - Add Process
router.post('/karyawan/add', requireAuth, (req, res) => {
    upload.single('foto_referensi')(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            // Multer error (file size, etc)
            req.flash('error', 'Error upload file: ' + err.message);
            return res.redirect('/admin/karyawan/add');
        } else if (err) {
            // Other errors
            req.flash('error', 'Error: ' + err.message);
            return res.redirect('/admin/karyawan/add');
        }
        
        // No error, proceed with saving
        const { nik, nama, id_jabatan } = req.body;
        
        if (!nik || !nama || !id_jabatan) {
            req.flash('error', 'Semua field harus diisi');
            return res.redirect('/admin/karyawan/add');
        }

        const fotoPath = req.file ? req.file.filename : null;
        const query = 'INSERT INTO karyawan (nik, nama, id_jabatan, foto_referensi) VALUES (?, ?, ?, ?)';
        
        db.query(query, [nik, nama, id_jabatan, fotoPath], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    req.flash('error', 'NIK sudah terdaftar');
                } else {
                    req.flash('error', 'Gagal menambah karyawan: ' + err.message);
                }
                return res.redirect('/admin/karyawan/add');
            }

            const karyawanId = results.insertId;

            // If photo uploaded, process for face recognition
            if (req.file) {
                try {
                    const { detectFaces } = require('../utils/face-recognition');
                    const fullPath = req.file.path;
                    
                    // Detect faces in uploaded photo
                    const faces = await detectFaces(fullPath);
                    
                    if (faces.length > 0) {
                        // Save to karyawan_face_reference table
                        const faceQuery = `
                            INSERT INTO karyawan_face_reference 
                            (karyawan_id, filename, original_name, file_path, faces_data, faces_count, is_active) 
                            VALUES (?, ?, ?, ?, ?, ?, TRUE)
                        `;
                        
                        db.query(faceQuery, [
                            karyawanId,
                            req.file.filename,
                            req.file.originalname,
                            fullPath,
                            JSON.stringify(faces),
                            faces.length
                        ], (faceErr) => {
                            if (faceErr) {
                                console.error('Face reference save error:', faceErr);
                                // Don't fail the whole operation, just log
                            } else {
                                console.log(`Face reference saved for karyawan ${karyawanId}: ${faces.length} face(s) detected`);
                            }
                        });
                    } else {
                        console.log(`No faces detected in photo for karyawan ${karyawanId}`);
                    }
                } catch (faceError) {
                    console.error('Face detection error:', faceError);
                    // Don't fail the whole operation
                }
            }

            req.flash('success', 'Karyawan berhasil ditambahkan');
            res.redirect('/admin/karyawan');
        });
    });
});

// Master Karyawan - Delete
router.post('/karyawan/delete/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = 'DELETE FROM karyawan WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            req.flash('error', 'Gagal menghapus karyawan');
        } else {
            req.flash('success', 'Karyawan berhasil dihapus');
        }
        res.redirect('/admin/karyawan');
    });
});

// Master Karyawan - Update (API)
router.post('/karyawan/update', requireAuth, (req, res) => {
    const { id, nik, nama, id_jabatan } = req.body;
    
    if (!id || !nik || !nama || !id_jabatan) {
        return res.json({ success: false, message: 'Semua field harus diisi' });
    }

    const query = 'UPDATE karyawan SET nik = ?, nama = ?, id_jabatan = ? WHERE id = ?';
    
    db.query(query, [nik.trim(), nama.trim(), id_jabatan, id], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'NIK sudah terdaftar oleh karyawan lain' });
            }
            return res.json({ success: false, message: 'Gagal mengupdate karyawan' });
        }

        if (results.affectedRows === 0) {
            return res.json({ success: false, message: 'Karyawan tidak ditemukan' });
        }

        res.json({ success: true, message: 'Karyawan berhasil diupdate' });
    });
});

// Master Karyawan - Reset (API)
router.post('/karyawan/reset', requireAuth, (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        return res.json({ success: false, message: 'ID karyawan harus diisi' });
    }
    
    // Reset karyawan: hapus foto referensi dan face recognition data, set is_activated = 0
    // Data absensi tetap tersimpan
    const query = 'UPDATE karyawan SET foto_referensi = NULL, face_enrollment_data = NULL, is_activated = 0 WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            return res.json({ success: false, message: 'Gagal mereset karyawan' });
        }

        if (results.affectedRows === 0) {
            return res.json({ success: false, message: 'Karyawan tidak ditemukan' });
        }

        res.json({ 
            success: true, 
            message: 'Karyawan berhasil direset. Foto referensi dan data face recognition telah dihapus. Karyawan dapat melakukan aktivasi ulang di aplikasi Android.' 
        });
    });
});

// Laporan Absensi
router.get('/laporan', requireAuth, (req, res) => {
    const { tanggal } = req.query;
    let whereClause = '';
    let queryParams = [];
    
    if (tanggal) {
        whereClause = 'WHERE DATE(p.waktu) = ?';
        queryParams.push(tanggal);
    } else {
        whereClause = 'WHERE DATE(p.waktu) = CURDATE()';
    }
    
    const query = `
        SELECT 
            p.id,
            k.nama,
            j.nama_jabatan as jabatan,
            p.waktu,
            p.lat_absen,
            p.long_absen,
            p.foto_checkin,
            p.status_lokasi,
            p.jarak_meter
        FROM presensi p
        JOIN karyawan k ON p.id_karyawan = k.id
        LEFT JOIN jabatan j ON k.id_jabatan = j.id
        ${whereClause}
        ORDER BY p.waktu DESC
    `;
    
    // Also get office settings for map
    const settingQuery = 'SELECT lat_kantor, long_kantor, radius_meter FROM pengaturan LIMIT 1';
    
    db.query(query, queryParams, (err, presensiResults) => {
        if (err) {
            console.error('Laporan error:', err);
            return res.render('admin/laporan', { 
                title: 'Laporan Absensi - Fleur Atelier',
                admin: req.session.admin,
                presensi: [],
                tanggal: tanggal || new Date().toISOString().split('T')[0],
                officeSetting: { lat_kantor: -8.8155675, long_kantor: 115.1253343, radius_meter: 100 }
            });
        }

        db.query(settingQuery, (settingErr, settingResults) => {
            const officeSetting = settingResults && settingResults.length > 0 
                ? settingResults[0] 
                : { lat_kantor: -8.8155675, long_kantor: 115.1253343, radius_meter: 100 };

            res.render('admin/laporan', { 
                title: 'Laporan Absensi - Fleur Atelier',
                admin: req.session.admin,
                presensi: presensiResults,
                tanggal: tanggal || new Date().toISOString().split('T')[0],
                officeSetting: officeSetting
            });
        });
    });
});

// Setting Lokasi
router.get('/setting', requireAuth, (req, res) => {
    const query = 'SELECT * FROM pengaturan LIMIT 1';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Setting error:', err);
            return res.render('admin/setting', { 
                title: 'Setting Lokasi - Fleur Atelier',
                admin: req.session.admin,
                setting: { lat_kantor: -8.8155675, long_kantor: 115.1253343, radius_meter: 100 },
                success: req.flash('success'),
                error: req.flash('error')
            });
        }

        const setting = results.length > 0 ? results[0] : { lat_kantor: -8.8155675, long_kantor: 115.1253343, radius_meter: 100 };
        
        res.render('admin/setting', { 
            title: 'Setting Lokasi - Fleur Atelier',
            admin: req.session.admin,
            setting: setting,
            success: req.flash('success'),
            error: req.flash('error')
        });
    });
});

// Setting Lokasi - Update
router.post('/setting', requireAuth, (req, res) => {
    const { lat_kantor, long_kantor, radius_meter } = req.body;
    
    if (!lat_kantor || !long_kantor || !radius_meter) {
        req.flash('error', 'Semua field harus diisi');
        return res.redirect('/admin/setting');
    }

    const query = 'UPDATE pengaturan SET lat_kantor = ?, long_kantor = ?, radius_meter = ? WHERE id = 1';
    
    db.query(query, [lat_kantor, long_kantor, radius_meter], (err, results) => {
        if (err) {
            req.flash('error', 'Gagal mengupdate pengaturan');
        } else {
            req.flash('success', 'Pengaturan berhasil diupdate');
        }
        res.redirect('/admin/setting');
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin/login');
    });
});

// ===== WORK SCHEDULE ROUTES =====

// Work Schedule - List
router.get('/work-schedule', requireAuth, (req, res) => {
    const query = `
        SELECT ws.*, 
               COUNT(k.id) as employee_count
        FROM work_schedule ws
        LEFT JOIN karyawan k ON ws.id = k.work_schedule_id
        GROUP BY ws.id
        ORDER BY ws.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Work schedule list error:', err);
            return res.render('admin/work-schedule/index', { 
                title: 'Jadwal Kerja - Fleur Atelier',
                admin: req.session.admin,
                schedules: [],
                success: req.flash('success'),
                error: req.flash('error')
            });
        }
        
        res.render('admin/work-schedule/index', { 
            title: 'Jadwal Kerja - Fleur Atelier',
            admin: req.session.admin,
            schedules: results,
            success: req.flash('success'),
            error: req.flash('error')
        });
    });
});

// Work Schedule - Add Form
router.get('/work-schedule/add', requireAuth, (req, res) => {
    res.render('admin/work-schedule/add', { 
        title: 'Tambah Jadwal Kerja - Fleur Atelier',
        admin: req.session.admin,
        error: req.flash('error')
    });
});

// Work Schedule - Add Process
router.post('/work-schedule/add', requireAuth, (req, res) => {
    const { name, start_time, end_time, clock_in_start, clock_in_end, clock_out_start, clock_out_end, work_days } = req.body;
    
    if (!name || !start_time || !end_time) {
        req.flash('error', 'Nama jadwal, jam mulai, dan jam selesai harus diisi');
        return res.redirect('/admin/work-schedule/add');
    }

    const workDaysArray = Array.isArray(work_days) ? work_days : [work_days].filter(Boolean);
    const workDaysJson = JSON.stringify(workDaysArray);

    const query = `
        INSERT INTO work_schedule (name, start_time, end_time, clock_in_start, clock_in_end, clock_out_start, clock_out_end, work_days) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [name, start_time, end_time, clock_in_start, clock_in_end, clock_out_start, clock_out_end, workDaysJson], (err, results) => {
        if (err) {
            console.error('Add work schedule error:', err);
            req.flash('error', 'Gagal menambah jadwal kerja');
            return res.redirect('/admin/work-schedule/add');
        }

        req.flash('success', 'Jadwal kerja berhasil ditambahkan');
        res.redirect('/admin/work-schedule');
    });
});

// Work Schedule - Edit Form
router.get('/work-schedule/edit/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = 'SELECT * FROM work_schedule WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Work schedule edit error:', err);
            req.flash('error', 'Gagal memuat data jadwal kerja');
            return res.redirect('/admin/work-schedule');
        }
        
        if (results.length === 0) {
            req.flash('error', 'Jadwal kerja tidak ditemukan');
            return res.redirect('/admin/work-schedule');
        }
        
        res.render('admin/work-schedule/edit', { 
            title: 'Edit Jadwal Kerja - Fleur Atelier',
            admin: req.session.admin,
            schedule: results[0],
            error: req.flash('error')
        });
    });
});

// Work Schedule - Update Process
router.post('/work-schedule/update', requireAuth, (req, res) => {
    const { id, name, start_time, end_time, clock_in_start, clock_in_end, clock_out_start, clock_out_end, work_days } = req.body;
    
    if (!id || !name || !start_time || !end_time) {
        req.flash('error', 'Nama jadwal, jam mulai, dan jam selesai harus diisi');
        return res.redirect(`/admin/work-schedule/edit/${id}`);
    }

    const workDaysArray = Array.isArray(work_days) ? work_days : [work_days].filter(Boolean);
    const workDaysJson = JSON.stringify(workDaysArray);

    const query = `
        UPDATE work_schedule 
        SET name = ?, start_time = ?, end_time = ?, clock_in_start = ?, clock_in_end = ?, clock_out_start = ?, clock_out_end = ?, work_days = ?
        WHERE id = ?
    `;
    
    db.query(query, [name, start_time, end_time, clock_in_start, clock_in_end, clock_out_start, clock_out_end, workDaysJson, id], (err, results) => {
        if (err) {
            console.error('Update work schedule error:', err);
            req.flash('error', 'Gagal mengupdate jadwal kerja');
            return res.redirect(`/admin/work-schedule/edit/${id}`);
        }

        if (results.affectedRows === 0) {
            req.flash('error', 'Jadwal kerja tidak ditemukan');
            return res.redirect('/admin/work-schedule');
        }

        req.flash('success', 'Jadwal kerja berhasil diupdate');
        res.redirect('/admin/work-schedule');
    });
});

// Work Schedule - Activate (API)
router.post('/work-schedule/activate', requireAuth, (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        return res.json({ success: false, message: 'ID jadwal harus diisi' });
    }

    // First, deactivate all schedules
    const deactivateQuery = 'UPDATE work_schedule SET is_active = FALSE';
    
    db.query(deactivateQuery, (err) => {
        if (err) {
            console.error('Deactivate all schedules error:', err);
            return res.json({ success: false, message: 'Gagal menonaktifkan jadwal lain' });
        }

        // Then activate the selected schedule
        const activateQuery = 'UPDATE work_schedule SET is_active = TRUE WHERE id = ?';
        
        db.query(activateQuery, [id], (err, results) => {
            if (err) {
                console.error('Activate schedule error:', err);
                return res.json({ success: false, message: 'Gagal mengaktifkan jadwal' });
            }

            if (results.affectedRows === 0) {
                return res.json({ success: false, message: 'Jadwal tidak ditemukan' });
            }

            res.json({ success: true, message: 'Jadwal berhasil diaktifkan' });
        });
    });
});

// Work Schedule - Delete
router.post('/work-schedule/delete/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Check if schedule is being used by any employee
    const checkQuery = 'SELECT COUNT(*) as count FROM karyawan WHERE work_schedule_id = ?';
    
    db.query(checkQuery, [id], (err, checkResults) => {
        if (err) {
            req.flash('error', 'Gagal memeriksa penggunaan jadwal kerja');
            return res.redirect('/admin/work-schedule');
        }

        if (checkResults[0].count > 0) {
            req.flash('error', 'Tidak dapat menghapus jadwal kerja yang sedang digunakan oleh karyawan');
            return res.redirect('/admin/work-schedule');
        }

        // Safe to delete
        const deleteQuery = 'DELETE FROM work_schedule WHERE id = ?';
        
        db.query(deleteQuery, [id], (err, results) => {
            if (err) {
                req.flash('error', 'Gagal menghapus jadwal kerja');
            } else {
                req.flash('success', 'Jadwal kerja berhasil dihapus');
            }
            res.redirect('/admin/work-schedule');
        });
    });
});

// ===== JABATAN CRUD ROUTES =====

// Get jabatan list (API)
router.get('/jabatan/list', requireAuth, (req, res) => {
    const query = 'SELECT id, nama_jabatan, deskripsi FROM jabatan WHERE is_active = TRUE ORDER BY nama_jabatan';
    
    db.query(query, (err, results) => {
        if (err) {
            return res.json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, data: results });
    });
});

// Add new jabatan (API)
router.post('/jabatan/add', requireAuth, (req, res) => {
    const { nama_jabatan, deskripsi } = req.body;
    
    if (!nama_jabatan || nama_jabatan.trim() === '') {
        return res.json({ success: false, message: 'Nama jabatan harus diisi' });
    }

    const query = 'INSERT INTO jabatan (nama_jabatan, deskripsi) VALUES (?, ?)';
    
    db.query(query, [nama_jabatan.trim(), deskripsi || null], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'Nama jabatan sudah ada' });
            }
            return res.json({ success: false, message: 'Gagal menambah jabatan' });
        }

        res.json({ 
            success: true, 
            message: 'Jabatan berhasil ditambahkan',
            data: {
                id: results.insertId,
                nama_jabatan: nama_jabatan.trim(),
                deskripsi: deskripsi || null
            }
        });
    });
});

// Update jabatan (API)
router.post('/jabatan/update', requireAuth, (req, res) => {
    const { id, nama_jabatan, deskripsi } = req.body;
    
    if (!id || !nama_jabatan || nama_jabatan.trim() === '') {
        return res.json({ success: false, message: 'ID dan nama jabatan harus diisi' });
    }

    const query = 'UPDATE jabatan SET nama_jabatan = ?, deskripsi = ? WHERE id = ?';
    
    db.query(query, [nama_jabatan.trim(), deskripsi || null, id], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'Nama jabatan sudah ada' });
            }
            return res.json({ success: false, message: 'Gagal mengupdate jabatan' });
        }

        if (results.affectedRows === 0) {
            return res.json({ success: false, message: 'Jabatan tidak ditemukan' });
        }

        res.json({ success: true, message: 'Jabatan berhasil diupdate' });
    });
});

// Maps Testing Page
router.get('/maps', requireAuth, (req, res) => {
    // Get office settings for initial map center
    const settingQuery = 'SELECT lat_kantor, long_kantor, radius_meter FROM pengaturan LIMIT 1';
    
    db.query(settingQuery, (err, results) => {
        const officeSetting = results && results.length > 0 
            ? results[0] 
            : { lat_kantor: -8.8155675, long_kantor: 115.1253343, radius_meter: 100 };

        res.render('admin/maps', { 
            title: 'Google Maps Testing - Fleur Atelier',
            admin: req.session.admin,
            officeSetting: officeSetting
        });
    });
});

// Delete jabatan (API)
router.post('/jabatan/delete', requireAuth, (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        return res.json({ success: false, message: 'ID jabatan harus diisi' });
    }

    // Check if jabatan is being used by any karyawan
    const checkQuery = 'SELECT COUNT(*) as count FROM karyawan WHERE id_jabatan = ?';
    
    db.query(checkQuery, [id], (err, checkResults) => {
        if (err) {
            return res.json({ success: false, message: 'Database error' });
        }

        if (checkResults[0].count > 0) {
            return res.json({ 
                success: false, 
                message: 'Tidak dapat menghapus jabatan yang sedang digunakan oleh karyawan' 
            });
        }

        // Safe to delete
        const deleteQuery = 'DELETE FROM jabatan WHERE id = ?';
        
        db.query(deleteQuery, [id], (err, results) => {
            if (err) {
                return res.json({ success: false, message: 'Gagal menghapus jabatan' });
            }

            if (results.affectedRows === 0) {
                return res.json({ success: false, message: 'Jabatan tidak ditemukan' });
            }

            res.json({ success: true, message: 'Jabatan berhasil dihapus' });
        });
    });
});

// Face Recognition Testing Page
router.get('/face-test', requireAuth, (req, res) => {
    res.render('admin/face-test', { 
        title: 'Face Recognition Testing - Fleur Atelier',
        admin: req.session.admin,
        currentPage: 'face-test'
    });
});

// API: Get employee list for testing
router.get('/api/karyawan/list', requireAuth, (req, res) => {
    const query = `
        SELECT k.id, k.nik, k.nama, k.email, k.no_hp, 
               j.nama_jabatan,
               (SELECT COUNT(*) FROM karyawan_face_reference WHERE karyawan_id = k.id AND is_active = TRUE) as has_reference
        FROM karyawan k
        LEFT JOIN jabatan j ON k.id_jabatan = j.id
        WHERE k.is_active = TRUE
        ORDER BY k.nama ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching employees:', err);
            return res.json({ success: false, message: 'Gagal memuat daftar karyawan' });
        }
        
        res.json({ 
            success: true, 
            data: results.map(emp => ({
                ...emp,
                has_reference: emp.has_reference > 0
            }))
        });
    });
});

// API: Get employee face reference
router.get('/api/karyawan/:id/face-reference', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT * FROM karyawan_face_reference 
        WHERE karyawan_id = ? AND is_active = TRUE
        ORDER BY upload_time DESC
        LIMIT 1
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching face reference:', err);
            return res.json({ success: false, message: 'Gagal memuat referensi wajah' });
        }
        
        if (results.length === 0) {
            return res.json({ success: false, message: 'Karyawan belum memiliki foto referensi' });
        }
        
        res.json({ success: true, data: results[0] });
    });
});

// API: Generate test token for employee
router.post('/api/karyawan/generate-test-token', requireAuth, (req, res) => {
    const { employeeId } = req.body;
    
    if (!employeeId) {
        return res.json({ success: false, message: 'Employee ID is required' });
    }
    
    // Get employee data
    const query = 'SELECT id, nik, nama FROM karyawan WHERE id = ? AND is_active = TRUE';
    
    db.query(query, [employeeId], (err, results) => {
        if (err) {
            console.error('Error fetching employee:', err);
            return res.json({ success: false, message: 'Gagal memuat data karyawan' });
        }
        
        if (results.length === 0) {
            return res.json({ success: false, message: 'Karyawan tidak ditemukan' });
        }
        
        const employee = results[0];
        
        // Generate JWT token for testing
        const { generateAccessToken } = require('../utils/jwt');
        const testToken = generateAccessToken({
            id: employee.id,
            nik: employee.nik,
            isTestMode: true // Flag to indicate this is a test token
        });
        
        res.json({
            success: true,
            data: {
                token: testToken,
                employee: {
                    id: employee.id,
                    nik: employee.nik,
                    nama: employee.nama
                }
            }
        });
    });
});

// API: Upload test reference (Admin only - no JWT required)
router.post('/api/test/upload-reference', requireAuth, (req, res) => {
    testUpload.single('reference')(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.json({
                success: false,
                message: 'Upload error: ' + err.message,
                code: 'MULTER_ERROR'
            });
        } else if (err) {
            console.error('Upload error:', err);
            return res.json({
                success: false,
                message: 'Upload error: ' + err.message,
                code: 'UPLOAD_ERROR'
            });
        }
        
        try {
            if (!req.file) {
                return res.json({
                    success: false,
                    message: 'No image file provided',
                    code: 'NO_FILE'
                });
            }

            console.log('Test reference uploaded:', req.file.filename);
            const imagePath = req.file.path;
            
            // Detect faces using AI
            const { detectFaces } = require('../utils/face-recognition');
            console.log('Detecting faces in:', imagePath);
            const faces = await detectFaces(imagePath);
            console.log('Faces detected:', faces.length);
            
            if (faces.length === 0) {
                // Delete uploaded file if no faces detected
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
                return res.json({
                    success: false,
                    message: 'No faces detected in the image',
                    code: 'NO_FACES'
                });
            }

            // Store reference data temporarily (in memory)
            const testId = `test_${Date.now()}_admin`;
            
            global.testReferences = global.testReferences || {};
            global.testReferences[testId] = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                filePath: imagePath,
                faces: faces,
                uploadTime: new Date().toISOString(),
                adminId: req.session.admin.id
            };

            console.log('Test reference stored with ID:', testId);

            res.json({
                success: true,
                message: 'Test reference photo uploaded successfully',
                data: {
                    testId: testId,
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    facesDetected: faces.length,
                    faces: faces,
                    uploadTime: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Upload test reference error:', error);
            
            // Delete uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            res.json({
                success: false,
                message: 'Failed to process test reference image: ' + error.message,
                code: 'PROCESSING_ERROR'
            });
        }
    });
});

// API: Test face matching (Admin only - no JWT required)
router.post('/api/test/match-face', requireAuth, (req, res) => {
    testUpload.single('photo')(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.json({
                success: false,
                message: 'Upload error: ' + err.message,
                code: 'MULTER_ERROR'
            });
        } else if (err) {
            console.error('Upload error:', err);
            return res.json({
                success: false,
                message: 'Upload error: ' + err.message,
                code: 'UPLOAD_ERROR'
            });
        }
        
        try {
            const { testId } = req.body;

            if (!req.file) {
                return res.json({
                    success: false,
                    message: 'No image file provided',
                    code: 'NO_FILE'
                });
            }

            if (!testId) {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.json({
                    success: false,
                    message: 'Test ID is required',
                    code: 'NO_TEST_ID'
                });
            }

            // Get test reference data
            global.testReferences = global.testReferences || {};
            const testReference = global.testReferences[testId];

            if (!testReference) {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.json({
                    success: false,
                    message: 'Test reference not found. Please upload reference first.',
                    code: 'NO_TEST_REFERENCE'
                });
            }

            console.log('Matching face against test ID:', testId);
            const imagePath = req.file.path;
            
            // Detect faces in uploaded photo
            const { detectFaces, compareFaces } = require('../utils/face-recognition');
            console.log('Detecting faces in test photo:', imagePath);
            const detectedFaces = await detectFaces(imagePath);
            console.log('Detected faces:', detectedFaces.length);

            // Delete uploaded file after processing
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }

            if (detectedFaces.length === 0) {
                return res.json({
                    success: true,
                    message: 'Face matching test completed',
                    data: {
                        testId: testId,
                        facesDetected: 0,
                        faces: [],
                        matchResults: [],
                        summary: {
                            totalFaces: 0,
                            matchedFaces: 0,
                            averageSimilarity: 0,
                            highestSimilarity: 0
                        },
                        message: 'No faces detected in test photo'
                    }
                });
            }

            // Compare faces with test reference
            console.log('Comparing faces...');
            const matchResults = await compareFaces(testReference.faces, detectedFaces);
            console.log('Match results:', matchResults.length, 'faces compared');

            res.json({
                success: true,
                message: 'Face matching test completed',
                data: {
                    testId: testId,
                    facesDetected: detectedFaces.length,
                    faces: detectedFaces,
                    matchResults: matchResults,
                    reference: {
                        filename: testReference.originalName || testReference.employeeName,
                        facesCount: testReference.faces.length,
                        uploadTime: testReference.uploadTime
                    },
                    summary: {
                        totalFaces: detectedFaces.length,
                        matchedFaces: matchResults.filter(r => r.isMatch).length,
                        averageSimilarity: matchResults.length > 0 ? 
                            (matchResults.reduce((sum, r) => sum + r.similarity, 0) / matchResults.length).toFixed(4) : 0,
                        highestSimilarity: matchResults.length > 0 ? 
                            Math.max(...matchResults.map(r => r.similarity)).toFixed(4) : 0
                    }
                }
            });

        } catch (error) {
            console.error('Test face matching error:', error);
            
            // Delete uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            res.json({
                success: false,
                message: 'Failed to test face matching: ' + error.message,
                code: 'PROCESSING_ERROR'
            });
        }
    });
});

module.exports = router;
