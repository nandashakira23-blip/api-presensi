/**
 * Browser-based Face Recognition Utility
 * 
 * This utility provides helper functions for browser-side face recognition
 * using TensorFlow.js CDN. No server-side dependencies required.
 */

class BrowserFaceRecognitionHelper {
    constructor() {
        this.threshold = 0.8;
        this.modelConfig = {
            runtime: 'mediapipe', // or 'tfjs'
            modelType: 'short', // 'short' or 'full'
            maxFaces: 5,
            minDetectionConfidence: 0.5,
            minSuppressionThreshold: 0.3
        };
    }

    /**
     * Get the recommended CDN script tags for TensorFlow.js
     */
    getCDNScripts() {
        return [
            'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js',
            'https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection/dist/face-detection.min.js'
        ];
    }

    /**
     * Get the model configuration for MediaPipe Face Detector
     */
    getModelConfig() {
        return {
            model: 'MediaPipeFaceDetector',
            config: this.modelConfig,
            example: `
// Initialize face detection
const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
const detectorConfig = {
    runtime: '${this.modelConfig.runtime}',
    modelType: '${this.modelConfig.modelType}',
    maxFaces: ${this.modelConfig.maxFaces},
    minDetectionConfidence: ${this.modelConfig.minDetectionConfidence},
    minSuppressionThreshold: ${this.modelConfig.minSuppressionThreshold}
};
const detector = await faceDetection.createDetector(model, detectorConfig);

// Detect faces
const faces = await detector.estimateFaces(imageElement);
            `
        };
    }

    /**
     * Generate JavaScript code for face detection
     */
    generateFaceDetectionCode() {
        return `
// Face Detection with MediaPipe
async function initializeFaceDetection() {
    try {
        // Set TensorFlow.js backend
        await tf.setBackend('webgl');
        await tf.ready();
        
        // Create MediaPipe Face Detector
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig = {
            runtime: '${this.modelConfig.runtime}',
            modelType: '${this.modelConfig.modelType}',
            maxFaces: ${this.modelConfig.maxFaces},
            minDetectionConfidence: ${this.modelConfig.minDetectionConfidence},
            minSuppressionThreshold: ${this.modelConfig.minSuppressionThreshold}
        };
        
        const detector = await faceDetection.createDetector(model, detectorConfig);
        return detector;
        
    } catch (error) {
        console.error('Failed to initialize face detection:', error);
        throw error;
    }
}

async function detectFaces(imageElement, detector) {
    try {
        const faces = await detector.estimateFaces(imageElement);
        
        return {
            success: faces.length > 0,
            faceCount: faces.length,
            faces: faces.map((face, index) => ({
                id: index,
                box: {
                    x: Math.round(face.box.xMin),
                    y: Math.round(face.box.yMin),
                    width: Math.round(face.box.width),
                    height: Math.round(face.box.height)
                },
                confidence: face.score || 0.8,
                keypoints: face.keypoints ? face.keypoints.map(kp => ({
                    x: Math.round(kp.x),
                    y: Math.round(kp.y),
                    name: kp.name
                })) : []
            })),
            message: faces.length > 0 ? 
                \`\${faces.length} face(s) detected\` : 
                'No faces detected'
        };
        
    } catch (error) {
        console.error('Face detection failed:', error);
        return {
            success: false,
            faceCount: 0,
            faces: [],
            message: 'Face detection failed: ' + error.message
        };
    }
}

function calculateFaceSimilarity(face1, face2) {
    try {
        // 1. Confidence similarity
        const conf1 = face1.confidence || 0.8;
        const conf2 = face2.confidence || 0.8;
        const confidenceSimilarity = 1 - Math.abs(conf1 - conf2);
        
        // 2. Box size similarity
        const area1 = face1.box.width * face1.box.height;
        const area2 = face2.box.width * face2.box.height;
        const sizeSimilarity = 1 - Math.abs(area1 - area2) / Math.max(area1, area2);
        
        // 3. Keypoints similarity (if available)
        let keypointsSimilarity = 0.5; // default
        if (face1.keypoints && face2.keypoints && face1.keypoints.length > 0 && face2.keypoints.length > 0) {
            const commonKeypoints = [];
            face1.keypoints.forEach(kp1 => {
                const kp2 = face2.keypoints.find(kp => kp.name === kp1.name);
                if (kp2) {
                    commonKeypoints.push({ kp1, kp2 });
                }
            });
            
            if (commonKeypoints.length > 0) {
                let totalDistance = 0;
                commonKeypoints.forEach(({ kp1, kp2 }) => {
                    const distance = Math.sqrt(
                        Math.pow(kp1.x - kp2.x, 2) + Math.pow(kp1.y - kp2.y, 2)
                    );
                    totalDistance += distance;
                });
                
                const avgDistance = totalDistance / commonKeypoints.length;
                keypointsSimilarity = Math.max(0, 1 - (avgDistance / 100));
            }
        }
        
        // Weighted combination
        const similarity = (
            confidenceSimilarity * 0.3 +
            sizeSimilarity * 0.2 +
            keypointsSimilarity * 0.5
        );
        
        return Math.min(1, Math.max(0, similarity));
        
    } catch (error) {
        console.error('Similarity calculation error:', error);
        return 0;
    }
}

function drawFaceAnnotations(canvas, faces) {
    const ctx = canvas.getContext('2d');
    
    faces.forEach((face, index) => {
        // Draw bounding box
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 3;
        ctx.strokeRect(face.box.x, face.box.y, face.box.width, face.box.height);
        
        // Draw confidence label
        ctx.fillStyle = '#007bff';
        ctx.font = '16px Arial';
        ctx.fillText(
            \`Face \${index + 1}: \${Math.round(face.confidence * 100)}%\`,
            face.box.x,
            face.box.y - 5
        );
        
        // Draw keypoints
        if (face.keypoints && face.keypoints.length > 0) {
            face.keypoints.forEach(keypoint => {
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
                ctx.fill();
                
                // Label keypoint
                ctx.fillStyle = '#333';
                ctx.font = '10px Arial';
                ctx.fillText(keypoint.name, keypoint.x + 5, keypoint.y - 5);
            });
        }
    });
}
        `;
    }

