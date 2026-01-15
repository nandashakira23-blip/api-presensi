/**
 * ============================================
 * API ROUTES - ENDPOINT UNTUK APLIKASI MOBILE
 * ============================================
 * 
 * File ini berisi semua endpoint API untuk aplikasi Android.
 * Setiap endpoint sudah dilengkapi dengan Swagger documentation.
 * 
 * DAFTAR ENDPOINT:
 * 
 * AUTHENTICATION (Autentikasi):
 * - POST /api/auth/check-nik     : Cek apakah NIK terdaftar
 * - POST /api/auth/login         : Login dengan NIK + PIN
 * - POST /api/auth/activate      : Aktivasi akun baru (NIK + PIN + Foto wajah)
 * - POST /api/auth/logout        : Logout
 * - GET  /api/auth/profile/:id   : Ambil data profil karyawan
 * - PUT  /api/auth/profile/:id   : Update profil (email, phone, foto)
 * - POST /api/auth/refresh       : Refresh access token
 * 
 * ACTIVATION (Aktivasi Akun):
 * - POST /api/activation/upload-face : Upload foto wajah untuk referensi
 * - POST /api/activation/set-pin     : Set PIN untuk akun baru
 * - POST /api/activation/complete    : Selesaikan proses aktivasi
 * 
 * PIN MANAGEMENT:
 * - POST /api/pin/change         : Ganti PIN
 * 
 * ATTENDANCE (Absensi):
 * - POST /api/attendance/checkin     : Clock in (masuk kerja)
 * - POST /api/attendance/checkout    : Clock out (pulang kerja)
 * - GET  /api/attendance/status/:id  : Cek status absensi hari ini
 * - GET  /api/attendance/today       : Ambil data absensi hari ini
 * - GET  /api/attendance/history     : Ambil riwayat absensi
 * - POST /api/attendance/validate-face : Validasi wajah sebelum absen
 * 
 * SCHEDULE (Jadwal Kerja):
 * - GET /api/schedule/today/:id  : Ambil jadwal kerja hari ini
 * 
 * VALIDATION (Validasi):
 * - POST /api/validation/location   : Validasi lokasi (dalam radius kantor?)
 * - POST /api/validation/face-match : Validasi kecocokan wajah
 * 
 * SETTINGS (Pengaturan):
 * - GET /api/settings/office-location : Ambil lokasi kantor
 * 
 * ADMIN TEST (Testing - Development Only):
 * - POST /api/admin/test/upload-reference : Test upload foto referensi
 * - POST /api/admin/test/match-face       : Test pencocokan wajah
 * - POST /api/admin/test/realtime-match   : Test real-time matching
 * 
 * FACE DETECTION:
 * - POST /api/face/detect-realtime : Deteksi wajah real-time
 */

// ============================================
// IMPORT DEPENDENCIES
// ============================================

const express = require('express');
const multer = require('multer');       // Untuk handle file upload
const bcrypt = require('bcrypt');       // Untuk hash password/PIN
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Import utility functions
const { authenticateToken, generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { detectFaces, compareFaces } = require('../utils/face-recognition');
const { isLocationValid } = require('../utils/location');
const { apiLoggerMiddleware, logger } = require('../utils/api-logger');

// Buat router Express
const router = express.Router();

// Pasang middleware logging untuk semua API routes
router.use(apiLoggerMiddleware);

// ============================================
// DATABASE CONNECTION
// ============================================

/**
 * Membuat koneksi baru ke database MySQL
 * Dipanggil di setiap request untuk menghindari connection pooling issues
 */
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe JSON parse untuk work_days
 * Handle format lama (string comma-separated) dan format baru (JSON array)
 */
function parseWorkDays(workDaysString) {
  if (!workDaysString) return [];
  
  // If already an array, return it
  if (Array.isArray(workDaysString)) {
    return workDaysString;
  }
  
  // If it's an object (Buffer), convert to string first
  if (typeof workDaysString === 'object') {
    workDaysString = workDaysString.toString();
  }
  
  // If not a string at this point, return empty array
  if (typeof workDaysString !== 'string') {
    return [];
  }
  
  try {
    // Try parse as JSON first
    return JSON.parse(workDaysString);
  } catch (e) {
    // If failed, assume it's comma-separated string (old format)
    // Convert "monday,tuesday,wednesday" to ["monday","tuesday","wednesday"]
    return workDaysString.split(',').map(day => day.trim()).filter(day => day);
  }
}

// ============================================
// FILE UPLOAD CONFIGURATION (MULTER)
// ============================================

/**
 * Konfigurasi upload untuk foto referensi wajah karyawan
 * - Lokasi: public/uploads/karyawan/
 * - Format nama: ref-[timestamp]-[random].ext
 * - Max size: 10MB
 */
const storage = multer.diskStorage({
  // Tentukan folder tujuan upload
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/karyawan/';
    // Buat folder jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  // Tentukan nama file yang disimpan
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ref-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  // Filter: hanya terima file gambar
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File must be an image'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // Maksimal 10MB
  }
});

/**
 * Konfigurasi upload untuk foto profil karyawan
 * - Lokasi: public/uploads/profiles/
 * - Format nama: profile-[timestamp]-[random].ext
 * - Max size: 5MB
 */
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/profiles/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File must be an image'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // Maksimal 5MB untuk foto profil
  }
});

// ============================================
// AUTHENTICATION APIs (Autentikasi)
// ============================================

/**
 * @swagger
 * /api/auth/check-nik:
 *   post:
 *     tags: [Authentication]
 *     summary: Check apakah NIK terdaftar dan status aktivasi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nik
 *             properties:
 *               nik:
 *                 type: string
 *                 description: NIK karyawan
 *                 example: "EMP001"
 *     responses:
 *       200:
 *         description: NIK ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                     is_activated:
 *                       type: boolean
 *                     employee:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nik:
 *                           type: string
 *                         nama:
 *                           type: string
 */
