package com.fleur.attendance.ui.attendance

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.fleur.attendance.R
import com.fleur.attendance.databinding.ActivityClockInBinding
import com.fleur.attendance.utils.SessionManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ClockInActivity : AppCompatActivity() {
    private lateinit var binding: ActivityClockInBinding
    private lateinit var sessionManager: SessionManager
    private lateinit var cameraExecutor: ExecutorService
    private var imageCapture: ImageCapture? = null
    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var currentLocation: Location? = null
    private val timeHandler = Handler(Looper.getMainLooper())
    private val locationHandler = Handler(Looper.getMainLooper())
    private lateinit var timeRunnable: Runnable
    private lateinit var locationRunnable: Runnable
    private var faceDetected = false
    private var faceStableCount = 0
    private var autoCapturePending = false
    private var isValidatingFrame = false
    private var lastValidationTime = 0L
    private val VALIDATION_INTERVAL_MS = 500L // Validasi setiap 500ms
    private val SIMILARITY_THRESHOLD = 0.70 // 70% untuk auto clock-in
    private var currentSimilarity = 0.0
    private var attendanceRepository: com.fleur.attendance.data.repository.AttendanceRepository? = null
    
    companion object {
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        private const val FILENAME_FORMAT = "yyyy-MM-dd-HH-mm-ss-SSS"
        private const val OFFICE_LATITUDE = -8.8155675
        private const val OFFICE_LONGITUDE = 115.1253343
        private const val OFFICE_RADIUS_METERS = 100.0
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityClockInBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        sessionManager = SessionManager(this)
        attendanceRepository = com.fleur.attendance.data.repository.AttendanceRepository(this)
        
        setupUI()
        setupClickListeners()
        
        // Request permissions
        if (allPermissionsGranted()) {
            startCamera()
            setupLocationServices()
        } else {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS)
        }
        
        cameraExecutor = Executors.newSingleThreadExecutor()
        startTimeUpdater()
    }
    
    private fun setupUI() {
        updateCurrentTime()
    }
    
    private fun setupClickListeners() {
        binding.ivBack.setOnClickListener {
            finish()
        }
        
        // Circle sebagai tombol clock in
        binding.btnClockInCircle.setOnClickListener {
            performClockIn()
        }
    }
    
    private fun startTimeUpdater() {
        timeRunnable = object : Runnable {
            override fun run() {
                updateCurrentTime()
                timeHandler.postDelayed(this, 1000) // Update every second
            }
        }
        timeHandler.post(timeRunnable)
    }
    
    private fun updateCurrentTime() {
        val currentTime = SimpleDateFormat("HH mm", Locale.getDefault()).format(Date())
        binding.tvCurrentTime.text = currentTime
    }
    
    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                startCamera()
                setupLocationServices()
            } else {
                Toast.makeText(this, "Permissions not granted by the user.", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }
    
    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
            
            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(binding.previewView.surfaceProvider)
                }
            
            imageCapture = ImageCapture.Builder().build()
            
            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA
            
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageCapture
                )
            } catch (exc: Exception) {
                Log.e("ClockIn", "Use case binding failed", exc)
            }
            
        }, ContextCompat.getMainExecutor(this))
    }
    
    private fun setupLocationServices() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        getCurrentLocation()
        startLocationPolling()
    }
    
    private fun startLocationPolling() {
        locationRunnable = object : Runnable {
            override fun run() {
                validateLocationWithAPI()
                locationHandler.postDelayed(this, 2000) // Poll every 2 seconds
            }
        }
        locationHandler.post(locationRunnable)
    }
    
    private fun validateLocationWithAPI() {
        val location = currentLocation ?: run {
            getCurrentLocation()
            return
        }
        
        val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
        
        apiAdapter.validateLocation(
            location.latitude,
            location.longitude,
            onSuccess = { response ->
                if (response.success && response.data != null) {
                    val data = response.data
                    val distance = data.distance.toInt()
                    val isValid = data.isValid
                    
                    runOnUiThread {
                        // Update location status
                        val statusText = if (isValid) {
                            "Onsite"
                        } else {
                            "Outside punch area (${distance}m)"
                        }
                        
                        // Only update if face is not detected (face detection has priority)
                        if (!faceDetected) {
                            binding.tvLocationStatus.text = statusText
                            binding.tvLocationStatus.setTextColor(
                                ContextCompat.getColor(
                                    this,
                                    if (isValid) R.color.success_green else R.color.warning_yellow
                                )
                            )
                        }
                        
                        // Update button state
                        binding.btnClockInCircle.alpha = if (isValid) 1.0f else 0.7f
                    }
                }
            },
            onError = { error ->
                Log.e("ClockIn", "Location validation error: $error")
            }
        )
    }
    
    private fun getCurrentLocation() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient?.lastLocation?.addOnSuccessListener { location ->
                if (location != null) {
                    currentLocation = location
                    updateLocationUI(location)
                    checkLocationRadius(location)
                } else {
                    binding.tvLocationStatus.text = "Unable to get location"
                }
            }?.addOnFailureListener {
                binding.tvLocationStatus.text = "Location error"
            }
        }
    }
    
    private fun updateLocationUI(location: Location) {
        // Location details tidak perlu ditampilkan di UI baru
    }
    
    private fun checkLocationRadius(location: Location) {
        val officeLocation = Location("office").apply {
            latitude = OFFICE_LATITUDE
            longitude = OFFICE_LONGITUDE
        }
        
        val distance = location.distanceTo(officeLocation)
        val isInRadius = distance <= OFFICE_RADIUS_METERS
        
        binding.tvLocationStatus.text = if (isInRadius) {
            "Ready to punch in"
        } else {
            "Outside punch area (${distance.toInt()}m)"
        }
        
        binding.tvLocationStatus.setTextColor(
            ContextCompat.getColor(this, if (isInRadius) R.color.success_green else R.color.warning_yellow)
        )
        
        // Enable clock in circle only if location is available
        binding.btnClockInCircle.isEnabled = true
        binding.btnClockInCircle.alpha = if (isInRadius) 1.0f else 0.7f
    }
    
    private fun validateFrameWithServer() {
        if (isValidatingFrame) return
        
        isValidatingFrame = true
        
        // Capture frame untuk validasi
        val imageCapture = imageCapture ?: run {
            isValidatingFrame = false
            return
        }
        
        val name = SimpleDateFormat(FILENAME_FORMAT, Locale.US).format(System.currentTimeMillis())
        val photoFile = File(getExternalFilesDir(null), "temp_$name.jpg")
        
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
        
        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exception: ImageCaptureException) {
                    isValidatingFrame = false
                    Log.e("ClockIn", "Frame capture failed: ${exception.message}")
                }
                
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    // Kirim ke server untuk validasi
                    attendanceRepository?.validateFaceRealtime(
                        photoFile,
                        onSuccess = { response ->
                            isValidatingFrame = false
                            
                            // Delete temp file
                            try {
                                if (photoFile.exists()) photoFile.delete()
                            } catch (e: Exception) {
                                Log.e("ClockIn", "Error deleting temp file", e)
                            }
                            
                            if (response.success && response.data != null) {
                                val data = response.data
                                currentSimilarity = data.similarity
                                
                                runOnUiThread {
                                    updateFaceMatchUI()
                                    
                                    // Auto clock-in jika similarity > threshold
                                    if (data.isMatch && currentSimilarity >= SIMILARITY_THRESHOLD && !autoCapturePending) {
                                        autoCapturePending = true
                                        binding.tvLocationStatus.text = "Match! Clocking in..."
                                        binding.tvLocationStatus.setTextColor(
                                            ContextCompat.getColor(this@ClockInActivity, R.color.success_green)
                                        )
                                        
                                        Handler(Looper.getMainLooper()).postDelayed({
                                            performClockIn()
                                        }, 500)
                                    }
                                }
                            }
                        },
                        onError = { error ->
                            isValidatingFrame = false
                            Log.e("ClockIn", "Face validation error: $error")
                            
                            // Delete temp file
                            try {
                                if (photoFile.exists()) photoFile.delete()
                            } catch (e: Exception) {
                                Log.e("ClockIn", "Error deleting temp file", e)
                            }
                        }
                    )
                }
            }
        )
    }
    
    private fun updateFaceMatchUI() {
        if (!faceDetected) {
            binding.tvLocationStatus.text = "Position your face in frame"
            binding.tvLocationStatus.setTextColor(
                ContextCompat.getColor(this, R.color.warning_yellow)
            )
            return
        }
        
        val similarityPercent = (currentSimilarity * 100).toInt()
        val thresholdPercent = (SIMILARITY_THRESHOLD * 100).toInt()
        
        val statusText = if (currentSimilarity >= SIMILARITY_THRESHOLD) {
            "Match! $similarityPercent%"
        } else if (currentSimilarity > 0) {
            "Matching... $similarityPercent% (need $thresholdPercent%)"
        } else {
            "Detecting face..."
        }
        
        val color = when {
            currentSimilarity >= SIMILARITY_THRESHOLD -> R.color.success_green
            currentSimilarity > 0.7 -> R.color.warning_yellow
            else -> R.color.warning_yellow
        }
        
        binding.tvLocationStatus.text = statusText
        binding.tvLocationStatus.setTextColor(ContextCompat.getColor(this, color))
    }
    
    private fun performClockIn() {
        // Prevent multiple captures
        if (autoCapturePending && binding.loadingOverlay.visibility == View.VISIBLE) {
            return
        }
        
        val location = currentLocation ?: run {
            showError(getString(R.string.location_not_available))
            autoCapturePending = false
            return
        }
        
        // Take photo first
        takePhotoForClockIn { photoFile ->
            uploadClockIn(photoFile, location)
        }
    }
    
    private fun takePhotoForClockIn(onPhotoTaken: (File) -> Unit) {
        val imageCapture = imageCapture ?: return
        
        val name = SimpleDateFormat(FILENAME_FORMAT, Locale.US).format(System.currentTimeMillis())
        val photoFile = File(getExternalFilesDir(null), "$name.jpg")
        
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
        
        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exception: ImageCaptureException) {
                    Log.e("ClockIn", "Photo capture failed: ${exception.message}", exception)
                    showError("Gagal mengambil foto: ${exception.message}")
                }
                
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    Log.d("ClockIn", "Photo capture succeeded")
                    onPhotoTaken(photoFile)
                }
            }
        )
    }
    
    private fun uploadClockIn(photoFile: File, location: Location) {
        showLoading(true)
        
        try {
            Log.d("ClockIn", "Starting clock in upload")
            Log.d("ClockIn", "Photo file: ${photoFile.absolutePath}, exists: ${photoFile.exists()}, size: ${photoFile.length()}")
            Log.d("ClockIn", "Location: lat=${location.latitude}, lng=${location.longitude}")
            
            val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
            
            apiAdapter.clockIn(location.latitude, location.longitude, photoFile,
                onSuccess = { response ->
                    showLoading(false)
                    Log.d("ClockIn", "Clock in success: ${response.message}")
                    
                    if (response.success && response.data != null) {
                        showClockInSuccess(response.data)
                    } else {
                        showError(response.message)
                    }
                    
                    // Clean up photo file
                    try {
                        if (photoFile.exists()) {
                            photoFile.delete()
                        }
                    } catch (e: Exception) {
                        Log.e("ClockIn", "Error deleting photo file", e)
                    }
                },
                onError = { error ->
                    showLoading(false)
                    Log.e("ClockIn", "Clock in error: $error")
                    showError(error)
                    
                    // Clean up photo file
                    try {
                        if (photoFile.exists()) {
                            photoFile.delete()
                        }
                    } catch (e: Exception) {
                        Log.e("ClockIn", "Error deleting photo file", e)
                    }
                }
            )
        } catch (e: Exception) {
            showLoading(false)
            Log.e("ClockIn", "Exception in uploadClockIn", e)
            showError("Error: ${e.message}")
            
            // Clean up photo file
            try {
                if (photoFile.exists()) {
                    photoFile.delete()
                }
            } catch (ex: Exception) {
                Log.e("ClockIn", "Error deleting photo file", ex)
            }
        }
    }
    
    private fun showClockInSuccess(result: com.fleur.attendance.data.model.ClockInData) {
        try {
            val message = buildString {
                append(getString(R.string.clock_in_success))
                append("\n\n")
                append("Status: ${result.status}")
                append("\n")
                append("Distance: ${result.location.distance.toInt()}m")
                append("\n")
                append("Face Match: ${if (result.faceMatch.isMatch) "Ya" else "Tidak"}")
                if (result.faceMatch.isMatch) {
                    append(" (${(result.faceMatch.similarity * 100).toInt()}%)")
                }
            }
            
            AlertDialog.Builder(this)
                .setTitle(getString(R.string.success))
                .setMessage(message)
                .setPositiveButton(getString(R.string.ok)) { _, _ ->
                    finish()
                }
                .setCancelable(false)
                .show()
        } catch (e: Exception) {
            Log.e("ClockIn", "Error showing success dialog", e)
            Toast.makeText(this, "Clock in successful!", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
    
    private fun showLoading(show: Boolean) {
        binding.loadingOverlay.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnClockInCircle.isEnabled = !show
        
        // Reset auto-capture flag saat loading selesai
        if (!show) {
            autoCapturePending = false
        }
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        timeHandler.removeCallbacks(timeRunnable)
        locationHandler.removeCallbacks(locationRunnable)
        cameraExecutor.shutdown()
    }
}