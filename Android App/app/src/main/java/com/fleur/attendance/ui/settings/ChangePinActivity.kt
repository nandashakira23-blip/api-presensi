package com.fleur.attendance.ui.settings

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.fleur.attendance.R
import com.fleur.attendance.data.api.ApiConfig
import com.fleur.attendance.data.api.ApiService
import com.fleur.attendance.data.model.ChangePinRequest
import com.fleur.attendance.data.model.ChangePinResponse
import com.fleur.attendance.databinding.ActivityChangePinBinding
import com.fleur.attendance.utils.SessionManager
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class ChangePinActivity : AppCompatActivity() {
    private lateinit var binding: ActivityChangePinBinding
    private lateinit var apiService: ApiService
    private lateinit var sessionManager: SessionManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChangePinBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        apiService = ApiConfig.getApiService()
        sessionManager = SessionManager(this)
        
        setupUI()
        setupClickListeners()
    }
    
    private fun setupUI() {
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
        
        binding.etCurrentPin.requestFocus()
    }
    
    private fun setupClickListeners() {
        binding.btnChangePin.setOnClickListener {
            val currentPin = binding.etCurrentPin.text.toString().trim()
            val newPin = binding.etNewPin.text.toString().trim()
            val confirmPin = binding.etConfirmPin.text.toString().trim()
            
            if (validateInput(currentPin, newPin, confirmPin)) {
                changePin(currentPin, newPin)
            }
        }
    }
    
    private fun validateInput(currentPin: String, newPin: String, confirmPin: String): Boolean {
        var isValid = true
        
        // Validate Current PIN
        if (currentPin.isEmpty()) {
            binding.tilCurrentPin.error = getString(R.string.validation_pin_required)
            isValid = false
        } else if (currentPin.length != 4) {
            binding.tilCurrentPin.error = getString(R.string.validation_pin_invalid)
            isValid = false
        } else {
            binding.tilCurrentPin.error = null
        }
        
        // Validate New PIN
        if (newPin.isEmpty()) {
            binding.tilNewPin.error = getString(R.string.validation_pin_required)
            isValid = false
        } else if (newPin.length != 4) {
            binding.tilNewPin.error = getString(R.string.validation_pin_invalid)
            isValid = false
        } else if (newPin == currentPin) {
            binding.tilNewPin.error = getString(R.string.validation_pin_same)
            isValid = false
        } else {
            binding.tilNewPin.error = null
        }
        
        // Validate Confirm PIN
        if (confirmPin.isEmpty()) {
            binding.tilConfirmPin.error = getString(R.string.validation_pin_required)
            isValid = false
        } else if (confirmPin.length != 4) {
            binding.tilConfirmPin.error = getString(R.string.validation_pin_invalid)
            isValid = false
        } else if (newPin != confirmPin) {
            binding.tilConfirmPin.error = getString(R.string.validation_pin_mismatch)
            isValid = false
        } else {
            binding.tilConfirmPin.error = null
        }
        
        return isValid
    }
    
    private fun changePin(currentPin: String, newPin: String) {
        showLoading(true)
        
        val apiAdapter = com.fleur.attendance.data.api.LegacyApiAdapter(this)
        
        apiAdapter.changePin(currentPin, newPin,
            onSuccess = { response ->
                showLoading(false)
                
                if (response.success) {
                    showSuccessDialog(getString(R.string.change_pin_success)) {
                        finish()
                    }
                } else {
                    showError(response.message)
                }
            },
            onError = { error ->
                showLoading(false)
                showError(error)
            }
        )
    }
    
    private fun showLoading(show: Boolean) {
        binding.loadingOverlay.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnChangePin.isEnabled = !show
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    private fun showSuccessDialog(message: String, onOk: () -> Unit) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.success))
            .setMessage(message)
            .setPositiveButton(getString(R.string.ok)) { _, _ ->
                onOk()
            }
            .setCancelable(false)
            .show()
    }
}