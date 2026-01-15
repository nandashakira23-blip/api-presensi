// Global variables
let referenceFile = null;
let matchFile = null;
let referenceStream = null;
let matchStream = null;
let referenceCapturedBlob = null;
let matchCapturedBlob = null;
let isRealTimeMode = false;
let realTimeInterval = null;
let referenceData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkReferenceStatus();
    setupDragAndDrop();
});

// Setup drag and drop functionality
function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    if (area.onclick.toString().includes('referenceInput')) {
                        document.getElementById('referenceInput').files = files;
                        referenceFile = file;
                        previewImage(file, 'referencePreview');
                    } else {
                        document.getElementById('matchInput').files = files;
                        matchFile = file;
                        previewImage(file, 'matchPreview');
                    }
                }
            }
        });
    });
}

// Handle file input changes
document.getElementById('referenceInput').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        referenceFile = e.target.files[0];
        previewImage(referenceFile, 'referencePreview');
    }
});

document.getElementById('matchInput').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        matchFile = e.target.files[0];
        previewImage(matchFile, 'matchPreview');
    }
});

// Preview uploaded image
function previewImage(file, containerId) {
    const container = document.getElementById(containerId);
    const reader = new FileReader();
    
    reader.onload = function(e) {
        container.innerHTML = `
            <div style="text-align: center; margin: 15px 0;">
                <img src="${e.target.result}" class="preview-image" alt="Preview">
                <p style="margin-top: 10px; color: #666;">File: ${file.name}</p>
            </div>
        `;
    };
    
    reader.readAsDataURL(file);
}