router.post('/auth/check-nik', async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { nik } = req.body;

    if (!nik) {
      return res.status(400).json({
        success: false,
        message: 'NIK is required',
        code: 'MISSING_NIK'
      });
    }

    // Get karyawan data with face reference check
    const [rows] = await connection.execute(`
      SELECT 
        k.id, k.nik, k.nama, k.is_activated, k.foto_referensi,
        COUNT(fr.id) as has_face_reference_table
      FROM karyawan k
      LEFT JOIN karyawan_face_reference fr ON k.id = fr.karyawan_id AND fr.is_active = TRUE
      WHERE k.nik = ?
      GROUP BY k.id
    `, [nik]);

    if (rows.length === 0) {
      return res.json({
        success: true,
        message: 'NIK not found',
        data: {
          exists: false,
          is_activated: false,
          has_face_reference: false,
          employee: null
        }
      });
    }

    const karyawan = rows[0];
    
    // Check if has face reference from either:
    // 1. karyawan.foto_referensi column (from admin)
    // 2. karyawan_face_reference table (from API activation)
    const hasFaceReference = (karyawan.foto_referensi !== null && karyawan.foto_referensi !== '') || 
                             karyawan.has_face_reference_table > 0;

    res.json({
      success: true,
      message: 'NIK found',
      data: {
        exists: true,
        is_activated: karyawan.is_activated === 1,
        has_face_reference: hasFaceReference,
        employee: {
          id: karyawan.id,
          nik: karyawan.nik,
          nama: karyawan.nama
        }
      }
    });

  } catch (error) {
    console.error('Check NIK error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login karyawan dengan NIK dan PIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nik
 *               - pin
 *             properties:
 *               nik:
 *                 type: string
 *                 description: NIK karyawan
 *                 example: "1234567890123456"
 *               pin:
 *                 type: string
 *                 description: PIN 6 digit
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nik:
 *                           type: string
 *                         nama:
 *                           type: string
 *                         is_activated:
 *                           type: boolean
 *       400:
 *         description: Invalid credentials atau belum aktivasi
 *       401:
 *         description: PIN salah atau akun terkunci
 */
router.post('/auth/login', async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { nik, pin } = req.body;

    if (!nik || !pin) {
      return res.status(400).json({
        success: false,
        message: 'NIK and PIN are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Get karyawan data
    const [rows] = await connection.execute(
      'SELECT * FROM karyawan WHERE nik = ?',
      [nik]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'NIK not found',
        code: 'NIK_NOT_FOUND'
      });
    }

    const karyawan = rows[0];

    // Check if account is locked
    if (karyawan.pin_locked_until && new Date() < new Date(karyawan.pin_locked_until)) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed attempts',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: karyawan.pin_locked_until
      });
    }

    // For first time login (no PIN set yet)
    if (!karyawan.pin && !karyawan.is_activated) {
      const accessToken = generateAccessToken({ 
        id: karyawan.id, 
        nik: karyawan.nik,
        needsActivation: true 
      });
      
      return res.json({
        success: true,
        message: 'Account needs activation',
        data: {
          accessToken,
          user: {
            id: karyawan.id,
            nik: karyawan.nik,
            nama: karyawan.nama,
            is_activated: false,
            needsActivation: true
          }
        }
      });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, karyawan.pin);
    
    if (!isPinValid) {
      // Increment failed attempts
      const newAttempts = (karyawan.pin_attempts || 0) + 1;
      const maxAttempts = 3;
      
      if (newAttempts >= maxAttempts) {
        // Lock account for 30 minutes
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await connection.execute(
          'UPDATE karyawan SET pin_attempts = ?, pin_locked_until = ? WHERE id = ?',
          [newAttempts, lockUntil, karyawan.id]
        );
        
        return res.status(401).json({
          success: false,
          message: 'Account locked due to too many failed attempts',
          code: 'ACCOUNT_LOCKED',
          lockedUntil: lockUntil
        });
      } else {
        await connection.execute(
          'UPDATE karyawan SET pin_attempts = ? WHERE id = ?',
          [newAttempts, karyawan.id]
        );
        
        return res.status(401).json({
          success: false,
          message: `Invalid PIN. ${maxAttempts - newAttempts} attempts remaining`,
          code: 'INVALID_PIN',
          attemptsRemaining: maxAttempts - newAttempts
        });
      }
    }

    // Reset failed attempts on successful login
    await connection.execute(
      'UPDATE karyawan SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?',
      [karyawan.id]
    );

    // Get complete employee data with jabatan
    const [employeeData] = await connection.execute(`
      SELECT 
        k.id, k.nik, k.nama, k.is_activated, 
        k.work_schedule_id, k.created_at, k.foto_referensi,
        j.id as jabatan_id, j.nama_jabatan, j.deskripsi as jabatan_deskripsi,
        COUNT(fr.id) > 0 as face_enrollment_completed
      FROM karyawan k
      LEFT JOIN jabatan j ON k.id_jabatan = j.id
      LEFT JOIN karyawan_face_reference fr ON k.id = fr.karyawan_id AND fr.is_active = TRUE
      WHERE k.id = ?
      GROUP BY k.id
    `, [karyawan.id]);

    const employee = employeeData[0];

    // Get work schedule if exists
    let workSchedule = null;
    if (employee.work_schedule_id) {
      const [scheduleRows] = await connection.execute(`
        SELECT 
          id, nama as name, jam_masuk as start_time, jam_keluar as end_time,
          batas_absen_masuk_awal as clock_in_start, batas_absen_masuk_akhir as clock_in_end,
          batas_absen_keluar_awal as clock_out_start, batas_absen_keluar_akhir as clock_out_end,
          hari_kerja as work_days, is_active
        FROM jadwal_kerja
        WHERE id = ?
      `, [employee.work_schedule_id]);
      
      if (scheduleRows.length > 0) {
        const schedule = scheduleRows[0];
        workSchedule = {
          id: schedule.id,
          name: schedule.name,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          clock_in_start: schedule.clock_in_start,
          clock_in_end: schedule.clock_in_end,
          clock_out_start: schedule.clock_out_start,
          clock_out_end: schedule.clock_out_end,
          work_days: parseWorkDays(schedule.work_days),
          is_active: schedule.is_active === 1
        };
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({ 
      id: employee.id, 
      nik: employee.nik 
    });
    const refreshToken = generateRefreshToken({ 
      id: employee.id, 
      nik: employee.nik 
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        employee: {
          id: employee.id,
          nik: employee.nik,
          nama: employee.nama,
          email: null,
          no_hp: null,
          jabatan: employee.jabatan_id ? {
            id: employee.jabatan_id,
            nama_jabatan: employee.nama_jabatan,
            deskripsi: employee.jabatan_deskripsi
          } : null,
          is_activated: employee.is_activated === 1,
          foto_referensi: employee.foto_referensi,
          face_enrollment_completed: employee.face_enrollment_completed === 1,
          work_schedule_id: employee.work_schedule_id,
          created_at: employee.created_at
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600
        },
        work_schedule: workSchedule
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/auth/activate:
 *   post:
 *     tags: [Authentication]
 *     summary: Activate account dengan NIK, PIN, dan foto wajah (all-in-one)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nik
 *               - pin
 *               - face_photo
 *             properties:
 *               nik:
 *                 type: string
 *                 description: NIK karyawan
 *               pin:
 *                 type: string
 *                 description: PIN 4 digit
 *               face_photo:
 *                 type: string
 *                 format: binary
 *                 description: Foto wajah untuk referensi
 *     responses:
 *       200:
 *         description: Aktivasi berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       type: object
 *                     tokens:
 *                       type: object
 *                     face_enrollment:
 *                       type: object
 */
router.post('/auth/activate', upload.single('face_photo'), async (req, res) => {
  const connection = await getConnection();
  
  try {
    console.log('Activate request body:', req.body);
    console.log('Activate request file:', req.file ? req.file.filename : 'No file');
    
    const { nik, pin } = req.body;

    if (!nik || !pin) {
      console.log('Missing credentials - NIK:', nik, 'PIN:', pin ? '***' : 'empty');
      return res.status(400).json({
        success: false,
        message: 'NIK and PIN are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Face photo is required',
        code: 'NO_PHOTO'
      });
    }

    // Validate PIN format (4 digits)
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits',
        code: 'INVALID_PIN_FORMAT'
      });
    }

    // Get karyawan data
    const [rows] = await connection.execute(
      'SELECT * FROM karyawan WHERE nik = ?',
      [nik]
    );

    if (rows.length === 0) {
      // Delete uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'NIK not found',
        code: 'NIK_NOT_FOUND'
      });
    }

    const karyawan = rows[0];

    // Check if already activated
    if (karyawan.is_activated) {
      // Delete uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Account is already activated',
        code: 'ALREADY_ACTIVATED'
      });
    }

    // Detect faces in uploaded photo
    const faces = await detectFaces(req.file.path);
    console.log('Detected', faces.length, 'faces');
    
    if (faces.length === 0) {
      // Delete uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'No faces detected in the image',
        code: 'NO_FACES'
      });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Start transaction
    await connection.beginTransaction();

    try {
      // 1. Update karyawan with PIN, foto_referensi, and activate
      console.log('Updating karyawan:', karyawan.id);
      await connection.execute(
        'UPDATE karyawan SET pin = ?, foto_referensi = ?, is_activated = TRUE, pin_attempts = 0 WHERE id = ?',
        [hashedPin, req.file.filename, karyawan.id]
      );

      // 2. Deactivate existing face references
      console.log('Deactivating old face references');
      await connection.execute(
        'UPDATE karyawan_face_reference SET is_active = FALSE WHERE karyawan_id = ?',
        [karyawan.id]
      );

      // 3. Save new face reference
      console.log('Saving new face reference');
      await connection.execute(`
        INSERT INTO karyawan_face_reference 
        (karyawan_id, filename, original_name, file_path, faces_data, faces_count, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, TRUE)
      `, [
        karyawan.id,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        JSON.stringify(faces),
        faces.length
      ]);
      console.log('Face reference saved successfully');

      await connection.commit();
      console.log('Transaction committed');

      // Generate tokens
      const accessToken = generateAccessToken({ 
        id: karyawan.id, 
        nik: karyawan.nik 
      });
      const refreshToken = generateRefreshToken({ 
        id: karyawan.id, 
        nik: karyawan.nik 
      });

      res.json({
        success: true,
        message: 'Account activated successfully',
        data: {
          employee: {
            id: karyawan.id,
            nik: karyawan.nik,
            nama: karyawan.nama
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 3600
          },
          face_enrollment: {
            faces_detected: faces.length,
            enrollment_completed: true,
            photo_saved: req.file.filename
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Activation error:', error);
    console.error('Error stack:', error.stack);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to activate account',
      code: 'ACTIVATION_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout karyawan
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 */
router.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success as the client will remove the token
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile/{id}:
 *   get:
 *     tags: [Authentication]
 *     summary: Get data profil karyawan dengan jadwal kerja
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID karyawan
 *     responses:
 *       200:
 *         description: Data profil berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nik:
 *                       type: string
 *                     nama:
 *                       type: string
 *                     jabatan:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nama_jabatan:
 *                           type: string
 *                     workSchedule:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         start_time:
 *                           type: string
 *                         end_time:
 *                           type: string
 *                         work_days:
 *                           type: array
 *                           items:
 *                             type: string
 */
router.get('/auth/profile/:id', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { id } = req.params;

    // Verify user can only access their own profile
    if (parseInt(id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    const [rows] = await connection.execute(`
      SELECT 
        k.id, k.nik, k.nama, k.email, k.phone, k.profile_picture, 
        k.is_activated, k.foto_referensi,
        j.id as jabatan_id, j.nama_jabatan,
        ws.id as schedule_id, ws.name as schedule_name, 
        ws.start_time, ws.end_time, ws.work_days,
        ws.clock_in_start, ws.clock_in_end,
        ws.clock_out_start, ws.clock_out_end
      FROM karyawan k
      LEFT JOIN jabatan j ON k.id_jabatan = j.id
      LEFT JOIN work_schedule ws ON k.work_schedule_id = ws.id
      WHERE k.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const employee = rows[0];

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        employee: {
          id: employee.id,
          nik: employee.nik,
          nama: employee.nama,
          email: employee.email,
          phone: employee.phone,
          profile_picture: employee.profile_picture,
          jabatan: employee.jabatan_id ? {
            id: employee.jabatan_id,
            nama_jabatan: employee.nama_jabatan,
            deskripsi: null
          } : null,
          is_activated: employee.is_activated === 1,
          foto_referensi: employee.foto_referensi,
          face_enrollment_completed: false,
          work_schedule_id: employee.schedule_id,
          created_at: null
        },
        work_schedule: employee.schedule_id ? {
          id: employee.schedule_id,
          name: employee.schedule_name,
          start_time: employee.start_time,
          end_time: employee.end_time,
          clock_in_start: employee.clock_in_start,
          clock_in_end: employee.clock_in_end,
          clock_out_start: employee.clock_out_start,
          clock_out_end: employee.clock_out_end,
          work_days: parseWorkDays(employee.work_days),
          is_active: true
        } : null
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/auth/profile/{id}:
 *   put:
 *     tags: [Authentication]
 *     summary: Update employee profile (self-service)
 *     description: Employee can update their own email, phone, and profile picture
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/auth/profile/:id', authenticateToken, uploadProfile.single('profile_picture'), async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { id } = req.params;
    const { email, phone } = req.body;

    // Verify user can only update their own profile
    if (parseInt(id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Get current profile to check for old profile picture
    const [currentProfile] = await connection.execute(
      'SELECT profile_picture FROM karyawan WHERE id = ?',
      [id]
    );

    const updates = [];
    const params = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }

    if (req.file) {
      const profilePicturePath = `uploads/profiles/${req.file.filename}`;
      updates.push('profile_picture = ?');
      params.push(profilePicturePath);

      // Delete old profile picture if exists
      if (currentProfile.length > 0 && currentProfile[0].profile_picture) {
        const oldFilePath = path.join(__dirname, '..', currentProfile[0].profile_picture);
        fs.unlink(oldFilePath, (err) => {
          if (err) {
            console.log('Error deleting old profile picture:', err.message);
          } else {
            console.log('Old profile picture deleted:', oldFilePath);
          }
        });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        code: 'NO_UPDATES'
      });
    }

    params.push(id);
    updates.push('updated_at = NOW()');

    await connection.execute(
      `UPDATE karyawan SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated profile
    const [rows] = await connection.execute(`
      SELECT 
        k.id, k.nik, k.nama, k.email, k.phone, k.profile_picture, 
        k.is_activated, k.foto_referensi, k.work_schedule_id,
        j.id as jabatan_id, j.nama_jabatan
      FROM karyawan k
      LEFT JOIN jabatan j ON k.id_jabatan = j.id
      WHERE k.id = ?
    `, [id]);

    const employee = rows[0];
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        employee: {
          id: employee.id,
          nik: employee.nik,
          nama: employee.nama,
          email: employee.email,
          phone: employee.phone,
          profile_picture: employee.profile_picture,
          jabatan: employee.jabatan_id ? {
            id: employee.jabatan_id,
            nama_jabatan: employee.nama_jabatan,
            deskripsi: null
          } : null,
          is_activated: employee.is_activated === 1,
          foto_referensi: employee.foto_referensi,
          face_enrollment_completed: false,
          work_schedule_id: employee.work_schedule_id,
          created_at: null
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: Token berhasil di-refresh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 */
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const decoded = verifyToken(refreshToken);
    
    // Generate new tokens
    const newAccessToken = generateAccessToken({ 
      id: decoded.id, 
      nik: decoded.nik 
    });
    const newRefreshToken = generateRefreshToken({ 
      id: decoded.id, 
      nik: decoded.nik 
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

// ============================================
// ACTIVATION APIs (Aktivasi Akun)
// Endpoint untuk proses aktivasi akun karyawan baru
// ============================================

/**
 * @swagger
 * /api/activation/upload-face:
 *   post:
 *     tags: [Activation]
 *     summary: Upload foto referensi untuk face recognition
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *             properties:
 *               reference:
 *                 type: string
 *                 format: binary
 *                 description: Foto referensi wajah
 *     responses:
 *       200:
 *         description: Foto referensi berhasil diupload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reference photo uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     referenceId:
 *                       type: integer
 *                     facesDetected:
 *                       type: integer
 *                     faces:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           box:
 *                             type: object
 *                             properties:
 *                               xMin:
 *                                 type: integer
 *                               yMin:
 *                                 type: integer
 *                               xMax:
 *                                 type: integer
 *                               yMax:
 *                                 type: integer
 *                               width:
 *                                 type: integer
 *                               height:
 *                                 type: integer
 *                           confidence:
 *                             type: number
 *       400:
 *         description: No faces detected atau file tidak valid
 */
router.post('/activation/upload-face', authenticateToken, upload.single('reference'), async (req, res) => {
  const connection = await getConnection();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    const imagePath = req.file.path;
    
    // Detect faces using AI
    const faces = await detectFaces(imagePath);
    
    if (faces.length === 0) {
      // Delete uploaded file if no faces detected
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(400).json({
        success: false,
        message: 'No faces detected in the image',
        code: 'NO_FACES'
      });
    }

    // Deactivate existing reference photos for this employee
    await connection.execute(
      'UPDATE karyawan_face_reference SET is_active = FALSE WHERE karyawan_id = ?',
      [req.user.id]
    );

    // Save new reference photo to database
    const [result] = await connection.execute(`
      INSERT INTO karyawan_face_reference 
      (karyawan_id, filename, original_name, file_path, faces_data, faces_count, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
    `, [
      req.user.id,
      req.file.filename,
      req.file.originalname,
      imagePath,
      JSON.stringify(faces),
      faces.length
    ]);

    res.json({
      success: true,
      message: 'Reference photo uploaded successfully',
      data: {
        referenceId: result.insertId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        facesDetected: faces.length,
        faces: faces
      }
    });

  } catch (error) {
    console.error('Upload face error:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process reference image',
      code: 'PROCESSING_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/activation/set-pin:
 *   post:
 *     tags: [Activation]
 *     summary: Set PIN untuk pertama kali
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *               - confirmPin
 *             properties:
 *               pin:
 *                 type: string
 *                 description: PIN 6 digit
 *                 example: "123456"
 *               confirmPin:
 *                 type: string
 *                 description: Konfirmasi PIN
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: PIN berhasil di-set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PIN set successfully"
 *       400:
 *         description: PIN tidak valid atau tidak cocok
 */
router.post('/activation/set-pin', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { pin, confirmPin } = req.body;

    if (!pin || !confirmPin) {
      return res.status(400).json({
        success: false,
        message: 'PIN and confirm PIN are required',
        code: 'MISSING_PIN'
      });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: 'PIN and confirm PIN do not match',
        code: 'PIN_MISMATCH'
      });
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 6 digits',
        code: 'INVALID_PIN_FORMAT'
      });
    }

    // Check if PIN is already set
    const [rows] = await connection.execute(
      'SELECT pin FROM karyawan WHERE id = ?',
      [req.user.id]
    );

    if (rows[0].pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN is already set',
        code: 'PIN_ALREADY_SET'
      });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Update PIN in database
    await connection.execute(
      'UPDATE karyawan SET pin = ?, pin_attempts = 0 WHERE id = ?',
      [hashedPin, req.user.id]
    );

    res.json({
      success: true,
      message: 'PIN set successfully'
    });

  } catch (error) {
    console.error('Set PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/pin/change:
 *   post:
 *     tags: [PIN Management]
 *     summary: Change PIN
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_pin
 *               - new_pin
 *             properties:
 *               current_pin:
 *                 type: string
 *                 description: Current PIN
 *                 example: "1234"
 *               new_pin:
 *                 type: string
 *                 description: New PIN (4 digits)
 *                 example: "5678"
 *     responses:
 *       200:
 *         description: PIN changed successfully
 *       400:
 *         description: Invalid PIN format or current PIN incorrect
 *       401:
 *         description: Current PIN is incorrect
 */
router.post('/pin/change', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { current_pin, new_pin } = req.body;

    if (!current_pin || !new_pin) {
      return res.status(400).json({
        success: false,
        message: 'Current PIN and new PIN are required',
        code: 'MISSING_PIN'
      });
    }

    // Validate new PIN format (4 digits)
    if (new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
      return res.status(400).json({
        success: false,
        message: 'New PIN must be exactly 4 digits',
        code: 'INVALID_PIN_FORMAT'
      });
    }

    // Get current PIN from database
    const [rows] = await connection.execute(
      'SELECT pin FROM karyawan WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const karyawan = rows[0];

    // Verify current PIN
    const isPinValid = await bcrypt.compare(current_pin, karyawan.pin);
    
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Current PIN is incorrect',
        code: 'INVALID_CURRENT_PIN'
      });
    }

    // Hash new PIN
    const hashedNewPin = await bcrypt.hash(new_pin, 10);

    // Update PIN in database
    await connection.execute(
      'UPDATE karyawan SET pin = ?, pin_attempts = 0 WHERE id = ?',
      [hashedNewPin, req.user.id]
    );

    res.json({
      success: true,
      message: 'PIN changed successfully',
      data: {
        changed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/activation/complete:
 *   post:
 *     tags: [Activation]
 *     summary: Selesaikan proses aktivasi akun
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aktivasi berhasil diselesaikan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account activation completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New access token for activated account
 *       400:
 *         description: Aktivasi belum lengkap (PIN atau foto referensi belum di-set)
 */
router.post('/activation/complete', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    // Check if PIN is set
    const [karyawanRows] = await connection.execute(
      'SELECT pin FROM karyawan WHERE id = ?',
      [req.user.id]
    );

    if (!karyawanRows[0].pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be set before completing activation',
        code: 'PIN_NOT_SET'
      });
    }

    // Check if face reference is uploaded
    const [faceRows] = await connection.execute(
      'SELECT id FROM karyawan_face_reference WHERE karyawan_id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (faceRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Face reference must be uploaded before completing activation',
        code: 'FACE_REFERENCE_NOT_SET'
      });
    }

    // Mark account as activated
    await connection.execute(
      'UPDATE karyawan SET is_activated = TRUE WHERE id = ?',
      [req.user.id]
    );

    // Generate new access token without needsActivation flag
    const accessToken = generateAccessToken({ 
      id: req.user.id, 
      nik: req.user.nik 
    });

    res.json({
      success: true,
      message: 'Account activation completed successfully',
      data: {
        accessToken
      }
    });

  } catch (error) {
    console.error('Complete activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

// ============================================
// ATTENDANCE APIs (Absensi)
// Endpoint untuk clock in, clock out, dan riwayat absensi
// ============================================

/**
 * @swagger
 * /api/schedule/today/{karyawan_id}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get jadwal kerja hari ini untuk karyawan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: karyawan_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID karyawan
 *     responses:
 *       200:
 *         description: Jadwal kerja hari ini
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasSchedule:
 *                       type: boolean
 *                     today:
 *                       type: string
 *                       example: "monday"
 *                     schedule:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         start_time:
 *                           type: string
 *                         end_time:
 *                           type: string
 *                         clock_in_start:
 *                           type: string
 *                         clock_in_end:
 *                           type: string
 *                         clock_out_start:
 *                           type: string
 *                         clock_out_end:
 *                           type: string
 *                         work_days:
 *                           type: array
 *                           items:
 *                             type: string
 */
router.get('/schedule/today/:karyawan_id', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { karyawan_id } = req.params;

    // Verify user can only access their own schedule
    if (parseInt(karyawan_id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Get today's day name
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Get employee's work schedule
    const [rows] = await connection.execute(`
      SELECT ws.* 
      FROM work_schedule ws
      JOIN karyawan k ON k.work_schedule_id = ws.id
      WHERE k.id = ? AND ws.is_active = TRUE
    `, [karyawan_id]);

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasSchedule: false,
          today: today,
          schedule: null
        }
      });
    }

    const schedule = rows[0];
    const workDays = parseWorkDays(schedule.work_days);
    const hasWorkToday = workDays.includes(today);

    res.json({
      success: true,
      data: {
        hasSchedule: true,
        hasWorkToday: hasWorkToday,
        today: today,
        schedule: {
          id: schedule.id,
          name: schedule.name,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          clock_in_start: schedule.clock_in_start,
          clock_in_end: schedule.clock_in_end,
          clock_out_start: schedule.clock_out_start,
          clock_out_end: schedule.clock_out_end,
          work_days: workDays
        }
      }
    });

  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/attendance/validate-face:
 *   post:
 *     tags: [Attendance]
 *     summary: Validasi wajah real-time tanpa save (untuk preview)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Frame dari camera untuk validasi
 *     responses:
 *       200:
 *         description: Validasi berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     facesDetected:
 *                       type: integer
 *                     isMatch:
 *                       type: boolean
 *                     similarity:
 *                       type: number
 *                     confidence:
 *                       type: string
 *                     threshold:
 *                       type: number
 */
router.post('/attendance/validate-face', authenticateToken, upload.single('photo'), async (req, res) => {
  const connection = await getConnection();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required',
        code: 'NO_PHOTO'
      });
    }

    // Get employee's face reference
    const [faceRows] = await connection.execute(
      'SELECT * FROM karyawan_face_reference WHERE karyawan_id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (faceRows.length === 0) {
      // Delete uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'No face reference found',
        code: 'NO_FACE_REFERENCE'
      });
    }

    const faceReference = faceRows[0];
    
    // Parse faces_data - handle both string and object
    let referenceFaces;
    if (typeof faceReference.faces_data === 'string') {
      referenceFaces = JSON.parse(faceReference.faces_data);
    } else {
      referenceFaces = faceReference.faces_data;
    }

    // Detect faces in uploaded photo
    const detectedFaces = await detectFaces(req.file.path);

    // Delete uploaded file immediately (tidak perlu disimpan)
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (detectedFaces.length === 0) {
      return res.json({
        success: true,
        data: {
          facesDetected: 0,
          isMatch: false,
          similarity: 0,
          confidence: 'Rendah',
          threshold: 0.85,
          message: 'No face detected'
        }
      });
    }

    // Compare faces
    const matchResults = await compareFaces(referenceFaces, detectedFaces);
    const bestMatch = matchResults.find(result => result.isMatch);

    if (bestMatch) {
      res.json({
        success: true,
        data: {
          facesDetected: detectedFaces.length,
          isMatch: true,
          similarity: bestMatch.similarity,
          confidence: bestMatch.confidence,
          threshold: bestMatch.threshold,
          message: 'Face matched!'
        }
      });
    } else {
      // Ambil similarity tertinggi meskipun tidak match
      const highestSimilarity = Math.max(...matchResults.map(r => r.similarity));
      res.json({
        success: true,
        data: {
          facesDetected: detectedFaces.length,
          isMatch: false,
          similarity: highestSimilarity,
          confidence: matchResults[0].confidence,
          threshold: matchResults[0].threshold,
          message: 'Face does not match'
        }
      });
    }

  } catch (error) {
    console.error('Validate face error:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/attendance/checkin:
 *   post:
 *     tags: [Attendance]
 *     summary: Clock in dengan foto dan lokasi
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *               - latitude
 *               - longitude
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Foto untuk face recognition
 *               latitude:
 *                 type: number
 *                 description: Latitude lokasi
 *                 example: -6.200000
 *               longitude:
 *                 type: number
 *                 description: Longitude lokasi
 *                 example: 106.816666
 *     responses:
 *       200:
 *         description: Clock in berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Clock in successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendanceId:
 *                       type: integer
 *                     clockInTime:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "on_time"
 *                     faceMatch:
 *                       type: object
 *                       properties:
 *                         isMatch:
 *                           type: boolean
 *                         similarity:
 *                           type: number
 *                         confidence:
 *                           type: string
 *       400:
 *         description: Validasi gagal (lokasi, wajah, atau jadwal)
 */
router.post('/attendance/checkin', (req, res, next) => {
  console.log('=== CHECKIN REQUEST RECEIVED ===');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('content-type'));
  next();
}, authenticateToken, upload.single('photo'), async (req, res) => {
  const connection = await getConnection();
  
  try {
    console.log('=== CHECKIN REQUEST START ===');
    console.log('User ID:', req.user.id);
    console.log('Body:', req.body);
    console.log('File:', req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    } : 'No file');
    
    const { latitude, longitude } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required',
        code: 'NO_PHOTO'
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required',
        code: 'NO_LOCATION'
      });
    }

    console.log('Step 1: Getting office location settings...');
    // Get office location settings
    const [settingsRows] = await connection.execute(
      'SELECT lat_kantor, long_kantor, radius_meter FROM pengaturan LIMIT 1'
    );

    if (settingsRows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Office location not configured',
        code: 'NO_OFFICE_LOCATION'
      });
    }

    const settings = settingsRows[0];
    console.log('Office settings:', settings);

    console.log('Step 2: Validating location...');
    // Validate location
    const locationValidation = isLocationValid(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(settings.lat_kantor),
      parseFloat(settings.long_kantor),
      settings.radius_meter
    );
    console.log('Location validation:', locationValidation);

    if (!locationValidation.isValid) {
      // Delete uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Location is outside allowed area',
        code: 'LOCATION_INVALID',
        data: {
          distance: locationValidation.distance,
          allowedRadius: locationValidation.allowedRadius
        }
      });
    }

    console.log('Step 3: Getting employee face reference...');
    // Get employee's face reference
    const [faceRows] = await connection.execute(
      'SELECT * FROM karyawan_face_reference WHERE karyawan_id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (faceRows.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'No face reference found. Please complete activation first.',
        code: 'NO_FACE_REFERENCE'
      });
    }

    const faceReference = faceRows[0];
    console.log('Face reference found:', { id: faceReference.id, faces_count: faceReference.faces_count });
    console.log('Face reference data type:', typeof faceReference.faces_data);
    console.log('Face reference data:', faceReference.faces_data);
    
    // Parse faces_data - handle both string and object
    let referenceFaces;
    if (typeof faceReference.faces_data === 'string') {
      referenceFaces = JSON.parse(faceReference.faces_data);
    } else {
      referenceFaces = faceReference.faces_data;
    }
    console.log('Reference faces parsed:', referenceFaces.length, 'faces');

    console.log('Step 4: Detecting faces in uploaded photo...');
    // Detect faces in uploaded photo
    const detectedFaces = await detectFaces(req.file.path);
    console.log('Detected faces:', detectedFaces.length);

    if (detectedFaces.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'No faces detected in photo',
        code: 'NO_FACES_DETECTED'
      });
    }

    console.log('Step 5: Comparing faces...');
    // Compare faces
    const matchResults = await compareFaces(referenceFaces, detectedFaces);
    console.log('Match results:', matchResults.map(r => ({ isMatch: r.isMatch, similarity: r.similarity })));
    
    const bestMatch = matchResults.find(result => result.isMatch);

    if (!bestMatch) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Face does not match reference',
        code: 'FACE_NO_MATCH',
        data: {
          similarity: Math.max(...matchResults.map(r => r.similarity)),
          threshold: matchResults[0].threshold
        }
      });
    }

    console.log('Step 6: Checking if already checked in today...');
    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const [existingRows] = await connection.execute(
      'SELECT id FROM presensi WHERE id_karyawan = ? AND DATE(waktu) = ? AND attendance_type = "clock_in"',
      [req.user.id, today]
    );

    if (existingRows.length > 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Already checked in today',
        code: 'ALREADY_CHECKED_IN'
      });
    }

    console.log('Step 7: Getting work schedule...');
    // Get work schedule for status calculation
    const [scheduleRows] = await connection.execute(`
      SELECT ws.* 
      FROM work_schedule ws
      JOIN karyawan k ON k.work_schedule_id = ws.id
      WHERE k.id = ?
    `, [req.user.id]);

    let clockInStatus = 'on_time';
    let isLate = false;

    if (scheduleRows.length > 0) {
      const schedule = scheduleRows[0];
      const currentTime = new Date().toTimeString().split(' ')[0];
      const workDays = parseWorkDays(schedule.work_days);
      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // VALIDASI: Cek apakah hari ini adalah hari kerja
      const isWorkDay = workDays.some(day => day.toLowerCase() === todayName);
      
      if (!isWorkDay) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: `Hari ini (${todayName}) bukan hari kerja. Hari kerja: ${workDays.join(', ')}`,
          code: 'NOT_WORK_DAY',
          data: {
            today: todayName,
            workDays: workDays,
            scheduleName: schedule.name
          }
        });
      }
      
      // VALIDASI: Check-in hanya bisa dilakukan dalam window waktu yang ditentukan
      if (currentTime < schedule.clock_in_start || currentTime > schedule.clock_in_end) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: `Check-in hanya bisa dilakukan antara jam ${schedule.clock_in_start.substring(0,5)} - ${schedule.clock_in_end.substring(0,5)}`,
          code: 'OUTSIDE_CHECKIN_WINDOW',
          data: {
            currentTime: currentTime.substring(0,5),
            allowedStart: schedule.clock_in_start.substring(0,5),
            allowedEnd: schedule.clock_in_end.substring(0,5),
            scheduleName: schedule.name
          }
        });
      }
      
      // Tentukan status terlambat berdasarkan jam masuk kerja (start_time), bukan clock_in_end
      if (currentTime > schedule.start_time) {
        clockInStatus = 'late';
        isLate = true;
      }
    }
    console.log('Clock in status:', clockInStatus, 'isLate:', isLate);

    console.log('Step 8: Saving face recognition log...');
    // Save face recognition log
    const [faceLogResult] = await connection.execute(`
      INSERT INTO absensi_face_log 
      (karyawan_id, reference_id, match_filename, match_file_path, faces_detected, match_results, similarity_score, confidence_level, is_match, absen_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'masuk')
    `, [
      req.user.id,
      faceReference.id,
      req.file.filename,
      req.file.path,
      detectedFaces.length,
      JSON.stringify(matchResults),
      bestMatch.similarity,
      bestMatch.confidence,
      true
    ]);
    console.log('Face log saved, ID:', faceLogResult.insertId);

    console.log('Step 9: Saving attendance record...');
    // Save attendance record
    const [attendanceResult] = await connection.execute(`
      INSERT INTO presensi 
      (id_karyawan, attendance_type, lat_absen, long_absen, foto_checkin, status_lokasi, jarak_meter, face_recognition_id, similarity_score, is_late, work_schedule_id)
      VALUES (?, 'clock_in', ?, ?, ?, 'Dalam Area', ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      latitude,
      longitude,
      req.file.filename, // Use filename instead of full path
      locationValidation.distance,
      faceLogResult.insertId,
      bestMatch.similarity,
      isLate,
      scheduleRows.length > 0 ? scheduleRows[0].id : null
    ]);
    console.log('Attendance saved, ID:', attendanceResult.insertId);
    console.log('=== CHECKIN REQUEST SUCCESS ===');

    res.json({
      success: true,
      message: 'Clock in successful',
      data: {
        attendanceId: attendanceResult.insertId,
        clockInTime: new Date().toISOString(),
        status: clockInStatus,
        location: {
          distance: locationValidation.distance,
          isValid: locationValidation.isValid
        },
        faceMatch: {
          isMatch: bestMatch.isMatch,
          similarity: bestMatch.similarity,
          confidence: bestMatch.confidence,
          facesDetected: detectedFaces.length
        }
      }
    });

  } catch (error) {
    console.error('=== CHECKIN REQUEST FAILED ===');
    console.error('Clock in error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await connection.end();
  }
});
/**
 * @swagger
 * /api/attendance/checkout:
 *   post:
 *     tags: [Attendance]
 *     summary: Clock out dengan foto dan lokasi
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *               - latitude
 *               - longitude
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Foto untuk face recognition
 *               latitude:
 *                 type: number
 *                 description: Latitude lokasi
 *               longitude:
 *                 type: number
 *                 description: Longitude lokasi
 *     responses:
 *       200:
 *         description: Clock out berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Clock out successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendanceId:
 *                       type: integer
 *                     clockOutTime:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "on_time"
 *                     workDuration:
 *                       type: string
 *                       example: "8 hours 30 minutes"
 */
router.post('/attendance/checkout', authenticateToken, upload.single('photo'), async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { latitude, longitude } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required',
        code: 'NO_PHOTO'
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required',
        code: 'NO_LOCATION'
      });
    }

    // Check if already checked out today
    const today = new Date().toISOString().split('T')[0];
    const [existingCheckOut] = await connection.execute(
      'SELECT id FROM presensi WHERE id_karyawan = ? AND DATE(waktu) = ? AND attendance_type = "clock_out"',
      [req.user.id, today]
    );

    if (existingCheckOut.length > 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Already checked out today',
        code: 'ALREADY_CHECKED_OUT'
      });
    }

    // Check if checked in today
    const [checkInRows] = await connection.execute(
      'SELECT * FROM presensi WHERE id_karyawan = ? AND DATE(waktu) = ? AND attendance_type = "clock_in"',
      [req.user.id, today]
    );

    if (checkInRows.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Must check in first before checking out',
        code: 'NO_CHECK_IN'
      });
    }

    // Validate location (same as check in)
    const [settingsRows] = await connection.execute(
      'SELECT lat_kantor, long_kantor, radius_meter FROM pengaturan LIMIT 1'
    );

    const settings = settingsRows[0];
    const locationValidation = isLocationValid(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(settings.lat_kantor),
      parseFloat(settings.long_kantor),
      settings.radius_meter
    );

    if (!locationValidation.isValid) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Location is outside allowed area',
        code: 'LOCATION_INVALID',
        data: {
          distance: locationValidation.distance,
          allowedRadius: locationValidation.allowedRadius
        }
      });
    }

    // Face recognition validation (same as check in)
    const [faceRows] = await connection.execute(
      'SELECT * FROM karyawan_face_reference WHERE karyawan_id = ? AND is_active = TRUE',
      [req.user.id]
    );

    const faceReference = faceRows[0];
    
    // Parse faces_data - handle both string and object
    let referenceFaces;
    if (typeof faceReference.faces_data === 'string') {
      referenceFaces = JSON.parse(faceReference.faces_data);
    } else {
      referenceFaces = faceReference.faces_data;
    }
    
    const detectedFaces = await detectFaces(req.file.path);

    if (detectedFaces.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'No faces detected in photo',
        code: 'NO_FACES_DETECTED'
      });
    }

    const matchResults = await compareFaces(referenceFaces, detectedFaces);
    const bestMatch = matchResults.find(result => result.isMatch);

    if (!bestMatch) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Face does not match reference',
        code: 'FACE_NO_MATCH'
      });
    }

    // Calculate work duration
    const checkInTime = new Date(checkInRows[0].waktu);
    const checkOutTime = new Date();
    const workDurationMs = checkOutTime - checkInTime;
    const workDurationMinutes = Math.floor(workDurationMs / (1000 * 60));
    const hours = Math.floor(workDurationMinutes / 60);
    const minutes = workDurationMinutes % 60;

    // Get work schedule for status calculation
    const [scheduleRows] = await connection.execute(`
      SELECT ws.* 
      FROM work_schedule ws
      JOIN karyawan k ON k.work_schedule_id = ws.id
      WHERE k.id = ?
    `, [req.user.id]);

    let clockOutStatus = 'on_time';
    let isEarly = false;
    let overtimeMinutes = 0;

    if (scheduleRows.length > 0) {
      const schedule = scheduleRows[0];
      const currentTime = new Date().toTimeString().split(' ')[0];
      const workDays = parseWorkDays(schedule.work_days);
      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // VALIDASI: Cek apakah hari ini adalah hari kerja
      const isWorkDay = workDays.some(day => day.toLowerCase() === todayName);
      
      if (!isWorkDay) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: `Hari ini (${todayName}) bukan hari kerja. Hari kerja: ${workDays.join(', ')}`,
          code: 'NOT_WORK_DAY',
          data: {
            today: todayName,
            workDays: workDays,
            scheduleName: schedule.name
          }
        });
      }
      
      // VALIDASI: Check-out hanya bisa dilakukan dalam window waktu yang ditentukan
      if (currentTime < schedule.clock_out_start || currentTime > schedule.clock_out_end) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: `Check-out hanya bisa dilakukan antara jam ${schedule.clock_out_start.substring(0,5)} - ${schedule.clock_out_end.substring(0,5)}`,
          code: 'OUTSIDE_CHECKOUT_WINDOW',
          data: {
            currentTime: currentTime.substring(0,5),
            allowedStart: schedule.clock_out_start.substring(0,5),
            allowedEnd: schedule.clock_out_end.substring(0,5),
            scheduleName: schedule.name
          }
        });
      }
      
      // Tentukan status checkout berdasarkan jam pulang kerja (end_time)
      if (currentTime < schedule.end_time) {
        clockOutStatus = 'early';
        isEarly = true;
      } else if (currentTime > schedule.end_time) {
        clockOutStatus = 'overtime';
        // Calculate overtime
        const endTime = new Date(`1970-01-01T${schedule.end_time}`);
        const currentDateTime = new Date(`1970-01-01T${currentTime}`);
        overtimeMinutes = Math.max(0, Math.floor((currentDateTime - endTime) / (1000 * 60)));
      }
    }

    // Save face recognition log
    const [faceLogResult] = await connection.execute(`
      INSERT INTO absensi_face_log 
      (karyawan_id, reference_id, match_filename, match_file_path, faces_detected, match_results, similarity_score, confidence_level, is_match, absen_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'keluar')
    `, [
      req.user.id,
      faceReference.id,
      req.file.filename,
      req.file.path,
      detectedFaces.length,
      JSON.stringify(matchResults),
      bestMatch.similarity,
      bestMatch.confidence,
      true
    ]);

    // Save attendance record
    const [attendanceResult] = await connection.execute(`
      INSERT INTO presensi 
      (id_karyawan, attendance_type, lat_absen, long_absen, foto_checkin, status_lokasi, jarak_meter, face_recognition_id, similarity_score, is_early, overtime_minutes, work_duration_minutes, work_schedule_id)
      VALUES (?, 'clock_out', ?, ?, ?, 'Dalam Area', ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      latitude,
      longitude,
      req.file.filename, // Use filename instead of full path
      locationValidation.distance,
      faceLogResult.insertId,
      bestMatch.similarity,
      isEarly,
      overtimeMinutes,
      workDurationMinutes,
      scheduleRows.length > 0 ? scheduleRows[0].id : null
    ]);

    res.json({
      success: true,
      message: 'Clock out successful',
      data: {
        attendanceId: attendanceResult.insertId,
        clockOutTime: checkOutTime.toISOString(),
        status: clockOutStatus,
        workDuration: `${hours} hours ${minutes} minutes`,
        workDurationMinutes: workDurationMinutes,
        overtimeMinutes: overtimeMinutes,
        location: {
          distance: locationValidation.distance,
          isValid: locationValidation.isValid
        },
        faceMatch: {
          isMatch: bestMatch.isMatch,
          similarity: bestMatch.similarity,
          confidence: bestMatch.confidence
        }
      }
    });

  } catch (error) {
    console.error('Clock out error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/attendance/status/{karyawan_id}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get status absensi hari ini
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: karyawan_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID karyawan
 *     responses:
 *       200:
 *         description: Status absensi hari ini
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: "2024-01-15"
 *                     hasCheckedIn:
 *                       type: boolean
 *                     hasCheckedOut:
 *                       type: boolean
 *                     checkIn:
 *                       type: object
 *                       properties:
 *                         time:
 *                           type: string
 *                         status:
 *                           type: string
 *                         similarity:
 *                           type: number
 *                     checkOut:
 *                       type: object
 *                       properties:
 *                         time:
 *                           type: string
 *                         status:
 *                           type: string
 *                         workDuration:
 *                           type: string
 *                     canCheckIn:
 *                       type: boolean
 *                     canCheckOut:
 *                       type: boolean
 */
router.get('/attendance/status/:karyawan_id', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { karyawan_id } = req.params;

    // Verify user can only access their own status
    if (parseInt(karyawan_id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's attendance records
    const [attendanceRows] = await connection.execute(`
      SELECT 
        p.*,
        CASE 
          WHEN p.attendance_type = 'clock_in' AND p.is_late = 1 THEN 'late'
          WHEN p.attendance_type = 'clock_out' AND p.is_early = 1 THEN 'early'
          WHEN p.attendance_type = 'clock_out' AND p.overtime_minutes > 0 THEN 'overtime'
          ELSE 'on_time'
        END as status
      FROM presensi p
      WHERE p.id_karyawan = ? AND DATE(p.waktu) = ?
      ORDER BY p.waktu ASC
    `, [karyawan_id, today]);

    const checkInRecord = attendanceRows.find(r => r.attendance_type === 'clock_in');
    const checkOutRecord = attendanceRows.find(r => r.attendance_type === 'clock_out');

    // Calculate work duration
    let workDuration = null;
    let workDurationMinutes = null;
    
    if (checkInRecord && checkOutRecord) {
      // Both clock in and clock out exist - use stored duration or calculate
      if (checkOutRecord.work_duration_minutes) {
        workDurationMinutes = checkOutRecord.work_duration_minutes;
      } else {
        const checkInTime = new Date(checkInRecord.waktu);
        const checkOutTime = new Date(checkOutRecord.waktu);
        workDurationMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
      }
      const hours = Math.floor(workDurationMinutes / 60);
      const minutes = workDurationMinutes % 60;
      workDuration = `${hours} jam ${minutes} menit`;
    } else if (checkInRecord && !checkOutRecord) {
      // Only clock in exists - calculate real-time duration
      const checkInTime = new Date(checkInRecord.waktu);
      const now = new Date();
      workDurationMinutes = Math.floor((now - checkInTime) / (1000 * 60));
      const hours = Math.floor(workDurationMinutes / 60);
      const minutes = workDurationMinutes % 60;
      workDuration = `${hours} jam ${minutes} menit`;
    }

    // Get work schedule to determine if can check in/out
    const [scheduleRows] = await connection.execute(`
      SELECT ws.* 
      FROM work_schedule ws
      JOIN karyawan k ON k.work_schedule_id = ws.id
      WHERE k.id = ?
    `, [karyawan_id]);

    let canCheckIn = !checkInRecord;
    let canCheckOut = checkInRecord && !checkOutRecord;

    if (scheduleRows.length > 0) {
      const schedule = scheduleRows[0];
      const currentTime = new Date().toTimeString().split(' ')[0];
      const workDays = parseWorkDays(schedule.work_days);
      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      // Check if today is a work day (case-insensitive)
      const isWorkDay = workDays.some(day => day.toLowerCase() === todayName.toLowerCase());
      
      if (!isWorkDay) {
        canCheckIn = false;
        canCheckOut = false;
      } else {
        // Check time constraints
        if (canCheckIn && schedule.clock_in_start && schedule.clock_in_end) {
          canCheckIn = currentTime >= schedule.clock_in_start && currentTime <= schedule.clock_in_end;
        }
        if (canCheckOut && schedule.clock_out_start && schedule.clock_out_end) {
          canCheckOut = currentTime >= schedule.clock_out_start && currentTime <= schedule.clock_out_end;
        }
      }
    }

    const response = {
      success: true,
      data: {
        date: today,
        has_clocked_in: !!checkInRecord,
        has_clocked_out: !!checkOutRecord,
        clock_in_time: checkInRecord ? checkInRecord.waktu : null,
        clock_out_time: checkOutRecord ? checkOutRecord.waktu : null,
        work_duration: workDuration,
        work_duration_minutes: workDurationMinutes,
        can_clock_in: canCheckIn,
        can_clock_out: canCheckOut,
        next_action: !checkInRecord ? 'clock_in' : (!checkOutRecord ? 'clock_out' : 'completed'),
        work_schedule: null
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Get attendance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     tags: [Attendance]
 *     summary: Get today's attendance for logged-in employee
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's attendance retrieved successfully
 */
router.get('/attendance/today', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const karyawanId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Get today's attendance records
    const [attendanceRows] = await connection.execute(`
      SELECT 
        p.*,
        CASE 
          WHEN p.attendance_type = 'clock_in' AND p.is_late = 1 THEN 'late'
          WHEN p.attendance_type = 'clock_out' AND p.is_early = 1 THEN 'early'
          WHEN p.attendance_type = 'clock_out' AND p.overtime_minutes > 0 THEN 'overtime'
          ELSE 'on_time'
        END as status
      FROM presensi p
      WHERE p.id_karyawan = ? AND DATE(p.waktu) = ?
      ORDER BY p.waktu ASC
    `, [karyawanId, today]);

    const checkInRecord = attendanceRows.find(r => r.attendance_type === 'clock_in');
    const checkOutRecord = attendanceRows.find(r => r.attendance_type === 'clock_out');

    // Calculate work duration if both records exist
    let workDuration = null;
    let workDurationMinutes = null;
    if (checkInRecord && checkOutRecord) {
      const checkInTime = new Date(checkInRecord.waktu);
      const checkOutTime = new Date(checkOutRecord.waktu);
      workDurationMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
      const hours = Math.floor(workDurationMinutes / 60);
      const minutes = workDurationMinutes % 60;
      workDuration = `${hours} hours ${minutes} minutes`;
    }

    // Get work schedule
    const [scheduleRows] = await connection.execute(`
      SELECT ws.* 
      FROM work_schedule ws
      JOIN karyawan k ON k.work_schedule_id = ws.id
      WHERE k.id = ?
    `, [karyawanId]);

    let workSchedule = null;
    if (scheduleRows.length > 0) {
      const schedule = scheduleRows[0];
      workSchedule = {
        id: schedule.id,
        name: schedule.name,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        clock_in_start: schedule.clock_in_start,
        clock_in_end: schedule.clock_in_end,
        clock_out_start: schedule.clock_out_start,
        clock_out_end: schedule.clock_out_end,
        work_days: parseWorkDays(schedule.work_days)
      };
    }

    const response = {
      success: true,
      data: {
        date: today,
        has_clocked_in: !!checkInRecord,
        has_clocked_out: !!checkOutRecord,
        clock_in: checkInRecord ? {
          time: checkInRecord.waktu,
          status: checkInRecord.status,
          location: {
            latitude: checkInRecord.lat_absen,
            longitude: checkInRecord.long_absen,
            distance: checkInRecord.jarak_meter,
            status: checkInRecord.status_lokasi
          },
          similarity: checkInRecord.similarity_score
        } : null,
        clock_out: checkOutRecord ? {
          time: checkOutRecord.waktu,
          status: checkOutRecord.status,
          location: {
            latitude: checkOutRecord.lat_absen,
            longitude: checkOutRecord.long_absen,
            distance: checkOutRecord.jarak_meter,
            status: checkOutRecord.status_lokasi
          },
          similarity: checkOutRecord.similarity_score
        } : null,
        work_duration: workDuration,
        work_duration_minutes: workDurationMinutes,
        work_schedule: workSchedule
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/attendance/history:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance history for logged-in employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Attendance history retrieved successfully
 */
router.get('/attendance/history', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;
    const karyawanId = req.user.id;

    let query = `
      SELECT 
        p.id,
        DATE_FORMAT(p.waktu, '%Y-%m-%d') as date,
        p.waktu as time,
        p.attendance_type as type,
        p.lat_absen as latitude,
        p.long_absen as longitude,
        p.jarak_meter as distance,
        p.similarity_score,
        p.foto_checkin as photo,
        CASE 
          WHEN p.attendance_type = 'clock_in' AND p.is_late = 1 THEN 'late'
          WHEN p.attendance_type = 'clock_out' AND p.is_early = 1 THEN 'early'
          WHEN p.attendance_type = 'clock_out' AND p.overtime_minutes > 0 THEN 'overtime'
          ELSE 'on_time'
        END as status
      FROM presensi p
      WHERE p.id_karyawan = ?
    `;

    const params = [karyawanId];

    if (start_date) {
      query += ' AND DATE(p.waktu) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(p.waktu) <= ?';
      params.push(end_date);
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    query += ` ORDER BY p.waktu DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await connection.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM presensi WHERE id_karyawan = ?';
    const countParams = [karyawanId];
    
    if (start_date) {
      countQuery += ' AND DATE(waktu) >= ?';
      countParams.push(start_date);
    }
    
    if (end_date) {
      countQuery += ' AND DATE(waktu) <= ?';
      countParams.push(end_date);
    }

    const [countRows] = await connection.execute(countQuery, countParams);
    const total = countRows[0].total;

    // Transform data to match Android model
    const records = rows.map(row => ({
      id: row.id,
      date: row.date,
      time: row.time,
      type: row.type,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
        distance: row.distance,
        is_valid: row.distance <= 100
      },
      face_match: row.similarity_score ? {
        is_match: row.similarity_score >= 0.75,
        similarity: row.similarity_score
      } : null,
      photo: row.photo,
      status: row.status
    }));

    res.json({
      success: true,
      message: 'Attendance history retrieved successfully',
      data: {
        records: records,
        pagination: {
          total: total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < total
        }
      }
    });

  } catch (error) {
    console.error('Get attendance history error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      error: error.message
    });
  } finally {
    await connection.end();
  }
});

// ============================================
// VALIDATION APIs (Validasi)
// Endpoint untuk validasi lokasi dan wajah
// ============================================

/**
 * @swagger
 * /api/validation/location:
 *   post:
 *     tags: [Validation]
 *     summary: Validasi lokasi GPS dalam radius kantor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: Latitude lokasi user
 *                 example: -6.200000
 *               longitude:
 *                 type: number
 *                 description: Longitude lokasi user
 *                 example: 106.816666
 *     responses:
 *       200:
 *         description: Hasil validasi lokasi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     distance:
 *                       type: integer
 *                       example: 45
 *                       description: Jarak dalam meter
 *                     allowedRadius:
 *                       type: integer
 *                       example: 100
 *                       description: Radius yang diizinkan dalam meter
 *                     officeLocation:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 */
router.post('/validation/location', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
        code: 'MISSING_COORDINATES'
      });
    }

    console.log(`[Location Validation] User: ${req.user.nik}, Lat: ${latitude}, Lng: ${longitude}`);

    // Get office location settings
    const [settingsRows] = await connection.execute(
      'SELECT lat_kantor, long_kantor, radius_meter FROM pengaturan LIMIT 1'
    );

    if (settingsRows.length === 0) {
      console.log('[Location Validation] ERROR: No office location configured');
      return res.status(500).json({
        success: false,
        message: 'Office location not configured',
        code: 'NO_OFFICE_LOCATION'
      });
    }

    const settings = settingsRows[0];
    console.log(`[Location Validation] Office: Lat ${settings.lat_kantor}, Lng ${settings.long_kantor}, Radius ${settings.radius_meter}m`);

    // Validate location
    const locationValidation = isLocationValid(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(settings.lat_kantor),
      parseFloat(settings.long_kantor),
      settings.radius_meter
    );

    console.log(`[Location Validation] Result: isValid=${locationValidation.isValid}, distance=${locationValidation.distance}m`);

    res.json({
      success: true,
      data: {
        isValid: locationValidation.isValid,
        distance: locationValidation.distance,
        allowedRadius: locationValidation.allowedRadius,
        officeLocation: {
          latitude: parseFloat(settings.lat_kantor),
          longitude: parseFloat(settings.long_kantor)
        },
        userLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        }
      }
    });

  } catch (error) {
    console.error('Location validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

/**
 * @swagger
 * /api/validation/face-match:
 *   post:
 *     tags: [Validation]
 *     summary: Validasi kecocokan wajah dengan referensi
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Foto untuk face recognition
 *     responses:
 *       200:
 *         description: Hasil validasi wajah
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isMatch:
 *                       type: boolean
 *                       example: true
 *                     similarity:
 *                       type: number
 *                       example: 0.85
 *                     confidence:
 *                       type: string
 *                       example: "Tinggi"
 *                     threshold:
 *                       type: number
 *                       example: 0.65
 *                     facesDetected:
 *                       type: integer
 *                       example: 1
 *                     faces:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           box:
 *                             type: object
 *                             properties:
 *                               xMin:
 *                                 type: integer
 *                               yMin:
 *                                 type: integer
 *                               xMax:
 *                                 type: integer
 *                               yMax:
 *                                 type: integer
 *                               width:
 *                                 type: integer
 *                               height:
 *                                 type: integer
 *                           confidence:
 *                             type: number
 */
router.post('/validation/face-match', authenticateToken, upload.single('photo'), async (req, res) => {
  const connection = await getConnection();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required',
        code: 'NO_PHOTO'
      });
    }

    // Get employee's face reference
    const [faceRows] = await connection.execute(
      'SELECT * FROM karyawan_face_reference WHERE karyawan_id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (faceRows.length === 0) {
      // Delete uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: 'No face reference found. Please complete activation first.',
        code: 'NO_FACE_REFERENCE'
      });
    }

    const faceReference = faceRows[0];
    
    // Parse faces_data - handle both string and object
    let referenceFaces;
    if (typeof faceReference.faces_data === 'string') {
      referenceFaces = JSON.parse(faceReference.faces_data);
    } else {
      referenceFaces = faceReference.faces_data;
    }

    // Detect faces in uploaded photo
    const detectedFaces = await detectFaces(req.file.path);

    // Delete uploaded file after processing (validation doesn't need to keep the file)
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (detectedFaces.length === 0) {
      return res.json({
        success: true,
        data: {
          isMatch: false,
          similarity: 0,
          confidence: 'Rendah',
          threshold: 0.65,
          facesDetected: 0,
          faces: [],
          message: 'No faces detected in photo'
        }
      });
    }

    // Compare faces
    const matchResults = await compareFaces(referenceFaces, detectedFaces);
    const bestMatch = matchResults.find(result => result.isMatch) || matchResults[0];

    res.json({
      success: true,
      data: {
        isMatch: bestMatch.isMatch,
        similarity: bestMatch.similarity,
        confidence: bestMatch.confidence,
        threshold: bestMatch.threshold,
        facesDetected: detectedFaces.length,
        faces: detectedFaces,
        matchResults: matchResults,
        referenceInfo: {
          facesCount: referenceFaces.length,
          uploadTime: faceReference.upload_time
        }
      }
    });

  } catch (error) {
    console.error('Face validation error:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});

// ============================================
// SETTINGS API (Pengaturan)
// Endpoint untuk mengambil pengaturan sistem
// ============================================

/**
 * @swagger
 * /api/settings/office-location:
 *   get:
 *     tags: [Settings]
 *     summary: Get koordinat kantor dan radius yang diizinkan
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data lokasi kantor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       example: -6.200000
 *                       description: Latitude kantor
 *                     longitude:
 *                       type: number
 *                       example: 106.816666
 *                       description: Longitude kantor
 *                     radius:
 *                       type: integer
 *                       example: 100
 *                       description: Radius yang diizinkan dalam meter
 *                     address:
 *                       type: string
 *                       example: "Jakarta, Indonesia"
 *                       description: Alamat kantor (optional)
 */
router.get('/settings/office-location', authenticateToken, async (req, res) => {
  const connection = await getConnection();
  
  try {
    // Get office location settings
    const [settingsRows] = await connection.execute(
      'SELECT lat_kantor, long_kantor, radius_meter FROM pengaturan LIMIT 1'
    );

    if (settingsRows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Office location not configured',
        code: 'NO_OFFICE_LOCATION'
      });
    }

    const settings = settingsRows[0];

    res.json({
      success: true,
      data: {
        latitude: parseFloat(settings.lat_kantor),
        longitude: parseFloat(settings.long_kantor),
        radius: settings.radius_meter,
        coordinates: {
          lat: parseFloat(settings.lat_kantor),
          lng: parseFloat(settings.long_kantor)
        }
      }
    });

  } catch (error) {
    console.error('Get office location error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    await connection.end();
  }
});
// ============================================
// ADMIN TESTING APIs (Development Only)
// Endpoint untuk testing face recognition
// CATATAN: Hanya untuk development, disable di production!
// ============================================

/**
 * @swagger
 * /api/admin/test/upload-reference:
 *   post:
 *     tags: [Admin Testing]
 *     summary: Upload foto referensi untuk testing (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *             properties:
 *               reference:
 *                 type: string
 *                 format: binary
 *                 description: Foto referensi untuk testing
 *     responses:
 *       200:
 *         description: Foto referensi testing berhasil diupload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Test reference photo uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     testId:
 *                       type: string
 *                     facesDetected:
 *                       type: integer
 *                     faces:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.post('/admin/test/upload-reference', authenticateToken, upload.single('reference'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    const imagePath = req.file.path;
    
    // Detect faces using AI
    const faces = await detectFaces(imagePath);
    
    if (faces.length === 0) {
      // Delete uploaded file if no faces detected
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(400).json({
        success: false,
        message: 'No faces detected in the image',
        code: 'NO_FACES'
      });
    }

    // Store reference data temporarily (in memory or temp file)
    const testId = `test_${Date.now()}_${req.user.id}`;
    
    // For testing purposes, we'll store in a simple way
    // In production, you might want to use Redis or temporary database
    global.testReferences = global.testReferences || {};
    global.testReferences[testId] = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: imagePath,
      faces: faces,
      uploadTime: new Date().toISOString(),
      userId: req.user.id
    };

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
    
    res.status(500).json({
      success: false,
      message: 'Failed to process test reference image',
      code: 'PROCESSING_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/admin/test/match-face:
 *   post:
 *     tags: [Admin Testing]
 *     summary: Test face matching dengan referensi (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *               - testId
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Foto untuk dicocokkan
 *               testId:
 *                 type: string
 *                 description: ID referensi test dari upload-reference
 *     responses:
 *       200:
 *         description: Hasil test face matching
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Face matching test completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     testId:
 *                       type: string
 *                     facesDetected:
 *                       type: integer
 *                     matchResults:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           isMatch:
 *                             type: boolean
 *                           similarity:
 *                             type: number
 *                           confidence:
 *                             type: string
 */
router.post('/admin/test/match-face', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { testId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    if (!testId) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        message: 'Test reference not found. Please upload reference first.',
        code: 'NO_TEST_REFERENCE'
      });
    }

    const imagePath = req.file.path;
    
    // Detect faces in uploaded photo
    const detectedFaces = await detectFaces(imagePath);

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
          message: 'No faces detected in test photo'
        }
      });
    }

    // Compare faces with test reference
    const matchResults = await compareFaces(testReference.faces, detectedFaces);

    res.json({
      success: true,
      message: 'Face matching test completed',
      data: {
        testId: testId,
        facesDetected: detectedFaces.length,
        faces: detectedFaces,
        matchResults: matchResults,
        reference: {
          filename: testReference.originalName,
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
    
    res.status(500).json({
      success: false,
      message: 'Failed to test face matching',
      code: 'PROCESSING_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/admin/test/realtime-match:
 *   post:
 *     tags: [Admin Testing]
 *     summary: Real-time face matching test (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - frame
 *               - testId
 *             properties:
 *               frame:
 *                 type: string
 *                 format: binary
 *                 description: Frame dari camera untuk real-time matching
 *               testId:
 *                 type: string
 *                 description: ID referensi test
 *     responses:
 *       200:
 *         description: Hasil real-time face matching
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     testId:
 *                       type: string
 *                     facesDetected:
 *                       type: integer
 *                     matchResults:
 *                       type: array
 *                       items:
 *                         type: object
 *                     timestamp:
 *                       type: string
 */
router.post('/admin/test/realtime-match', authenticateToken, upload.single('frame'), async (req, res) => {
  try {
    const { testId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No frame provided',
        code: 'NO_FRAME'
      });
    }

    if (!testId) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        message: 'Test reference not found',
        code: 'NO_TEST_REFERENCE'
      });
    }

    const imagePath = req.file.path;
    
    try {
      // Detect faces in frame
      const detectedFaces = await detectFaces(imagePath);

      // Delete frame immediately after processing
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      if (detectedFaces.length === 0) {
        return res.json({
          success: true,
          data: {
            testId: testId,
            facesDetected: 0,
            faces: [],
            matchResults: [],
            timestamp: new Date().toISOString()
          }
        });
      }

      // Compare faces (no database save for real-time)
      const matchResults = await compareFaces(testReference.faces, detectedFaces);

      res.json({
        success: true,
        data: {
          testId: testId,
          facesDetected: detectedFaces.length,
          faces: detectedFaces,
          matchResults: matchResults,
          summary: {
            totalFaces: detectedFaces.length,
            matchedFaces: matchResults.filter(r => r.isMatch).length,
            averageSimilarity: matchResults.length > 0 ? 
              (matchResults.reduce((sum, r) => sum + r.similarity, 0) / matchResults.length).toFixed(4) : 0,
            highestSimilarity: matchResults.length > 0 ? 
              Math.max(...matchResults.map(r => r.similarity)).toFixed(4) : 0
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (processingError) {
      // Ensure frame is deleted even if processing fails
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      throw processingError;
    }

  } catch (error) {
    console.error('Real-time test matching error:', error);
    
    // Delete uploaded frame on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process real-time frame',
      code: 'PROCESSING_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/face/detect-realtime:
 *   post:
 *     tags: [Face Recognition]
 *     summary: Detect faces in realtime frame (for Android)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - frame
 *             properties:
 *               frame:
 *                 type: string
 *                 format: binary
 *                 description: Camera frame image
 *     responses:
 *       200:
 *         description: Face detection successful
 */
router.post('/face/detect-realtime', authenticateToken, upload.single('frame'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No frame provided',
        code: 'NO_FRAME'
      });
    }

    const imagePath = req.file.path;

    try {
      // Detect faces in frame
      const detectedFaces = await detectFaces(imagePath);

      // Delete frame immediately after processing
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      res.json({
        success: true,
        data: {
          facesDetected: detectedFaces.length,
          faces: detectedFaces.map(face => ({
            box: face.box,
            keypoints: face.keypoints,
            confidence: face.confidence || 1.0
          })),
          timestamp: new Date().toISOString()
        }
      });

    } catch (processingError) {
      // Ensure frame is deleted even if processing fails
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      throw processingError;
    }

  } catch (error) {
    console.error('Realtime face detection error:', error);
    
    // Delete uploaded frame on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to detect faces',
      code: 'DETECTION_ERROR'
    });
  }
});


module.exports = router;
