const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const faceDetection = require('./face-detection');
const database = require('./database');

const router = express.Router();

// Setup multer untuk API
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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// API Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Face Matching API',
    version: '1.0.0',
    description: 'AI-powered face detection and matching API using TensorFlow.js',
    endpoints: {
      'GET /api': 'API documentation',
      'POST /api/reference': 'Upload reference photo',
      'GET /api/reference': 'Get active reference photo info',
      'DELETE /api/reference': 'Delete active reference photo',
      'POST /api/match': 'Match face against reference',
      'POST /api/realtime-match': 'Real-time face matching (no file saving)',
      'GET /api/history': 'Get match history',
      'GET /api/stats': 'Get statistics',
      'POST /api/detect': 'Detect faces in image (no matching)',
      'GET /api/health': 'Health check'
    },
    features: [
      'AI Face Detection with TensorFlow.js MediaPipe',
      'SQLite Database Storage',
      'Real-time Face Matching',
      'Match History Tracking',
      'Statistics and Analytics'
    ]
  });
});

// Health check
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const reference = await database.getActiveReference();
    
    // Check AI model
    await faceDetection.initializeDetector();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        aiModel: 'loaded',
        hasReference: reference !== null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Upload reference photo
router.post('/reference', upload.single('reference'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    console.log('API: Processing reference image:', req.file.originalname);
    const imagePath = req.file.path;
    
    // AI face detection
    const faces = await faceDetection.detectFaces(imagePath);
    
    if (faces.length === 0) {
      // Delete uploaded file if no faces detected
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(400).json({ 
        success: false,
        error: 'No faces detected in the image',
        code: 'NO_FACES'
      });
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
      message: 'Reference photo uploaded and processed successfully',
      data: {
        referenceId: savedReference.id,
        filename: savedReference.filename,
        originalName: savedReference.originalName,
        facesDetected: faces.length,
        faces: faces,
        uploadTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API Error processing reference image:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process reference image',
      details: error.message,
      code: 'PROCESSING_ERROR'
    });
  }
});

// Get active reference photo info
router.get('/reference', async (req, res) => {
  try {
    const referenceData = await database.getActiveReference();
    
    if (referenceData) {
      res.json({
        success: true,
        data: {
          id: referenceData.id,
          filename: referenceData.filename,
          originalName: referenceData.originalName,
          facesCount: referenceData.facesCount,
          uploadTime: referenceData.uploadTime,
          faces: referenceData.facesData
        }
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: 'No active reference photo found'
      });
    }
  } catch (error) {
    console.error('API Error getting reference:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get reference photo',
      details: error.message,
      code: 'DATABASE_ERROR'
    });
  }
});

// Delete active reference photo
router.delete('/reference', async (req, res) => {
  try {
    const referenceData = await database.getActiveReference();
    
    if (referenceData) {
      await database.deleteReferencePhoto(referenceData.id);
      res.json({ 
        success: true, 
        message: 'Reference photo deleted successfully',
        deletedId: referenceData.id
      });
    } else {
      res.json({ 
        success: true, 
        message: 'No active reference photo to delete' 
      });
    }
  } catch (error) {
    console.error('API Error deleting reference:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete reference photo',
      details: error.message,
      code: 'DELETE_ERROR'
    });
  }
});

// Match face against reference
router.post('/match', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    console.log('API: Processing match image:', req.file.originalname);
    
    // Get active reference from database
    const referenceData = await database.getActiveReference();
    if (!referenceData) {
      // Delete uploaded file if no reference
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false,
        error: 'No reference photo available. Upload reference first.',
        code: 'NO_REFERENCE'
      });
    }

    const imagePath = req.file.path;
    
    // AI face detection
    const faces = await faceDetection.detectFaces(imagePath);

    if (faces.length === 0) {
      // Delete uploaded file if no faces detected
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(400).json({ 
        success: false,
        error: 'No faces detected in the image',
        code: 'NO_FACES'
      });
    }

    // Face matching with AI
    const matchResults = await faceDetection.compareFaces(referenceData.facesData, faces);

    // Save match result to database
    const matchId = await database.saveMatchResult(
      referenceData.id,
      req.file.filename,
      imagePath,
      faces.length,
      matchResults
    );

    res.json({
      success: true,
      message: 'Face matching completed successfully',
      data: {
        matchId: matchId,
        referenceId: referenceData.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        facesDetected: faces.length,
        faces: faces,
        matchResults: matchResults,
        summary: {
          totalFaces: faces.length,
          matchedFaces: matchResults.filter(r => r.isMatch).length,
          averageSimilarity: matchResults.reduce((sum, r) => sum + r.similarity, 0) / matchResults.length,
          highestSimilarity: Math.max(...matchResults.map(r => r.similarity))
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API Error matching faces:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to match faces',
      details: error.message,
      code: 'MATCHING_ERROR'
    });
  }
});

