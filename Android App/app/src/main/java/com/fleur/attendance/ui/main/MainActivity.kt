package com.fleur.attendance.ui.main

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import com.fleur.attendance.R
import com.fleur.attendance.data.api.ApiConfig
import com.fleur.attendance.data.api.ApiService
import com.fleur.attendance.data.model.AttendanceStatus
import com.fleur.attendance.data.model.AttendanceStatusResponse
import com.fleur.attendance.data.model.EmployeeProfileResponse
import com.fleur.attendance.data.model.WorkScheduleResponse
import com.fleur.attendance.databinding.ActivityMainBinding
import com.fleur.attendance.ui.attendance.AttendanceHistoryActivity
import com.fleur.attendance.ui.attendance.ClockInActivity
import com.fleur.attendance.ui.attendance.ClockOutActivity
import com.fleur.attendance.ui.profile.ProfileActivity
import com.fleur.attendance.ui.settings.SettingsActivity
import com.fleur.attendance.utils.SessionManager
import com.google.android.gms.location.FusedLocationProviderClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var apiService: ApiService
    private lateinit var sessionManager: SessionManager
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var currentLocation: android.location.Location? = null
    private val locationHandler = Handler(Looper.getMainLooper())
    private lateinit var locationRunnable: Runnable
    private val attendanceHandler = Handler(Looper.getMainLooper())
    private lateinit var attendanceRunnable: Runnable
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        try {
            binding = ActivityMainBinding.inflate(layoutInflater)
            setContentView(binding.root)
            
            apiService = ApiConfig.getApiService()
            sessionManager = SessionManager(this)
            fusedLocationClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(this)
            
            Log.d("MainActivity", "Initializing MainActivity")
            Log.d("MainActivity", "Employee ID: ${sessionManager.getEmployeeId()}")
            Log.d("MainActivity", "Employee NIK: ${sessionManager.getEmployeeNik()}")
            Log.d("MainActivity", "Employee Name: ${sessionManager.getEmployeeName()}")
            
            setupUI()
            setupClickListeners()
            loadDashboardData()
            setupBottomNavigation()
            setupLocationTracking()
            startLocationPolling()
            startAttendancePolling()
            
            Log.d("MainActivity", "MainActivity initialized successfully")
        } catch (e: Exception) {
            Log.e("MainActivity", "Error in onCreate", e)
            Toast.makeText(this, "Error initializing: ${e.message}", Toast.LENGTH_LONG).show()
            
            // Try to show basic UI even if there's an error
            try {
                binding.tvUserName.text = sessionManager.getEmployeeName() ?: "Karyawan"
                binding.tvWelcome.text = "Selamat datang,"
            } catch (ex: Exception) {
                Log.e("MainActivity", "Error setting basic UI", ex)
            }
        }
    }
    
    private fun setupUI() {
        // Set user name from session
        val userName = sessionManager.getEmployeeName() ?: "Karyawan"
        Log.d("MainActivity", "Setting user name: $userName")
        binding.tvUserName.text = userName
        
        // Also set welcome message
        binding.tvWelcome.text = "Selamat datang,"
    }
    
    private fun setupClickListeners() {
        binding.btnClockIn.setOnClickListener {
            // Always check status first before proceeding
            val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
            apiAdapter.getAttendanceStatus(
                onSuccess = { response ->
                    if (response.success && response.data != null) {
                        val status = response.data
                        if (status.canClockIn) {
                            // Can clock in - proceed to activity
                            startActivity(Intent(this, ClockInActivity::class.java))
                        } else {
                            // Cannot clock in - show alert
                            androidx.appcompat.app.AlertDialog.Builder(this)
                                .setTitle("Sudah Absen Masuk")
                                .setMessage("Anda sudah melakukan absen masuk hari ini.")
                                .setPositiveButton("OK") { dialog, _ ->
                                    dialog.dismiss()
                                }
                                .show()
                        }
                    }
                },
                onError = { _ ->
                    // On error, still allow to try
                    startActivity(Intent(this, ClockInActivity::class.java))
                }
            )
        }
        
        binding.btnClockOut.setOnClickListener {
            // Always check status first before proceeding
            val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
            apiAdapter.getAttendanceStatus(
                onSuccess = { response ->
                    if (response.success && response.data != null) {
                        val status = response.data
                        if (status.canClockOut) {
                            // Can clock out - proceed to activity
                            startActivity(Intent(this, ClockOutActivity::class.java))
                        } else {
                            // Cannot clock out - show appropriate alert
                            val message = when {
                                !status.hasClockedIn -> "Anda belum melakukan absen masuk."
                                status.hasClockedOut -> "Selamat istirahat! Anda sudah absen pulang hari ini."
                                else -> "Anda belum bisa melakukan absen pulang saat ini."
                            }
                            androidx.appcompat.app.AlertDialog.Builder(this)
                                .setTitle("Informasi Absen")
                                .setMessage(message)
                                .setPositiveButton("OK") { dialog, _ ->
                                    dialog.dismiss()
                                }
                                .show()
                        }
                    }
                },
                onError = { _ ->
                    // On error, still allow to try
                    startActivity(Intent(this, ClockOutActivity::class.java))
                }
            )
        }
        
        binding.ivSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }
    
    private fun setupBottomNavigation() {
        binding.bottomNavigation.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    // Already on home, do nothing
                    true
                }
                R.id.nav_attendance -> {
                    startActivity(Intent(this, AttendanceHistoryActivity::class.java))
                    true
                }
                R.id.nav_profile -> {
                    startActivity(Intent(this, ProfileActivity::class.java))
                    true
                }
                else -> false
            }
        }
        
        // Set home as selected
        binding.bottomNavigation.selectedItemId = R.id.nav_home
    }
    
    private fun loadDashboardData() {
        try {
            val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
            
            // Load employee profile (includes work schedule)
            loadEmployeeProfile(apiAdapter)
            
            // Load attendance status
            loadAttendanceStatus(apiAdapter)
        } catch (e: Exception) {
            Log.e("MainActivity", "Error loading dashboard data", e)
            Toast.makeText(this, "Error loading data: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun loadEmployeeProfile(apiAdapter: com.fleur.attendance.data.api.LegacyApiAdapter) {
        try {
            val employeeId = sessionManager.getEmployeeId() ?: return
            
            apiAdapter.getEmployeeProfile(
                employeeId = employeeId,
                onSuccess = { profile ->
                    try {
                        val employee = profile.employee
                        binding.tvUserName.text = employee.nama
                        
                        // Load profile picture
                        if (!employee.profilePicture.isNullOrEmpty()) {
                            val baseUrl = apiAdapter.getBaseUrl().removeSuffix("/api/")
                            val imageUrl = "$baseUrl/${employee.profilePicture}"
                            Log.d("MainActivity", "Loading profile picture from: $imageUrl")
                            
                            Glide.with(this)
                                .load(imageUrl)
                                .placeholder(R.drawable.ic_person)
                                .error(R.drawable.ic_person)
                                .circleCrop()
                                .into(binding.ivProfilePhoto)
                        } else {
                            // Show default icon if no profile picture
                            binding.ivProfilePhoto.setImageResource(R.drawable.ic_person)
                        }
                        
                        // Update session with latest data
                        sessionManager.saveUserSession(employee)
                        
                        // Update work schedule UI if available
                        profile.workSchedule?.let { schedule ->
                            binding.tvStartTime.text = schedule.startTime
                            binding.tvEndTime.text = schedule.endTime
                            
                            // Show work day status based on current day
                            val currentDay = java.text.SimpleDateFormat("EEEE", java.util.Locale.ENGLISH).format(java.util.Date())
                            val isWorkDay = schedule.workDays.contains(currentDay)
                            
                            if (isWorkDay) {
                                binding.tvWorkDayStatus.text = "Hari Kerja"
                                binding.tvWorkDayStatus.setTextColor(getColor(R.color.success_green))
                            } else {
                                binding.tvWorkDayStatus.text = "Hari Libur"
                                binding.tvWorkDayStatus.setTextColor(getColor(R.color.text_secondary))
                            }
                        }
                        
                        Log.d("MainActivity", "Profile loaded successfully")
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error processing profile response", e)
                    }
                },
                onError = { error ->
                    Log.e("MainActivity", "Profile loading error: $error")
                }
            )
        } catch (e: Exception) {
            Log.e("MainActivity", "Error in loadEmployeeProfile", e)
        }
    }
    
    private fun loadAttendanceStatus(apiAdapter: com.fleur.attendance.data.api.LegacyApiAdapter) {
        try {
            apiAdapter.getAttendanceStatus(
                onSuccess = { response ->
                    try {
                        if (response.success && response.data != null) {
                            updateAttendanceStatusUI(response.data)
                            Log.d("MainActivity", "Attendance status loaded successfully")
                        }
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error processing attendance status", e)
                    }
                },
                onError = { error ->
                    Log.e("MainActivity", "Attendance status error: $error")
                }
            )
        } catch (e: Exception) {
            Log.e("MainActivity", "Error in loadAttendanceStatus", e)
        }
    }
    
    private fun updateAttendanceStatusUI(status: com.fleur.attendance.data.model.AttendanceStatus) {
        try {
            // Format waktu dari ISO timestamp ke HH:mm
            binding.tvClockInTime.text = formatTimeFromISO(status.clockInTime)
            binding.tvClockOutTime.text = formatTimeFromISO(status.clockOutTime)
            
            // Update button states based on new API response
            binding.btnClockIn.isEnabled = status.canClockIn
            binding.btnClockOut.isEnabled = status.canClockOut
            
            // Show status text
            when (status.nextAction) {
                "clock_in" -> {
                    binding.tvAttendanceStatus.text = "Belum Absen"
                    binding.tvAttendanceStatus.setTextColor(getColor(R.color.text_secondary))
                }
                "clock_out" -> {
                    binding.tvAttendanceStatus.text = "Sedang Bekerja"
                    binding.tvAttendanceStatus.setTextColor(getColor(R.color.success_green))
                }
                "completed" -> {
                    binding.tvAttendanceStatus.text = "Selesai Bekerja"
                    binding.tvAttendanceStatus.setTextColor(getColor(R.color.primary_brown))
                }
            }
            
            // Show work duration
            if (status.workDuration != null) {
                binding.tvWorkDuration.text = "Durasi: ${status.workDuration}"
                binding.tvWorkDuration.visibility = android.view.View.VISIBLE
            } else {
                binding.tvWorkDuration.text = "Durasi: --"
                binding.tvWorkDuration.visibility = android.view.View.VISIBLE
            }
            
            // Hide Quick Actions and show rest message when completed
            if (status.nextAction == "completed") {
                binding.quickActionsSection.visibility = android.view.View.GONE
                binding.restMessageSection.visibility = android.view.View.VISIBLE
            } else {
                binding.quickActionsSection.visibility = android.view.View.VISIBLE
                binding.restMessageSection.visibility = android.view.View.GONE
            }
            
            Log.d("MainActivity", "Attendance status UI updated successfully")
        } catch (e: Exception) {
            Log.e("MainActivity", "Error updating attendance status UI", e)
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
            Log.e("MainActivity", "Error formatting time: $isoTime", e)
            // Fallback: coba ambil jam:menit langsung dari string
            try {
                val timePart = isoTime.split("T").getOrNull(1)?.substring(0, 5)
                timePart ?: "--:--"
            } catch (ex: Exception) {
                "--:--"
            }
        }
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    override fun onResume() {
        super.onResume()
        // Refresh data when returning to this activity
        loadDashboardData()
        // Force location validation immediately
        validateLocationWithAPI()
    }
    
    private fun setupLocationTracking() {
        if (androidx.core.app.ActivityCompat.checkSelfPermission(
                this,
                android.Manifest.permission.ACCESS_FINE_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    currentLocation = location
                    updateLocationUI(location)
                }
            }
        }
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
    
    private fun startAttendancePolling() {
        attendanceRunnable = object : Runnable {
            override fun run() {
                // Refresh attendance status to update work duration
                val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this@MainActivity)
                loadAttendanceStatus(apiAdapter)
                attendanceHandler.postDelayed(this, 60000) // Poll every 60 seconds (1 minute)
            }
        }
        attendanceHandler.post(attendanceRunnable)
    }
    
    private fun validateLocationWithAPI() {
        if (androidx.core.app.ActivityCompat.checkSelfPermission(
                this,
                android.Manifest.permission.ACCESS_FINE_LOCATION
            ) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                currentLocation = location
                
                val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
                
                apiAdapter.validateLocation(
                    location.latitude,
                    location.longitude,
                    onSuccess = { response ->
                        if (response.success && response.data != null) {
                            val data = response.data
                            updateLocationStatusBar(location, data.isValid, data.distance.toInt())
                        }
                    },
                    onError = { error ->
                        Log.e("MainActivity", "Location validation error: $error")
                    }
                )
            }
        }
    }
    
    private fun updateLocationUI(location: android.location.Location) {
        val lat = String.format("%.3f", location.latitude)
        val lng = String.format("%.3f", location.longitude)
        binding.tvLocationCoordinates.text = " • Lat: $lat, Lng: $lng"
    }
    
    private fun updateLocationStatusBar(
        location: android.location.Location,
        isValid: Boolean,
        distance: Int
    ) {
        val lat = String.format("%.3f", location.latitude)
        val lng = String.format("%.3f", location.longitude)
        
        // Force valid if distance is 0 (exact location match)
        val actuallyValid = isValid || distance == 0
        
        if (actuallyValid) {
            binding.locationStatusBar.setBackgroundColor(
                androidx.core.content.ContextCompat.getColor(this, R.color.success_green)
            )
            binding.tvLocationStatus.text = if (distance == 0) {
                "Di Area Kantor (${distance}m)"
            } else {
                "Di Area Kantor"
            }
        } else {
            binding.locationStatusBar.setBackgroundColor(
                androidx.core.content.ContextCompat.getColor(this, R.color.error_red)
            )
            binding.tvLocationStatus.text = "Di Luar Area Kantor (${distance}m)"
        }
        
        binding.tvLocationCoordinates.text = " • Lat: $lat, Lng: $lng"
    }
    
    override fun onDestroy() {
        super.onDestroy()
        locationHandler.removeCallbacks(locationRunnable)
        attendanceHandler.removeCallbacks(attendanceRunnable)
    }
}