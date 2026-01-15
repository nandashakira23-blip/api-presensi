package com.fleur.attendance.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.fleur.attendance.R
import com.fleur.attendance.databinding.ActivityActivationBinding

class ActivationActivity : AppCompatActivity() {
    private lateinit var binding: ActivityActivationBinding
    private lateinit var nik: String
    private lateinit var employeeName: String
    private var isReactivation: Boolean = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityActivationBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        nik = intent.getStringExtra("nik") ?: ""
        employeeName = intent.getStringExtra("employeeName") ?: "Karyawan"
        isReactivation = intent.getBooleanExtra("isReactivation", false)
        
        setupUI()
        setupClickListeners()
    }
    
    private fun setupUI() {
        binding.tvNik.text = nik
        binding.tvEmployeeName.text = employeeName
        binding.etPin.requestFocus()
        
        // Update UI text based on activation type
        if (isReactivation) {
            binding.tvActivationTitle.text = getString(R.string.reactivation_title)
            binding.tvActivationWelcome.text = getString(R.string.reactivation_welcome)
            binding.btnActivate.text = getString(R.string.reactivation_button)
        }
    }
    
    private fun setupClickListeners() {
        binding.btnActivate.setOnClickListener {
            val pin = binding.etPin.text.toString().trim()
            val confirmPin = binding.etConfirmPin.text.toString().trim()
            
            if (validatePin(pin, confirmPin)) {
                activateAccount(nik, pin)
            }
        }
    }
    
    private fun validatePin(pin: String, confirmPin: String): Boolean {
        var isValid = true
        
        // Validate PIN
        if (pin.isEmpty()) {
            binding.tilPin.error = getString(R.string.validation_pin_required)
            isValid = false
        } else if (pin.length != 4) {
            binding.tilPin.error = getString(R.string.validation_pin_invalid)
            isValid = false
        } else {
            binding.tilPin.error = null
        }
        
        // Validate Confirm PIN
        if (confirmPin.isEmpty()) {
            binding.tilConfirmPin.error = getString(R.string.validation_pin_required)
            isValid = false
        } else if (confirmPin.length != 4) {
            binding.tilConfirmPin.error = getString(R.string.validation_pin_invalid)
            isValid = false
        } else if (pin != confirmPin) {
            binding.tilConfirmPin.error = getString(R.string.validation_pin_mismatch)
            isValid = false
        } else {
            binding.tilConfirmPin.error = null
        }
        
        return isValid
    }
    
    private fun activateAccount(nik: String, pin: String) {
        showLoading(true)
        
        // For activation, we need face photo first
        // This activity should not be used anymore, redirect to FaceEnrollmentActivity
        showError("Please use Face Enrollment for activation")
        showLoading(false)
        
        // Redirect to FaceEnrollmentActivity
        val intent = Intent(this, FaceEnrollmentActivity::class.java)
        intent.putExtra("nik", nik)
        intent.putExtra("employeeName", employeeName)
        intent.putExtra("pin", pin)
        startActivity(intent)
        finish()
    }
    
    private fun showLoading(show: Boolean) {
        binding.loadingOverlay.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnActivate.isEnabled = !show
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