// Check reference status
async function checkReferenceStatus() {
    try {
        const response = await fetch('/reference-status');
        const data = await response.json();
        
        const statusContainer = document.getElementById('referenceStatus');
        
        if (data.hasReference) {
            statusContainer.innerHTML = `
                <div class="reference-info">
                    <p><strong>Foto referensi sudah tersedia</strong></p>
                    <p>Wajah terdeteksi: ${data.referenceData.faces.length}</p>
                    <p>Upload: ${new Date(data.referenceData.uploadTime).toLocaleString('id-ID')}</p>
                    <button class="delete-btn" onclick="deleteReference()">Hapus Referensi</button>
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="status info">
                    <p>Belum ada foto referensi. Upload foto referensi terlebih dahulu.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error checking reference status:', error);
    }
}

// Upload reference photo
async function uploadReference() {
    if (!referenceFile) {
        showMessage('referenceResult', 'error', 'Pilih foto referensi atau ambil foto dari kamera terlebih dahulu!');
        return;
    }
    
    console.log('Starting reference upload...', referenceFile.name);
    
    const formData = new FormData();
    formData.append('reference', referenceFile);
    
    showLoading(true);
    showMessage('referenceResult', 'info', 'Mengupload dan memproses foto referensi...');
    
    try {
        const response = await fetch('/api/reference', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Upload response:', data);
        
        if (data.success) {
            showMessage('referenceResult', 'success', 
                `${data.message}<br>Wajah terdeteksi: ${data.facesDetected}<br>ID Database: ${data.referenceId}`);
            checkReferenceStatus();
            
            // Update preview with success indicator
            const preview = document.getElementById('referencePreview');
            if (preview.innerHTML.includes('captured-photo')) {
                preview.innerHTML = preview.innerHTML.replace(
                    'Foto berhasil diambil dari kamera',
                    'Foto berhasil disimpan ke database'
                );
            }
        } else {
            showMessage('referenceResult', 'error', `${data.error}`);
        }
    } catch (error) {
        showMessage('referenceResult', 'error', 'Gagal mengupload foto referensi: ' + error.message);
        console.error('Upload error:', error);
    } finally {
        showLoading(false);
    }
}

// Match face
async function matchFace() {
    if (!matchFile) {
        showMessage('matchResult', 'error', 'Pilih foto untuk dicocokkan atau ambil foto dari kamera terlebih dahulu!');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo', matchFile);
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/match', {
            method: 'POST',
            body: formData
        });
        
        console.log('Match response status:', response.status);
        console.log('Match response headers:', response.headers);
        
        const data = await response.json();
        console.log('Match response data:', data);
        
        if (data.success) {
            displayMatchResults(data.data); // Pass data.data instead of data
        } else {
            showMessage('matchResult', 'error', `${data.error}`);
        }
    } catch (error) {
        console.error('Match error details:', error);
        showMessage('matchResult', 'error', 'Gagal melakukan pencocokan wajah: ' + error.message);
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// Display match results
function displayMatchResults(data) {
    console.log('Display match results data:', data);
    
    const container = document.getElementById('matchResult');
    
    // Data sudah dalam format yang benar dari data.data
    const matchResults = data.matchResults || [];
    const facesDetected = data.facesDetected || 0;
    
    if (!Array.isArray(matchResults)) {
        console.error('matchResults is not an array:', matchResults);
        showMessage('matchResult', 'error', 'Format response tidak valid dari server');
        return;
    }
    
    let resultsHtml = `
        <div class="results">
            <h3>Hasil Pencocokan AI</h3>
            <p><strong>Wajah terdeteksi:</strong> ${facesDetected}</p>
            <p><strong>AI Detection:</strong> TensorFlow.js MediaPipe</p>
    `;
    
    matchResults.forEach((result, index) => {
        const matchClass = result.isMatch ? 'match-yes' : 'match-no';
        const matchText = result.isMatch ? 'COCOK' : 'TIDAK COCOK';
        const similarityPercent = (result.similarity * 100).toFixed(1);
        
        resultsHtml += `
            <div class="face-result">
                <h4>Wajah ${index + 1}</h4>
                <p><strong>Status:</strong> 
                    <span class="match-indicator ${matchClass}">${matchText}</span>
                </p>
                <p><strong>Tingkat Kemiripan:</strong> ${similarityPercent}%</p>
                <p><strong>Confidence:</strong> ${result.confidence}</p>
                ${result.details ? `
                    <p><strong>Detail AI:</strong></p>
                    <ul style="margin-left: 20px; font-size: 0.9em;">
                        <li>Box Similarity: ${(result.details.boxSimilarity * 100).toFixed(1)}%</li>
                        <li>Keypoint Similarity: ${(result.details.keypointSimilarity * 100).toFixed(1)}%</li>
                        <li>Threshold: ${(result.details.threshold * 100).toFixed(1)}%</li>
                    </ul>
                ` : ''}
                <p><strong>Posisi:</strong> 
                    x: ${Math.round(result.face.box.xMin)}, 
                    y: ${Math.round(result.face.box.yMin)}, 
                    lebar: ${Math.round(result.face.box.width)}, 
                    tinggi: ${Math.round(result.face.box.height)}
                </p>
            </div>
        `;
    });
    
    resultsHtml += '</div>';
    container.innerHTML = resultsHtml;
}

// Delete reference
async function deleteReference() {
    if (!confirm('Yakin ingin menghapus foto referensi?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reference', {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            referenceData = null; // Clear stored reference data
            showMessage('referenceResult', 'success', 'Foto referensi berhasil dihapus');
            checkReferenceStatus();
            document.getElementById('referencePreview').innerHTML = '';
            
            // Stop real-time matching if active
            if (isRealTimeMode) {
                stopRealTimeMatching();
            }
        } else {
            showMessage('referenceResult', 'error', 'Gagal menghapus foto referensi');
        }
    } catch (error) {
        showMessage('referenceResult', 'error', 'Gagal menghapus foto referensi');
        console.error('Error:', error);
    }
}

// Show message
function showMessage(containerId, type, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="status ${type}">${message}</div>`;
    
    // Auto hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

// Show/hide loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'block' : 'none';
}

// Switch between tabs
async function switchTab(section, tabType) {
    console.log('Switching tab:', section, tabType);
    
    // Update tab buttons - find all tab buttons in the current section
    const allTabButtons = document.querySelectorAll('.tab-btn');
    const sectionIndex = section === 'reference' ? 0 : 1;
    
    // Reference section has 2 buttons, match section has 3 buttons
    const referenceButtonCount = 2;
    const matchButtonCount = 3;
    
    let startIndex, buttonCount;
    if (section === 'reference') {
        startIndex = 0;
        buttonCount = referenceButtonCount;
    } else {
        startIndex = referenceButtonCount;
        buttonCount = matchButtonCount;
    }
    
    // Remove active class from all buttons in this section
    for (let i = startIndex; i < startIndex + buttonCount; i++) {
        if (allTabButtons[i]) allTabButtons[i].classList.remove('active');
    }
    
    // Add active class to the selected button
    let targetButtonIndex;
    if (section === 'reference') {
        targetButtonIndex = startIndex + (tabType === 'upload' ? 0 : 1);
    } else {
        if (tabType === 'upload') targetButtonIndex = startIndex + 0;
        else if (tabType === 'camera') targetButtonIndex = startIndex + 1;
        else if (tabType === 'realtime') targetButtonIndex = startIndex + 2;
    }
    
    if (allTabButtons[targetButtonIndex]) {
        allTabButtons[targetButtonIndex].classList.add('active');
    }
    
    // Update tab content
    if (section === 'reference') {
        const uploadTab = document.getElementById('reference-upload-tab');
        const cameraTab = document.getElementById('reference-camera-tab');
        
        if (uploadTab && cameraTab) {
            if (tabType === 'upload') {
                uploadTab.classList.add('active');
                cameraTab.classList.remove('active');
                stopCamera('reference');
            } else {
                uploadTab.classList.remove('active');
                cameraTab.classList.add('active');
            }
        }
    } else {
        const uploadTab = document.getElementById('match-upload-tab');
        const cameraTab = document.getElementById('match-camera-tab');
        const realtimeTab = document.getElementById('match-realtime-tab');
        
        if (uploadTab && cameraTab && realtimeTab) {
            // Hide all tabs first
            uploadTab.classList.remove('active');
            cameraTab.classList.remove('active');
            realtimeTab.classList.remove('active');
            
            // Show selected tab
            if (tabType === 'upload') {
                uploadTab.classList.add('active');
                stopCamera('match');
                stopRealTimeMatching();
            } else if (tabType === 'camera') {
                cameraTab.classList.add('active');
                stopRealTimeMatching();
            } else if (tabType === 'realtime') {
                realtimeTab.classList.add('active');
                stopCamera('match');
                await updateRealtimeStatus(); // Wait for status update
            }
        }
    }
}

// Start camera
async function startCamera(section) {
    try {
        const video = document.getElementById(`${section}Video`);
        const startBtn = document.querySelector(`#${section}CaptureBtn`).previousElementSibling;
        const captureBtn = document.getElementById(`${section}CaptureBtn`);
        const stopBtn = document.getElementById(`${section}StopBtn`);
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user' // Front camera
            } 
        });
        
        video.srcObject = stream;
        
        // Store stream reference
        if (section === 'reference') {
            referenceStream = stream;
        } else {
            matchStream = stream;
        }
        
        // Update button visibility
        startBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';
        
        showMessage(`${section}Result`, 'success', 'Kamera berhasil diaktifkan');
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showMessage(`${section}Result`, 'error', 'Gagal mengakses kamera. Pastikan browser memiliki izin kamera.');
    }
}