    /**
     * Get system information for browser-based face recognition
     */
    getSystemInfo() {
        return {
            mode: 'browser-cdn',
            engine: 'TensorFlow.js CDN + MediaPipe Face Detection',
            version: 'CDN Latest',
            threshold: this.threshold,
            modelType: this.modelConfig.modelType,
            maxFaces: this.modelConfig.maxFaces,
            minDetectionConfidence: this.modelConfig.minDetectionConfidence,
            runtime: this.modelConfig.runtime,
            features: [
                'Browser-only Implementation',
                'No Server Dependencies',
                'CDN-based TensorFlow.js',
                'MediaPipe Face Detection',
                'Real-time Processing',
                'Face Keypoints (6 points)',
                'WebGL Acceleration',
                'Lightweight & Fast',
                'Easy Integration'
            ],
            cdnScripts: this.getCDNScripts(),
            requirements: [
                'Modern browser with WebGL support',
                'Internet connection for CDN',
                'Camera/image upload capability'
            ]
        };
    }

    /**
     * Set similarity threshold
     */
    setThreshold(threshold) {
        if (threshold >= 0 && threshold <= 1) {
            this.threshold = threshold;
            return true;
        }
        return false;
    }

    /**
     * Get HTML template for face recognition
     */
    getHTMLTemplate() {
        const scripts = this.getCDNScripts();
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TensorFlow.js Face Recognition</title>
    
    <!-- TensorFlow.js CDN Scripts -->
    ${scripts.map(script => `<script src="${script}"></script>`).join('\n    ')}
</head>
<body>
    <div id="app">
        <h1>TensorFlow.js Face Recognition</h1>
        <input type="file" id="imageInput" accept="image/*">
        <button onclick="detectFaces()">Detect Faces</button>
        <div id="results"></div>
    </div>

    <script>
        let detector = null;
        
        ${this.generateFaceDetectionCode()}
        
        // Initialize when page loads
        window.addEventListener('load', async () => {
            try {
                detector = await initializeFaceDetection();
                console.log('Face detection ready');
            } catch (error) {
                console.error('Initialization failed:', error);
            }
        });
        
        // Handle file input and detect faces
        async function detectFaces() {
            const input = document.getElementById('imageInput');
            const file = input.files[0];
            
            if (!file || !detector) return;
            
            const img = new Image();
            img.onload = async () => {
                const result = await detectFaces(img, detector);
                document.getElementById('results').innerHTML = 
                    \`<pre>\${JSON.stringify(result, null, 2)}</pre>\`;
            };
            img.src = URL.createObjectURL(file);
        }
    </script>
</body>
</html>
        `;
    }
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = new BrowserFaceRecognitionHelper();
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.BrowserFaceRecognition = new BrowserFaceRecognitionHelper();
}