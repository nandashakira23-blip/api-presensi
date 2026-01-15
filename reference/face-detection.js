const tf = require('@tensorflow/tfjs');
const faceDetection = require('@tensorflow-models/face-detection');
const sharp = require('sharp');

let detector = null;

// Inisialisasi detector
async function initializeDetector() {
  if (!detector) {
    console.log('Menginisialisasi AI face detector...');
    
    try {
      // Set backend ke CPU untuk menghindari masalah WebGL di Node.js
      await tf.setBackend('cpu');
      
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'short', // 'short' atau 'full'
        maxFaces: 10
      };
      
      detector = await faceDetection.createDetector(model, detectorConfig);
      console.log('AI Face detector berhasil diinisialisasi');
    } catch (error) {
      console.error('Error initializing detector:', error);
      throw error;
    }
  }
  return detector;
}

// Deteksi wajah dari file gambar
async function detectFaces(imagePath) {
  try {
    await initializeDetector();
    
    console.log('Memproses gambar:', imagePath);
    
    // Load dan preprocess gambar menggunakan Sharp
    const { data, info } = await sharp(imagePath)
      .resize(640, 480, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha() // Ensure we have alpha channel
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { width, height, channels } = info;
    console.log(`Image info: ${width}x${height}, channels: ${channels}`);
    
    // Convert buffer ke tensor (handle both RGB and RGBA)
    let tensor;
    if (channels === 4) {
      // RGBA - take only RGB channels
      const rgbData = new Uint8Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        rgbData[i * 3] = data[i * 4];     // R
        rgbData[i * 3 + 1] = data[i * 4 + 1]; // G
        rgbData[i * 3 + 2] = data[i * 4 + 2]; // B
      }
      tensor = tf.tensor3d(rgbData, [height, width, 3]);
    } else if (channels === 3) {
      // RGB
      tensor = tf.tensor3d(new Uint8Array(data), [height, width, 3]);
    } else {
      throw new Error(`Unsupported number of channels: ${channels}`);
    }
    
    console.log('Tensor shape:', tensor.shape);
    
    // Deteksi wajah
    const faces = await detector.estimateFaces(tensor);
    
    console.log(`Wajah terdeteksi: ${faces.length}`);
    
    // Cleanup tensor
    tensor.dispose();
    
    return faces.map((face, index) => ({
      id: index,
      box: {
        xMin: Math.round(face.box.xMin),
        yMin: Math.round(face.box.yMin),
        xMax: Math.round(face.box.xMax),
        yMax: Math.round(face.box.yMax),
        width: Math.round(face.box.width),
        height: Math.round(face.box.height)
      },
      keypoints: face.keypoints ? face.keypoints.map(kp => ({
        x: Math.round(kp.x),
        y: Math.round(kp.y),
        name: kp.name || `point_${kp.x}_${kp.y}`
      })) : [],
      confidence: face.score || 0.8
    }));
    
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw error;
  }
}

// Hitung jarak Euclidean antara dua titik
function euclideanDistance(point1, point2) {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Hitung similarity berdasarkan posisi dan ukuran bounding box
function calculateBoxSimilarity(box1, box2) {
  // Normalize berdasarkan ukuran gambar (asumsi max 640x480)
  const maxDim = 640;
  
  // Hitung perbedaan posisi center
  const center1 = { x: box1.xMin + box1.width/2, y: box1.yMin + box1.height/2 };
  const center2 = { x: box2.xMin + box2.width/2, y: box2.yMin + box2.height/2 };
  
  const centerDistance = euclideanDistance(center1, center2) / maxDim;
  
  // Hitung perbedaan ukuran
  const sizeRatio = Math.min(box1.width, box2.width) / Math.max(box1.width, box2.width) *
                   Math.min(box1.height, box2.height) / Math.max(box1.height, box2.height);
  
  // Combine center similarity dan size similarity
  const centerSimilarity = Math.max(0, 1 - centerDistance * 2);
  const sizeSimilarity = sizeRatio;
  
  return (centerSimilarity * 0.6 + sizeSimilarity * 0.4);
}

// Hitung similarity antara dua set keypoints
function calculateKeypointSimilarity(keypoints1, keypoints2) {
  if (!keypoints1 || !keypoints2 || keypoints1.length === 0 || keypoints2.length === 0) {
    return 0.5; // Default similarity jika tidak ada keypoints
  }

  let totalDistance = 0;
  let validComparisons = 0;
  const maxDistance = 100; // Normalize distance

  for (let i = 0; i < keypoints1.length; i++) {
    const kp1 = keypoints1[i];
    const kp2 = keypoints2.find(kp => kp.name === kp1.name);
    
    if (kp2) {
      const distance = euclideanDistance(kp1, kp2);
      totalDistance += Math.min(distance, maxDistance);
      validComparisons++;
    }
  }

  if (validComparisons === 0) return 0.5;

  const avgDistance = totalDistance / validComparisons;
  const similarity = Math.max(0, 1 - (avgDistance / maxDistance));
  
  return similarity;
}

// Bandingkan wajah referensi dengan wajah yang dideteksi
async function compareFaces(referenceFaces, detectedFaces) {
  const results = [];

  for (let i = 0; i < detectedFaces.length; i++) {
    const detectedFace = detectedFaces[i];
    let bestMatch = null;
    let bestSimilarity = 0;

    for (let j = 0; j < referenceFaces.length; j++) {
      const referenceFace = referenceFaces[j];
      
      // Hitung similarity berdasarkan bounding box
      const boxSimilarity = calculateBoxSimilarity(referenceFace.box, detectedFace.box);
      
      // Hitung similarity berdasarkan keypoints
      const keypointSimilarity = calculateKeypointSimilarity(
        referenceFace.keypoints, 
        detectedFace.keypoints
      );
      
      // Combine kedua similarity (box lebih reliable untuk MediaPipe)
      const combinedSimilarity = (boxSimilarity * 0.7 + keypointSimilarity * 0.3);

      if (combinedSimilarity > bestSimilarity) {
        bestSimilarity = combinedSimilarity;
        bestMatch = {
          referenceIndex: j,
          similarity: combinedSimilarity,
          boxSimilarity: boxSimilarity,
          keypointSimilarity: keypointSimilarity
        };
      }
    }

    // Tentukan apakah cocok berdasarkan threshold
    const threshold = 0.65; // Threshold yang lebih realistis
    const isMatch = bestSimilarity > threshold;

    results.push({
      faceIndex: i,
      isMatch: isMatch,
      similarity: bestSimilarity,
      confidence: isMatch ? 'Tinggi' : (bestSimilarity > 0.5 ? 'Sedang' : 'Rendah'),
      bestMatch: bestMatch,
      face: detectedFace,
      details: {
        threshold: threshold,
        boxSimilarity: bestMatch?.boxSimilarity || 0,
        keypointSimilarity: bestMatch?.keypointSimilarity || 0
      }
    });
  }

  return results;
}

// Cleanup resources
function cleanup() {
  if (detector) {
    console.log('Cleaning up detector resources...');
    // TensorFlow.js akan handle cleanup otomatis
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
  detectFaces,
  compareFaces,
  initializeDetector,
  cleanup
};