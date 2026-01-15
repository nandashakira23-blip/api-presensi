package com.fleur.attendance.ui.profile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.bumptech.glide.Glide
import com.fleur.attendance.R
import com.fleur.attendance.data.api.LegacyApiAdapter
import com.fleur.attendance.databinding.ActivityProfileEditBinding
import com.fleur.attendance.utils.SessionManager
import com.yalantis.ucrop.UCrop
import java.io.File

class ProfileEditActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProfileEditBinding
    private lateinit var sessionManager: SessionManager
    private lateinit var apiAdapter: LegacyApiAdapter
    private var selectedImageUri: Uri? = null
    private var croppedImageFile: File? = null
    private var currentProfilePictureUrl: String? = null

    private val pickImageLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                startCrop(uri)
            }
        }
    }

    companion object {
        private const val REQUEST_STORAGE_PERMISSION = 100
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        try {
            binding = ActivityProfileEditBinding.inflate(layoutInflater)
            setContentView(binding.root)

            sessionManager = SessionManager(this)
            apiAdapter = LegacyApiAdapter(this)

            setupToolbar()
            setupClickListeners()
            loadProfile()
        } catch (e: Exception) {
            Log.e("ProfileEdit", "Error in onCreate", e)
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
    }

    private fun setupClickListeners() {
        binding.btnChangePhoto.setOnClickListener {
            checkPermissionAndPickImage()
        }

        binding.btnSave.setOnClickListener {
            saveProfile()
        }
    }

    private fun checkPermissionAndPickImage() {
        // For Android 13+ (API 33+), use READ_MEDIA_IMAGES
        val permission = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.READ_MEDIA_IMAGES
        } else {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }
        
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(permission),
                REQUEST_STORAGE_PERMISSION
            )
        } else {
            openImagePicker()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_STORAGE_PERMISSION) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                openImagePicker()
            } else {
                Toast.makeText(this, "Permission denied", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun openImagePicker() {
        val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        pickImageLauncher.launch(intent)
    }
    
    private fun startCrop(sourceUri: Uri) {
        val destinationUri = Uri.fromFile(File(cacheDir, "cropped_profile_${System.currentTimeMillis()}.jpg"))
        
        val options = UCrop.Options().apply {
            setCompressionQuality(80)
            setCircleDimmedLayer(true)
            setShowCropGrid(false)
            setShowCropFrame(false)
            setToolbarColor(ContextCompat.getColor(this@ProfileEditActivity, R.color.dark_surface))
            setStatusBarColor(ContextCompat.getColor(this@ProfileEditActivity, R.color.dark_surface))
            setToolbarWidgetColor(ContextCompat.getColor(this@ProfileEditActivity, R.color.text_primary))
        }
        
        UCrop.of(sourceUri, destinationUri)
            .withAspectRatio(1f, 1f)
            .withMaxResultSize(512, 512)
            .withOptions(options)
            .start(this)
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (resultCode == RESULT_OK && requestCode == UCrop.REQUEST_CROP) {
            data?.let {
                val resultUri = UCrop.getOutput(it)
                resultUri?.let { uri ->
                    selectedImageUri = uri
                    croppedImageFile = File(uri.path!!)
                    
                    // Use Glide to load the cropped image with circular crop
                    Log.d("ProfileEdit", "Loading cropped image from: ${uri.path}")
                    Glide.with(this)
                        .load(uri)
                        .placeholder(R.drawable.ic_person)
                        .error(R.drawable.ic_person)
                        .circleCrop()
                        .into(binding.ivProfilePicture)
                    
                    Toast.makeText(this, "Foto berhasil dipilih", Toast.LENGTH_SHORT).show()
                }
            }
        } else if (resultCode == UCrop.RESULT_ERROR) {
            data?.let {
                val cropError = UCrop.getError(it)
                Log.e("ProfileEdit", "Crop error: ${cropError?.message}")
                Toast.makeText(this, "Crop error: ${cropError?.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadProfile() {
        showLoading(true)

        val employeeId = sessionManager.getEmployeeId()
        if (employeeId == -1) {
            showError("Session expired")
            finish()
            return
        }

        apiAdapter.getEmployeeProfile(
            employeeId = employeeId,
            onSuccess = { profile ->
                showLoading(false)
                val employee = profile.employee

                binding.tvNik.text = employee.nik
                binding.tvNama.text = employee.nama
                binding.etEmail.setText(employee.email ?: "")
                
                // Format phone for display in edit field (remove +62 prefix since layout has it)
                val phoneForEdit = if (!employee.phone.isNullOrEmpty()) {
                    var phone = employee.phone
                    if (phone.startsWith("+62")) {
                        phone.substring(3).trim()
                    } else if (phone.startsWith("62")) {
                        phone.substring(2).trim()
                    } else if (phone.startsWith("0")) {
                        phone.substring(1).trim()
                    } else {
                        phone
                    }
                } else {
                    ""
                }
                binding.etPhone.setText(phoneForEdit)

                currentProfilePictureUrl = employee.profilePicture
                Log.d("ProfileEdit", "Profile picture URL from server: ${employee.profilePicture}")
                
                if (!employee.profilePicture.isNullOrEmpty()) {
                    val baseUrl = apiAdapter.getBaseUrl().removeSuffix("/api/")
                    val imageUrl = "$baseUrl/${employee.profilePicture}"
                    Log.d("ProfileEdit", "Loading image from: $imageUrl")
                    
                    Glide.with(this)
                        .load(imageUrl)
                        .placeholder(R.drawable.ic_person)
                        .error(R.drawable.ic_person)
                        .circleCrop()
                        .into(binding.ivProfilePicture)
                } else {
                    Log.d("ProfileEdit", "No profile picture available")
                }
            },
            onError = { error ->
                showLoading(false)
                showError("Gagal memuat profile: $error")
            }
        )
    }

    private fun saveProfile() {
        val email = binding.etEmail.text.toString().trim()
        var phone = binding.etPhone.text.toString().trim()

        // Validate email
        if (email.isNotEmpty() && !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.etEmail.error = "Email tidak valid"
            return
        }

        // Format and validate phone
        if (phone.isNotEmpty()) {
            // Remove any spaces, dashes, or parentheses
            phone = phone.replace(Regex("[\\s\\-()]"), "")
            
            // Remove +62 or 62 prefix if present (will be added by display)
            if (phone.startsWith("+62")) {
                phone = phone.substring(3)
            } else if (phone.startsWith("62")) {
                phone = phone.substring(2)
            } else if (phone.startsWith("0")) {
                phone = phone.substring(1)
            }
            
            // Validate length (Indonesian mobile numbers are typically 9-12 digits after country code)
            if (phone.length < 8 || phone.length > 13) {
                binding.etPhone.error = "Nomor telepon tidak valid"
                return
            }
        }

        showLoading(true)

        val employeeId = sessionManager.getEmployeeId()
        if (employeeId == -1) {
            showError("Session expired")
            finish()
            return
        }

        // Convert URI to File if image selected
        val imageFile = croppedImageFile ?: selectedImageUri?.let { uri ->
            try {
                val inputStream = contentResolver.openInputStream(uri)
                val tempFile = File.createTempFile("profile_", ".jpg", cacheDir)
                tempFile.outputStream().use { outputStream ->
                    inputStream?.copyTo(outputStream)
                }
                tempFile
            } catch (e: Exception) {
                Log.e("ProfileEdit", "Error converting URI to file", e)
                null
            }
        }

        apiAdapter.updateEmployeeProfile(
            employeeId = employeeId,
            email = email.ifEmpty { null },
            phone = phone.ifEmpty { null },
            profilePicture = imageFile,
            onSuccess = { response ->
                showLoading(false)
                Toast.makeText(this, "Profile berhasil diupdate", Toast.LENGTH_SHORT).show()
                
                // Update session if needed
                sessionManager.saveUserSession(response.employee)
                
                setResult(RESULT_OK)
                finish()
            },
            onError = { error ->
                showLoading(false)
                Log.e("ProfileEdit", "Update error: $error")
                showError("Gagal update profile: $error")
            }
        )
    }

    private fun showLoading(show: Boolean) {
        binding.loadingOverlay.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnSave.isEnabled = !show
        binding.btnChangePhoto.isEnabled = !show
    }

    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}
