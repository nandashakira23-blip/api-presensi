package com.fleur.attendance.ui.profile

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.fleur.attendance.R
import com.fleur.attendance.data.api.ApiConfig
import com.fleur.attendance.data.api.ApiService
import com.fleur.attendance.data.model.Employee
import com.fleur.attendance.data.model.EmployeeProfileResponse
import com.fleur.attendance.databinding.ActivityProfileBinding
import com.fleur.attendance.ui.auth.LoginActivity
import com.fleur.attendance.ui.settings.ChangePinActivity
import com.fleur.attendance.utils.SessionManager
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class ProfileActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProfileBinding
    private lateinit var sessionManager: SessionManager
    private lateinit var apiService: ApiService
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        sessionManager = SessionManager(this)
        apiService = ApiConfig.getApiService()
        
        setupToolbar()
        setupUI()
        setupClickListeners()
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Profil"
    }
    
    private fun setupUI() {
        val employeeName = sessionManager.getEmployeeName() ?: "Karyawan"
        val employeeNik = sessionManager.getEmployeeNik() ?: "-"
        
        binding.tvEmployeeName.text = employeeName
        binding.tvEmployeeNik.text = "NIK: $employeeNik"
        
        // Load full profile from API
        loadEmployeeProfile()
    }
    
    private fun loadEmployeeProfile() {
        val employeeId = sessionManager.getEmployeeId()
        if (employeeId == -1) return
        
        val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
        
        apiAdapter.getEmployeeProfile(
            employeeId = employeeId,
            onSuccess = { profile ->
                val employee = profile.employee
                updateProfileUI(employee)
            },
            onError = { _ ->
                // Silently fail, use cached data
            }
        )
    }
    
    private fun updateProfileUI(employee: com.fleur.attendance.data.model.Employee) {
        binding.tvEmployeeName.text = employee.nama
        binding.tvEmployeeNik.text = "NIK: ${employee.nik}"
        
        // Show email if available
        if (!employee.email.isNullOrEmpty()) {
            binding.tvEmail.text = employee.email
            binding.emailSection.visibility = android.view.View.VISIBLE
        } else {
            binding.emailSection.visibility = android.view.View.GONE
        }
        
        // Show phone if available
        if (!employee.phone.isNullOrEmpty()) {
            // Format phone number with +62 if not already present
            val formattedPhone = if (employee.phone.startsWith("+62")) {
                employee.phone
            } else if (employee.phone.startsWith("62")) {
                "+${employee.phone}"
            } else if (employee.phone.startsWith("0")) {
                "+62 ${employee.phone.substring(1)}"
            } else {
                "+62 ${employee.phone}"
            }
            binding.tvPhone.text = formattedPhone
            binding.phoneSection.visibility = android.view.View.VISIBLE
        } else {
            binding.phoneSection.visibility = android.view.View.GONE
        }
        
        // Load profile picture
        if (!employee.profilePicture.isNullOrEmpty()) {
            val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
            val baseUrl = apiAdapter.getBaseUrl().removeSuffix("/api/")
            val imageUrl = "$baseUrl/${employee.profilePicture}"
            
            com.bumptech.glide.Glide.with(this)
                .load(imageUrl)
                .placeholder(R.drawable.ic_person)
                .error(R.drawable.ic_person)
                .circleCrop()
                .into(binding.ivProfilePicture)
        }
        
        // Update session with latest data
        sessionManager.saveUserSession(employee)
    }
    
    private fun setupClickListeners() {
        binding.btnEditProfile.setOnClickListener {
            startActivity(Intent(this, ProfileEditActivity::class.java))
        }
        
        binding.btnChangePin.setOnClickListener {
            startActivity(Intent(this, ChangePinActivity::class.java))
        }
        
        binding.btnLogout.setOnClickListener {
            logout()
        }
    }
    
    private fun logout() {
        sessionManager.clearSession()
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
    
    override fun onResume() {
        super.onResume()
        // Reload profile when returning from edit
        loadEmployeeProfile()
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}