const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const faceDetection = require('./face-detection');
const database = require('./database');
const apiRoutes = require('./api-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api', apiRoutes);

// Setup multer untuk upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File harus berupa gambar!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload foto referensi
app.post('/upload-reference', upload.single('reference'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    console.log('Processing reference image:', req.file.originalname);
    const imagePath = req.file.path;
    
    // Gunakan AI face detection
    const faces = await faceDetection.detectFaces(imagePath);
    
    if (faces.length === 0) {
      // Delete uploaded file if no faces detected
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(400).json({ error: 'Tidak ada wajah yang terdeteksi pada foto referensi' });
    }

    // Save to database
    const savedReference = await database.saveReferencePhoto(
      req.file.filename,
      req.file.originalname,
      imagePath,
      faces,
      faces.length
    );

    res.json({
      success: true,
      message: 'Foto referensi berhasil diupload dan disimpan ke database',
      facesDetected: faces.length,
      faces: faces,
      referenceId: savedReference.id,
      aiDetection: true
    });

  } catch (error) {
    console.error('Error processing reference image:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Gagal memproses foto referensi: ' + error.message,
      details: error.stack
    });
  }
});

// Upload foto untuk dicocokkan
app.post('/match-face', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    console.log('Processing match image:', req.file.originalname);
    
    // Get active reference from database
    const referenceData = await database.getActiveReference();
    if (!referenceData) {
      // Delete uploaded file if no reference
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Belum ada foto referensi. Upload foto referensi terlebih dahulu.' });
    }

    const imagePath = req.file.path;
    
    // Gunakan AI face detection
    const faces = await faceDetection.detectFaces(imagePath);

    if (faces.length === 0) {
      // Delete uploaded file if no faces detected
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(400).json({ error: 'Tidak ada wajah yang terdeteksi pada foto' });
    }

    // Lakukan pencocokan wajah dengan AI
    const matchResults = await faceDetection.compareFaces(referenceData.facesData, faces);

    // Save match result to database
    await database.saveMatchResult(
      referenceData.id,
      req.file.filename,
      imagePath,
      faces.length,
      matchResults
    );

    res.json({
      success: true,
      message: 'Pencocokan wajah selesai dengan AI dan disimpan ke database',
      facesDetected: faces.length,
      faces: faces,
      matchResults: matchResults,
      referenceId: referenceData.id,
      aiDetection: true
    });

  } catch (error) {
    console.error('Error matching faces:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Gagal melakukan pencocokan wajah: ' + error.message,
      details: error.stack
    });
  }
});

// Get status referensi
app.get('/reference-status', async (req, res) => {
  try {
    const referenceData = await database.getActiveReference();
    
    if (referenceData) {
      res.json({
        hasReference: true,
        referenceData: {
          id: referenceData.id,
          imagePath: referenceData.filePath,
          originalName: referenceData.originalName,
          faces: referenceData.facesData,
          uploadTime: referenceData.uploadTime,
          aiDetection: true
        }
      });
    } else {
      res.json({
        hasReference: false,
        referenceData: null
      });
    }
  } catch (error) {
    console.error('Error getting reference status:', error);
    res.status(500).json({ 
      error: 'Gagal mengecek status referensi: ' + error.message 
    });
  }
});

// Hapus foto referensi
app.delete('/reference', async (req, res) => {
  try {
    const referenceData = await database.getActiveReference();
    
    if (referenceData) {
      await database.deleteReferencePhoto(referenceData.id);
      res.json({ success: true, message: 'Foto referensi berhasil dihapus dari database' });
    } else {
      res.json({ success: true, message: 'Tidak ada foto referensi yang aktif' });
    }
  } catch (error) {
    console.error('Error deleting reference:', error);
    res.status(500).json({ 
      error: 'Gagal menghapus foto referensi: ' + error.message 
    });
  }
});

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Get match history
app.get('/match-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await database.getMatchHistory(limit);
    res.json({
      success: true,
      history: history
    });
  } catch (error) {
    console.error('Error getting match history:', error);
    res.status(500).json({ 
      error: 'Gagal mengambil history: ' + error.message 
    });
  }
});

app.listen(PORT, async () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Menggunakan AI Face Detection dengan TensorFlow.js`);
  console.log(`Menginisialisasi database dan AI model...`);
  
  try {
    // Initialize database
    await database.initDatabase();
    console.log(`Database siap digunakan!`);
    
    // Pre-load AI model untuk performa yang lebih baik
    await faceDetection.initializeDetector();
    console.log(`AI model siap digunakan!`);
  } catch (error) {
    console.error(`Error during initialization:`, error.message);
    console.log(`Server tetap berjalan, tapi mungkin ada masalah dengan database atau AI model`);
  }
});
