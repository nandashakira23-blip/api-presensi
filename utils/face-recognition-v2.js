const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const fs = require('fs');
const path = require('path');

// Setup canvas for face-api
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

// Load face-api models
async function loadModels() {
  if (modelsLoaded) return;
  
  console.log('Loading face recognition models...');
  
  try {
    const modelPath = path.join(__dirname, '../models');
    
    // Create models directory if not exists
    if (!fs.existsSync(modelPath)) {
      fs.mkdirSync(modelPath, { recursive: true });
    }
    
    // Load models from node_modules
    const nodeModulesPath = path.join(__dirname, '../node_modules/@vladmandic/face-api/model');
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(nodeModulesPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(nodeModulesPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(nodeModulesPath)
    ]);
    
    modelsLoaded = true;
    console.log('Face recognition models loaded successfully');
  } catch (error) {
    console.error('Error loading models:', error);
    throw error;
  }
}

// Detect faces and extract embeddings
async function detectFacesWithEmbeddings(imagePath) {
  try {
    await loadModels();
    
    // Load image
    const img = await canvas.loadImage(imagePath);
    
    // Detect faces with landmarks and descriptors (embeddings)
    const detections = await faceapi
      .detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    if (!detections || detections.length === 0) {
      return [];
    }
    
    // Format results
    return detections.map((detection, index) => ({
      id: index,
      box: {
        xMin: Math.round(detection.detection.box.x),
        yMin: Math.round(detection.detection.box.y),
        xMax: Math.round(detection.detection.box.x + detection.detection.box.width),
        yMax: Math.round(detection.detection.box.y + detection.detection.box.height),
        width: Math.round(detection.detection.box.width),
        height: Math.round(detection.detection.box.height)
      },
      landmarks: detection.landmarks ? {
        positions: detection.landmarks.positions.map(p => ({
          x: Math.round(p.x),
          y: Math.round(p.y)
        }))
      } : null,
      descriptor: Array.from(detection.descriptor), // 128-dimensional face embedding
      confidence: detection.detection.score
    }));
    
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw error;
  }
}

// Calculate Euclidean distance between two face descriptors
function calculateDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) return 1;
  if (descriptor1.length !== descriptor2.length) return 1;
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
  }
  
  return Math.sqrt(sum);
}

// Compare faces using face embeddings (descriptors)
async function compareFacesWithEmbeddings(referenceFaces, detectedFaces) {
  const results = [];
  // Adjusted thresholds based on testing
  const strictThreshold = 0.5;    // Very strict - same person, same conditions
  const normalThreshold = 0.6;    // Normal - same person, different conditions
  const looseThreshold = 0.7;     // Loose - might be same person
  
  const distanceThreshold = normalThreshold; // Use normal by default
  
  console.log(`Comparing ${detectedFaces.length} detected faces with ${referenceFaces.length} reference faces`);
  console.log(`   Threshold: ${distanceThreshold} (lower distance = more similar)`);
  
  for (let i = 0; i < detectedFaces.length; i++) {
    const detectedFace = detectedFaces[i];
    let bestMatch = null;
    let bestDistance = Infinity;
    
    // Compare with all reference faces
    for (let j = 0; j < referenceFaces.length; j++) {
      const referenceFace = referenceFaces[j];
      
      if (!detectedFace.descriptor || !referenceFace.descriptor) {
        console.log(`Missing descriptor for face ${i} or reference ${j}`);
        continue;
      }
      
      // Calculate Euclidean distance between face embeddings
      const distance = calculateDistance(referenceFace.descriptor, detectedFace.descriptor);
      
      console.log(`   Face ${i} vs Reference ${j}: distance = ${distance.toFixed(3)} ${distance < distanceThreshold ? 'MATCH' : 'no match'}`);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = {
          referenceIndex: j,
          distance: distance,
          similarity: Math.max(0, Math.min(1, 1 - (distance / 1.5))) // Normalize to 0-1 range
        };
      }
    }
    
    const isMatch = bestDistance < distanceThreshold;
    const similarity = bestMatch ? bestMatch.similarity : 0;
    
    // Determine confidence level
    let confidence = 'low';
    if (bestDistance < strictThreshold) {
      confidence = 'high';
    } else if (bestDistance < normalThreshold) {
      confidence = 'high';
    } else if (bestDistance < looseThreshold) {
      confidence = 'medium';
    }
    
    console.log(`   Best match for face ${i}: distance=${bestDistance.toFixed(3)}, isMatch=${isMatch}, similarity=${(similarity * 100).toFixed(1)}%, confidence=${confidence}`);
    
    results.push({
      faceIndex: i,
      isMatch: isMatch,
      similarity: similarity,
      distance: bestDistance,
      confidence: confidence,
      bestMatch: bestMatch,
      face: detectedFace,
      threshold: distanceThreshold,
      method: 'face-embeddings'
    });
  }
  
  return results;
}

module.exports = {
  detectFacesWithEmbeddings,
  compareFacesWithEmbeddings,
  loadModels
};
