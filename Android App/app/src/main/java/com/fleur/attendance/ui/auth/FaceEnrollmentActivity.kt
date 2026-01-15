package com.fleur.attendance.ui.auth

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
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
import com.fleur.attendance.data.api.ApiConfig
import com.fleur.attendance.data.api.ApiService
import com.fleur.attendance.data.model.FaceEnrollmentResponse
import com.fleur.attendance.databinding.ActivityFaceEnrollmentBinding
import com.fleur.attendance.ui.main.MainActivity
import com.fleur.attendance.utils.SessionManager
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class FaceEnrollmentActivity : AppCompatActivity() {
    private lateinit var binding: ActivityFaceEnrollmentBinding
    private lateinit var apiService: ApiService
    private lateinit var sessionManager: SessionManager
    private lateinit var cameraExecutor: ExecutorService
    private var imageCapture: ImageCapture? = null
    private lateinit var nik: String
    private lateinit var employeeName: String
    private var isReactivation: Boolean = false
    
    companion object {
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
        private const val FILENAME_FORMAT = "yyyy-MM-dd-HH-mm-ss-SSS"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFaceEnrollmentBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        apiService = ApiConfig.getApiService()
        sessionManager = SessionManager(this)
        nik = intent.getStringExtra("nik") ?: ""
        employeeName = intent.getStringExtra("employeeName") ?: "Karyawan"
        isReactivation = intent.getBooleanExtra("isReactivation", false)
        
        setupUI()
        
        // Request camera permissions
        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS)
        }
        
        binding.btnCapture.setOnClickListener { takePhoto() }
        cameraExecutor = Executors.newSingleThreadExecutor()
    }
    
    private fun setupUI() {
        binding.tvEmployeeName.text = employeeName
        
        // Update UI text based on enrollment type
        if (isReactivation) {
            binding.tvFaceEnrollmentTitle.text = getString(R.string.face_reenrollment_title)
            binding.tvFaceEnrollmentInstruction.text = getString(R.string.face_reenrollment_instruction)
        } else {
            binding.tvFaceEnrollmentTitle.text = getString(R.string.face_enrollment_title)
            binding.tvFaceEnrollmentInstruction.text = getString(R.string.face_enrollment_instruction)
        }
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
            
            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()
            
            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA
            
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageCapture
                )
                
            } catch (exc: Exception) {
                Log.e("FaceEnrollment", "Use case binding failed", exc)
            }
            
        }, ContextCompat.getMainExecutor(this))
    }
    
    private fun takePhoto() {
        val imageCapture = imageCapture ?: return
        
        try {
            val name = SimpleDateFormat(FILENAME_FORMAT, Locale.US).format(System.currentTimeMillis())
            // Use internal storage to avoid permission issues
            val photoFile = File(filesDir, "$name.jpg")
            
            val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
            
            // Disable button while capturing to prevent multiple clicks
            binding.btnCapture.isEnabled = false
            
            imageCapture.takePicture(
                outputOptions,
                ContextCompat.getMainExecutor(this),
                object : ImageCapture.OnImageSavedCallback {
                    override fun onError(exception: ImageCaptureException) {
                        Log.e("FaceEnrollment", "Photo capture failed: ${exception.message}", exception)
                        runOnUiThread {
                            binding.btnCapture.isEnabled = true
                            showError("Gagal mengambil foto: ${exception.message}")
                        }
                    }
                    
                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                        Log.d("FaceEnrollment", "Photo saved successfully: ${photoFile.absolutePath}")
                        runOnUiThread {
                            uploadFacePhoto(photoFile)
                        }
                    }
                }
            )
        } catch (e: Exception) {
            Log.e("FaceEnrollment", "Error in takePhoto: ${e.message}", e)
            binding.btnCapture.isEnabled = true
            showError("Error saat mengambil foto: ${e.message}")
        }
    }
    
    private fun uploadFacePhoto(photoFile: File) {
        // Check if PIN is provided from intent
        val pinFromIntent = intent.getStringExtra("pin") ?: ""
        
        if (pinFromIntent.isNotEmpty()) {
            // PIN already provided, proceed with upload
            performUpload(photoFile, pinFromIntent)
        } else {
            // Ask for PIN first
            showPinInputDialog(photoFile)
        }
    }
    
    private fun showPinInputDialog(photoFile: File) {
        val builder = AlertDialog.Builder(this)
        val inflater = layoutInflater
        val dialogView = inflater.inflate(R.layout.dialog_pin_input, null)
        
        val etPin = dialogView.findViewById<android.widget.EditText>(R.id.etPin)
        val etConfirmPin = dialogView.findViewById<android.widget.EditText>(R.id.etConfirmPin)
        
        builder.setView(dialogView)
            .setTitle("Buat PIN")
            .setMessage("Buat PIN 4 digit untuk aktivasi akun")
            .setPositiveButton("OK") { dialog, _ ->
                val pin = etPin.text.toString().trim()
                val confirmPin = etConfirmPin.text.toString().trim()
                
                if (pin.isEmpty() || confirmPin.isEmpty()) {
                    showError("PIN harus diisi")
                    binding.btnCapture.isEnabled = true
                    photoFile.delete()
                } else if (pin.length != 4) {
                    showError("PIN harus 4 digit")
                    binding.btnCapture.isEnabled = true
                    photoFile.delete()
                } else if (pin != confirmPin) {
                    showError("PIN tidak cocok")
                    binding.btnCapture.isEnabled = true
                    photoFile.delete()
                } else {
                    performUpload(photoFile, pin)
                }
                dialog.dismiss()
            }
            .setNegativeButton("Batal") { dialog, _ ->
                binding.btnCapture.isEnabled = true
                photoFile.delete()
                dialog.dismiss()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun performUpload(photoFile: File, pin: String) {
        showLoading(true)
        
        try {
            // Check if file exists and is readable
            if (!photoFile.exists() || !photoFile.canRead()) {
                showLoading(false)
                binding.btnCapture.isEnabled = true
                showError("File foto tidak dapat dibaca. Silakan coba lagi.")
                return
            }
            
            val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
            
            Log.d("FaceEnrollment", "Uploading file: ${photoFile.name}, size: ${photoFile.length()} bytes")
            
            // Activation with PIN and face photo
            apiAdapter.activate(nik, pin, photoFile,
                onSuccess = { response ->
                    showLoading(false)
                    binding.btnCapture.isEnabled = true
                    
                    if (response.success) {
                        val successMessage = "Aktivasi berhasil! Silakan login dengan NIK dan PIN Anda."
                        showSuccessDialog(successMessage) {
                            val intent = Intent(this@FaceEnrollmentActivity, LoginActivity::class.java)
                            startActivity(intent)
                            finish()
                        }
                    } else {
                        showError(response.message)
                    }
                    
                    // Clean up file
                    try { photoFile.delete() } catch (e: Exception) {}
                },
                onError = { error ->
                    showLoading(false)
                    binding.btnCapture.isEnabled = true
                    showError(error)
                    
                    // Clean up file
                    try { photoFile.delete() } catch (e: Exception) {}
                }
            )
        } catch (e: Exception) {
            Log.e("FaceEnrollment", "Error in performUpload: ${e.message}", e)
            showLoading(false)
            binding.btnCapture.isEnabled = true
            showError("Error saat upload foto: ${e.message}")
        }
    }
    
    private fun showLoading(show: Boolean) {
        binding.loadingOverlay.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnCapture.isEnabled = !show
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    private fun showSuccessDialog(message: String, onOk: () -> Unit) {
        AlertDialog.Builder(this)
            .setTitle("Berhasil")
            .setMessage(message)
            .setPositiveButton("OK") { _, _ -> onOk() }
            .setCancelable(false)
            .show()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}