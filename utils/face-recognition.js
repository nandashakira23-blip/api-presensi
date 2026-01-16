const tf = require('@tensorflow/tfjs');
const faceDetection = require('@tensorflow-models/face-detection');
const sharp = require('sharp');

let detector = null;

async function initializeDetector() {
  if (!detector) {
    console.log('Initializing AI face detector...');
    try {
      await tf.setBackend('cpu');
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig = { runtime: 'tfjs', modelType: 'short', maxFaces: 10 };
      detector = await faceDetection.createDetector(model, detectorConfig);
      console.log('AI Face detector initialized');
    } catch (error) {
      console.error('Error initializing detector:', error);
      throw error;
    }
  }
  return detector;
}

async function detectFaces(imagePath) {
  try {
    await initializeDetector();
    const { data, info } = await sharp(imagePath)
      .resize(640, 480, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { width, height, channels } = info;
    let tensor;
    
    if (channels === 4) {
      const rgbData = new Uint8Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        rgbData[i * 3] = data[i * 4];
        rgbData[i * 3 + 1] = data[i * 4 + 1];
        rgbData[i * 3 + 2] = data[i * 4 + 2];
      }
      tensor = tf.tensor3d(rgbData, [height, width, 3]);
    } else if (channels === 3) {
      tensor = tf.tensor3d(new Uint8Array(data), [height, width, 3]);
    } else {
      throw new Error('Unsupported number of channels: ' + channels);
    }
    
    const faces = await detector.estimateFaces(tensor);
    tensor.dispose();
    console.log('Detected ' + faces.length + ' faces');
    
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
        name: kp.name || 'point_' + kp.x + '_' + kp.y
      })) : [],
      confidence: face.score || 0.8
    }));
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw error;
  }
}

function euclideanDistance(point1, point2) {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateBoxSimilarity(box1, box2) {
  const maxDim = 640;
  const center1 = { x: box1.xMin + box1.width / 2, y: box1.yMin + box1.height / 2 };
  const center2 = { x: box2.xMin + box2.width / 2, y: box2.yMin + box2.height / 2 };
  const centerDistance = euclideanDistance(center1, center2) / maxDim;
  const sizeRatio = Math.min(box1.width, box2.width) / Math.max(box1.width, box2.width) * Math.min(box1.height, box2.height) / Math.max(box1.height, box2.height);
  const centerSimilarity = Math.max(0, 1 - centerDistance * 2);
  return (centerSimilarity * 0.6 + sizeRatio * 0.4);
}

function calculateKeypointSimilarity(keypoints1, keypoints2) {
  if (!keypoints1 || !keypoints2 || keypoints1.length === 0 || keypoints2.length === 0) {
    // Jika tidak ada keypoint, return 0 (bukan 0.5) - lebih strict
    return 0;
  }
  let totalDistance = 0;
  let validComparisons = 0;
  const maxDistance = 80; // Lebih ketat dari 100
  
  for (let i = 0; i < Math.min(keypoints1.length, keypoints2.length); i++) {
    const distance = euclideanDistance(keypoints1[i], keypoints2[i]);
    totalDistance += Math.min(distance, maxDistance);
    validComparisons++;
  }
  
  if (validComparisons === 0) return 0;
  const avgDistance = totalDistance / validComparisons;
  return Math.max(0, 1 - (avgDistance / maxDistance));
}

async function compareFaces(referenceFaces, detectedFaces) {
  const results = [];
  const threshold = 0.70; // 70% - lebih mudah untuk user experience
  console.log('Comparing ' + detectedFaces.length + ' detected faces with ' + referenceFaces.length + ' reference faces (threshold: ' + threshold + ')');

  for (let i = 0; i < detectedFaces.length; i++) {
    const detectedFace = detectedFaces[i];
    let bestMatch = null;
    let bestSimilarity = 0;

    for (let j = 0; j < referenceFaces.length; j++) {
      const referenceFace = referenceFaces[j];
      const boxSimilarity = calculateBoxSimilarity(referenceFace.box, detectedFace.box);
      const keypointSimilarity = calculateKeypointSimilarity(referenceFace.keypoints, detectedFace.keypoints);
      
      // Keypoint lebih penting dari box position
      // Jika tidak ada keypoint, similarity akan sangat rendah
      const combinedSimilarity = (boxSimilarity * 0.3 + keypointSimilarity * 0.7);
      console.log('Face ' + i + ' vs Ref ' + j + ': box=' + (boxSimilarity * 100).toFixed(1) + '%, keypoint=' + (keypointSimilarity * 100).toFixed(1) + '%, combined=' + (combinedSimilarity * 100).toFixed(1) + '%');

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

    const isMatch = bestSimilarity > threshold;
    console.log('Best match for face ' + i + ': ' + (bestSimilarity * 100).toFixed(1) + '% ' + (isMatch ? 'MATCH' : 'no match'));

    results.push({
      faceIndex: i,
      isMatch: isMatch,
      similarity: bestSimilarity,
      confidence: isMatch ? 'high' : (bestSimilarity > 0.7 ? 'medium' : 'low'),
      bestMatch: bestMatch,
      face: detectedFace,
      threshold: threshold
    });
  }
  return results;
}

module.exports = {
  detectFaces: detectFaces,
  compareFaces: compareFaces,
  initializeDetector: initializeDetector
};
