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
import com.fleur.attendance.databinding.ActivityClockOutBinding
import com.fleur.attendance.utils.SessionManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ClockOutActivity : AppCompatActivity() {
    private lateinit var binding: ActivityClockOutBinding
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
        binding = ActivityClockOutBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        sessionManager = SessionManager(this)
        
        setupUI()
        setupClickListeners()
        loadAttendanceStatus()
        
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
        
        // Circle sebagai tombol clock out
        binding.btnClockOutCircle.setOnClickListener {
            performClockOut()
        }
    }
    
    private fun loadAttendanceStatus() {
        val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
        
        apiAdapter.getAttendanceStatus(
            onSuccess = { response ->
                if (response.success && response.data != null) {
                    updateWorkSummary(response.data)
                }
            },
            onError = { _ ->
                // Silently fail
            }
        )
    }
    
    private fun updateWorkSummary(status: com.fleur.attendance.data.model.AttendanceStatus) {
        binding.tvClockInTime.text = formatTimeFromISO(status.clockInTime)
        
        status.workDuration?.let { duration ->
            binding.tvWorkDuration.text = duration
            
            // Check for overtime (assuming 8 hours is standard)
            if (duration.contains("9h") || duration.contains("10h") || duration.contains("11h") || duration.contains("12h")) {
                binding.overtimeSection.visibility = View.VISIBLE
                // Calculate overtime (simplified)
                val hours = duration.substringBefore("h").toIntOrNull() ?: 0
                if (hours > 8) {
                    val overtime = hours - 8
                    binding.tvOvertime.text = "${overtime}h 0m"
                }
            }
        }
    }
    
    private fun formatTimeFromISO(isoTime: String?): String {
        if (isoTime == null) return "--:--"
        
        return try {
            // Parse ISO 8601 timestamp (e.g., "2026-01-14T12:33:10.00Z")
            val inputFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
            inputFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")
            
            val date = inputFormat.parse(isoTime.replace("Z", "").substring(0, 19))
            
            // Format ke HH:mm dalam timezone lokal
            val outputFormat = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
            outputFormat.timeZone = java.util.TimeZone.getDefault()
            
            outputFormat.format(date ?: return "--:--")
        } catch (e: Exception) {
            Log.e("ClockOut", "Error formatting time: $isoTime", e)
            // Fallback: coba ambil jam:menit langsung dari string
            try {
                val timePart = isoTime.split("T").getOrNull(1)?.substring(0, 5)
                timePart ?: "--:--"
            } catch (ex: Exception) {
                "--:--"
            }
        }
    }
    
    private fun startTimeUpdater() {
        timeRunnable = object : Runnable {
            override fun run() {
                updateCurrentTime()
                timeHandler.postDelayed(this, 1000)
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
                Log.e("ClockOut", "Use case binding failed", exc)
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
                        
                        // Only update if not already showing location status
                        binding.tvLocationStatus.text = statusText
                        binding.tvLocationStatus.setTextColor(
                            ContextCompat.getColor(
                                this,
                                if (isValid) R.color.success_green else R.color.warning_yellow
                            )
                        )
                        
                        // Update button state
                        binding.btnClockOutCircle.alpha = if (isValid) 1.0f else 0.7f
                    }
                }
            },
            onError = { error ->
                Log.e("ClockOut", "Location validation error: $error")
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
                    binding.tvLocationDetails.text = "Please enable GPS"
                }
            }?.addOnFailureListener {
                binding.tvLocationStatus.text = "Location error"
                binding.tvLocationDetails.text = "Please check GPS settings"
            }
        }
    }
    
    private fun updateLocationUI(location: Location) {
        binding.tvLocationDetails.text = "Lat: ${String.format("%.6f", location.latitude)}, Lng: ${String.format("%.6f", location.longitude)}"
    }
    
    private fun checkLocationRadius(location: Location) {
        val officeLocation = Location("office").apply {
            latitude = OFFICE_LATITUDE
            longitude = OFFICE_LONGITUDE
        }
        
        val distance = location.distanceTo(officeLocation)
        val isInRadius = distance <= OFFICE_RADIUS_METERS
        
        binding.tvLocationStatus.text = if (isInRadius) {
            "Already within punch area"
        } else {
            "Outside punch area (${distance.toInt()}m)"
        }
        
        binding.tvLocationStatus.setTextColor(
            ContextCompat.getColor(this, if (isInRadius) R.color.success_green else R.color.warning_yellow)
        )
        
        // Enable clock out circle
        binding.btnClockOutCircle.isEnabled = true
        binding.btnClockOutCircle.alpha = if (isInRadius) 1.0f else 0.7f
    }
    
    private fun performClockOut() {
        val location = currentLocation ?: run {
            showError(getString(R.string.location_not_available))
            return
        }
        
        // Take photo first
        takePhotoForClockOut { photoFile ->
            uploadClockOut(photoFile, location)
        }
    }
    
    private fun takePhotoForClockOut(onPhotoTaken: (File) -> Unit) {
        val imageCapture = imageCapture ?: return
        
        val name = SimpleDateFormat(FILENAME_FORMAT, Locale.US).format(System.currentTimeMillis())
        val photoFile = File(getExternalFilesDir(null), "$name.jpg")
        
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
        
        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exception: ImageCaptureException) {
                    Log.e("ClockOut", "Photo capture failed: ${exception.message}", exception)
                    showError("Gagal mengambil foto: ${exception.message}")
                }
                
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    Log.d("ClockOut", "Photo capture succeeded")
                    onPhotoTaken(photoFile)
                }
            }
        )
    }
    
    private fun uploadClockOut(photoFile: File, location: Location) {
        showLoading(true)
        
        val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
        
        apiAdapter.clockOut(location.latitude, location.longitude, photoFile,
            onSuccess = { response ->
                showLoading(false)
                
                if (response.success && response.data != null) {
                    showClockOutSuccess(response.data)
                } else {
                    showError(response.message)
                }
                
                // Clean up photo file
                photoFile.delete()
            },
            onError = { error ->
                showLoading(false)
                showError(error)
                
                // Clean up photo file
                photoFile.delete()
            }
        )
    }
    
    private fun showClockOutSuccess(result: com.fleur.attendance.data.model.ClockOutData) {
        val message = buildString {
            append(getString(R.string.clock_out_success))
            append("\n\n")
            append("Distance: ${result.location.distance.toInt()}m")
            append("\n")
            append("Work Duration: ${result.workDuration}")
            if (result.overtimeMinutes > 0) {
                append("\n")
                append("Overtime: ${result.overtimeMinutes} minutes")
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
    }
    
    private fun showLoading(show: Boolean) {
        binding.loadingOverlay.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnClockOutCircle.isEnabled = !show
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