// Stop camera
function stopCamera(section) {
    const video = document.getElementById(`${section}Video`);
    const startBtn = document.querySelector(`#${section}CaptureBtn`).previousElementSibling;
    const captureBtn = document.getElementById(`${section}CaptureBtn`);
    const stopBtn = document.getElementById(`${section}StopBtn`);
    
    // Stop stream
    const stream = section === 'reference' ? referenceStream : matchStream;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        if (video) video.srcObject = null;
        
        if (section === 'reference') {
            referenceStream = null;
        } else {
            matchStream = null;
        }
    }
    
    // Update button visibility
    if (startBtn) startBtn.style.display = 'inline-block';
    if (captureBtn) captureBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
}

// Capture photo from camera
function capturePhoto(section) {
    const video = document.getElementById(`${section}Video`);
    const canvas = document.getElementById(`${section}Canvas`);
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
        if (blob) {
            // Create file-like object
            const file = new File([blob], `captured-${section}-${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            if (section === 'reference') {
                referenceFile = file;
                referenceCapturedBlob = blob;
            } else {
                matchFile = file;
                matchCapturedBlob = blob;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = function(e) {
                const container = document.getElementById(`${section}Preview`);
                container.innerHTML = `
                    <div style="text-align: center; margin: 15px 0;">
                        <img src="${e.target.result}" class="captured-photo" alt="Captured Photo">
                        <p style="margin-top: 10px; color: #666;">Foto berhasil diambil dari kamera</p>
                        ${section === 'reference' ? '<p style="color: #4facfe; font-weight: bold;">Auto-uploading ke database...</p>' : ''}
                    </div>
                `;
            };
            reader.readAsDataURL(blob);
            
            // Stop camera after capture
            stopCamera(section);
            
            showMessage(`${section}Result`, 'success', 'Foto berhasil diambil!');
            
            // Auto-upload reference photo
            if (section === 'reference') {
                setTimeout(() => {
                    uploadReference();
                }, 1000); // Delay 1 detik untuk user experience
            }
        }
    }, 'image/jpeg', 0.8);
}

// Update real-time status
async function updateRealtimeStatus() {
    const statusElement = document.getElementById('realtimeStatus');
    
    // Always check latest reference status
    try {
        console.log('Checking reference status...');
        const response = await fetch('/reference-status');
        const data = await response.json();
        console.log('Reference status response:', data);
        
        if (data.hasReference) {
            referenceData = data.referenceData; // Update global reference data
            console.log('Reference data loaded:', referenceData);
            statusElement.innerHTML = `
                <p style="color: #28a745;">Foto referensi tersedia - Siap untuk real-time matching</p>
                <p style="font-size: 0.9em; color: #666;">Wajah referensi: ${data.referenceData.faces.length}</p>
            `;
        } else {
            referenceData = null;
            console.log('No reference found');
            statusElement.innerHTML = `
                <p style="color: #dc3545;">Upload foto referensi terlebih dahulu</p>
            `;
        }
    } catch (error) {
        console.error('Error checking reference status:', error);
        statusElement.innerHTML = `
            <p style="color: #dc3545;">Error checking reference status: ${error.message}</p>
        `;
    }
}

// Start real-time matching
async function startRealTimeMatching() {
    try {
        // Ensure we have latest reference data
        if (!referenceData) {
            await updateRealtimeStatus();
        }
        
        if (!referenceData) {
            showMessage('realtimeResults', 'error', 'Upload foto referensi terlebih dahulu');
            return;
        }
        
        const video = document.getElementById('realtimeVideo');
        const startBtn = document.getElementById('startRealtimeBtn');
        const stopBtn = document.getElementById('stopRealtimeBtn');
        const overlay = document.getElementById('realtimeOverlay');
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            } 
        });
        
        video.srcObject = stream;
        matchStream = stream;
        isRealTimeMode = true;
        
        // Update button visibility
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        
        // Start real-time detection
        startRealtimeDetection();
        
        showMessage('realtimeResults', 'success', 'Real-time matching dimulai!');
        
    } catch (error) {
        console.error('Error starting real-time matching:', error);
        showMessage('realtimeResults', 'error', 'Gagal mengakses kamera untuk real-time matching');
    }
}

// Stop real-time matching
function stopRealTimeMatching() {
    const video = document.getElementById('realtimeVideo');
    const startBtn = document.getElementById('startRealtimeBtn');
    const stopBtn = document.getElementById('stopRealtimeBtn');
    const overlay = document.getElementById('realtimeOverlay');
    
    // Stop stream
    if (matchStream) {
        matchStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        matchStream = null;
    }
    
    // Stop detection interval
    if (realTimeInterval) {
        clearInterval(realTimeInterval);
        realTimeInterval = null;
    }
    
    isRealTimeMode = false;
    
    // Update button visibility
    if (startBtn) startBtn.style.display = 'inline-block';
    if (stopBtn) stopBtn.style.display = 'none';
    
    // Clear overlay
    if (overlay) overlay.innerHTML = '';
    
    // Clear results
    const resultsElement = document.getElementById('realtimeResults');
    if (resultsElement) {
        resultsElement.innerHTML = '<p>Real-time matching dihentikan</p>';
    }
}

// Start real-time detection loop
function startRealtimeDetection() {
    const video = document.getElementById('realtimeVideo');
    const canvas = document.getElementById('realtimeCanvas');
    const overlay = document.getElementById('realtimeOverlay');
    const resultsElement = document.getElementById('realtimeResults');
    
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let frameCount = 0;
    let matchCount = 0;
    let totalFaces = 0;
    
    // Process every 1 second (adjust for performance)
    realTimeInterval = setInterval(async () => {
        if (!isRealTimeMode || !video.videoWidth || !video.videoHeight) return;
        
        try {
            frameCount++;
            
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0);
            
            // Convert canvas to blob for processing
            canvas.toBlob(async (blob) => {
                if (!blob || !isRealTimeMode) return;
                
                try {
                    // Create form data
                    const formData = new FormData();
                    formData.append('frame', blob, 'realtime-frame.jpg');
                    
                    // Send to real-time endpoint (no file saving)
                    const response = await fetch('/api/realtime-match', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.success && data.data.matchResults) {
                        totalFaces += data.data.facesDetected;
                        
                        // Clear previous overlays
                        overlay.innerHTML = '';
                        
                        // Draw face boxes and labels
                        data.data.matchResults.forEach((result, index) => {
                            const face = result.face;
                            const isMatch = result.isMatch;
                            
                            if (isMatch) matchCount++;
                            
                            // Create face box overlay
                            const faceBox = document.createElement('div');
                            faceBox.className = `face-box ${isMatch ? 'match' : 'no-match'}`;
                            
                            // Calculate position relative to video element
                            const videoRect = video.getBoundingClientRect();
                            const scaleX = videoRect.width / video.videoWidth;
                            const scaleY = videoRect.height / video.videoHeight;
                            
                            faceBox.style.left = (face.box.xMin * scaleX) + 'px';
                            faceBox.style.top = (face.box.yMin * scaleY) + 'px';
                            faceBox.style.width = (face.box.width * scaleX) + 'px';
                            faceBox.style.height = (face.box.height * scaleY) + 'px';
                            
                            // Add label
                            const label = document.createElement('div');
                            label.className = 'face-label';
                            label.textContent = isMatch ? 
                                `MATCH ${(result.similarity * 100).toFixed(0)}%` : 
                                `NO MATCH ${(result.similarity * 100).toFixed(0)}%`;
                            
                            faceBox.appendChild(label);
                            overlay.appendChild(faceBox);
                        });
                        
                        // Update statistics
                        const matchRate = totalFaces > 0 ? ((matchCount / totalFaces) * 100).toFixed(1) : 0;
                        
                        resultsElement.innerHTML = `
                            <div class="realtime-stats">
                                <div class="stat-item">
                                    <div class="stat-value">${frameCount}</div>
                                    <div>Frames</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${data.data.facesDetected}</div>
                                    <div>Wajah Terdeteksi</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${data.data.matchResults.filter(r => r.isMatch).length}</div>
                                    <div>Match Saat Ini</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">${matchRate}%</div>
                                    <div>Match Rate</div>
                                </div>
                            </div>
                            <div style="margin-top: 15px;">
                                <p><strong>Status:</strong> Real-time matching aktif (no file saving)</p>
                                <p><strong>Last Update:</strong> ${new Date().toLocaleTimeString()}</p>
                            </div>
                        `;
                    }
                    
                } catch (error) {
                    console.error('Error in real-time detection:', error);
                }
            }, 'image/jpeg', 0.7);
            
        } catch (error) {
            console.error('Error capturing frame:', error);
        }
    }, 1000); // Process every 1 second
}

// Update checkReferenceStatus to store reference data
async function checkReferenceStatus() {
    try {
        const response = await fetch('/reference-status');
        const data = await response.json();
        
        const statusContainer = document.getElementById('referenceStatus');
        
        if (data.hasReference) {
            referenceData = data.referenceData; // Store for real-time use
            statusContainer.innerHTML = `
                <div class="reference-info">
                    <p><strong>Foto referensi sudah tersedia</strong></p>
                    <p>Wajah terdeteksi: ${data.referenceData.faces.length}</p>
                    <p>Upload: ${new Date(data.referenceData.uploadTime).toLocaleString('id-ID')}</p>
                    <button class="delete-btn" onclick="deleteReference()">Hapus Referensi</button>
                </div>
            `;
        } else {
            referenceData = null;
            statusContainer.innerHTML = `
                <div class="status info">
                    <p>Belum ada foto referensi. Upload foto referensi terlebih dahulu.</p>
                </div>
            `;
        }
        
        // Update real-time status if on real-time tab
        updateRealtimeStatus();
    } catch (error) {
        console.error('Error checking reference status:', error);
    }
}