// Detect faces only (no matching)
router.post('/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    console.log('API: Detecting faces in:', req.file.originalname);
    const imagePath = req.file.path;
    
    // AI face detection
    const faces = await faceDetection.detectFaces(imagePath);

    // Delete uploaded file after processing
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json({
      success: true,
      message: 'Face detection completed successfully',
      data: {
        filename: req.file.originalname,
        facesDetected: faces.length,
        faces: faces,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API Error detecting faces:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to detect faces',
      details: error.message,
      code: 'DETECTION_ERROR'
    });
  }
});

// Get match history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await database.getMatchHistory(limit);
    
    res.json({
      success: true,
      data: {
        history: history,
        count: history.length,
        limit: limit
      }
    });
  } catch (error) {
    console.error('API Error getting history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get match history',
      details: error.message,
      code: 'HISTORY_ERROR'
    });
  }
});

// Real-time face matching (no file saving)
router.post('/realtime-match', upload.single('frame'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No frame provided',
        code: 'NO_FRAME'
      });
    }

    // Get active reference from database
    const referenceData = await database.getActiveReference();
    if (!referenceData) {
      // Delete uploaded file immediately
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false,
        error: 'No reference photo available',
        code: 'NO_REFERENCE'
      });
    }

    const imagePath = req.file.path;
    
    try {
      // AI face detection
      const faces = await faceDetection.detectFaces(imagePath);

      // Delete file immediately after processing
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      if (faces.length === 0) {
        return res.json({
          success: true,
          data: {
            facesDetected: 0,
            faces: [],
            matchResults: [],
            timestamp: new Date().toISOString()
          }
        });
      }

      // Face matching with AI (no database save)
      const matchResults = await faceDetection.compareFaces(referenceData.facesData, faces);

      res.json({
        success: true,
        data: {
          facesDetected: faces.length,
          faces: faces,
          matchResults: matchResults,
          summary: {
            totalFaces: faces.length,
            matchedFaces: matchResults.filter(r => r.isMatch).length,
            averageSimilarity: matchResults.reduce((sum, r) => sum + r.similarity, 0) / matchResults.length,
            highestSimilarity: Math.max(...matchResults.map(r => r.similarity))
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (processingError) {
      // Ensure file is deleted even if processing fails
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      throw processingError;
    }

  } catch (error) {
    console.error('API Error in real-time matching:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process real-time frame',
      details: error.message,
      code: 'REALTIME_ERROR'
    });
  }
});
router.get('/stats', async (req, res) => {
  try {
    const referenceData = await database.getActiveReference();
    const history = await database.getMatchHistory(100); // Get more for stats
    
    // Helper function to safely parse JSON
    const safeParseJSON = (jsonString) => {
      try {
        if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
          return [];
        }
        return JSON.parse(jsonString);
      } catch (e) {
        console.warn('Failed to parse JSON:', jsonString);
        return [];
      }
    };
    
    const stats = {
      reference: {
        hasActive: referenceData !== null,
        facesCount: referenceData ? referenceData.facesCount : 0,
        uploadTime: referenceData ? referenceData.uploadTime : null
      },
      matching: {
        totalMatches: history.length,
        successfulMatches: history.filter(h => {
          const results = safeParseJSON(h.matchResults);
          return Array.isArray(results) && results.some(r => r && r.isMatch);
        }).length,
        averageFacesPerImage: history.length > 0 ? 
          (history.reduce((sum, h) => sum + (h.facesDetected || 0), 0) / history.length).toFixed(2) : 0
      },
      performance: {
        successRate: history.length > 0 ? 
          (history.filter(h => {
            const results = safeParseJSON(h.matchResults);
            return Array.isArray(results) && results.some(r => r && r.isMatch);
          }).length / history.length * 100).toFixed(2) + '%' : '0%',
        averageSimilarity: history.length > 0 ? 
          (() => {
            let totalSimilarity = 0;
            let validEntries = 0;
            
            history.forEach(h => {
              const results = safeParseJSON(h.matchResults);
              if (Array.isArray(results) && results.length > 0) {
                const avgSim = results.reduce((s, r) => s + (r && r.similarity ? r.similarity : 0), 0) / results.length;
                if (avgSim > 0) {
                  totalSimilarity += avgSim;
                  validEntries++;
                }
              }
            });
            
            return validEntries > 0 ? (totalSimilarity / validEntries * 100).toFixed(2) + '%' : '0%';
          })() : '0%'
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('API Error getting stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get statistics',
      details: error.message,
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;