package com.fleur.attendance.utils

import android.content.Context
import android.content.SharedPreferences
import com.fleur.attendance.data.api.TokenManager
import com.fleur.attendance.data.model.Employee

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("user_session", Context.MODE_PRIVATE)
    private val tokenManager: TokenManager = TokenManager.getInstance(context)
    
    companion object {
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_EMPLOYEE_ID = "employee_id"
        private const val KEY_EMPLOYEE_NIK = "employee_nik"
        private const val KEY_EMPLOYEE_NAME = "employee_name"
        private const val KEY_EMPLOYEE_POSITION_ID = "employee_position_id"
        private const val KEY_EMPLOYEE_WORK_SCHEDULE_ID = "employee_work_schedule_id"
        private const val KEY_EMPLOYEE_PHOTO = "employee_photo"
        private const val KEY_EMPLOYEE_EMAIL = "employee_email"
        private const val KEY_EMPLOYEE_PHONE = "employee_phone"
        private const val KEY_SAVED_NIK = "saved_nik"
    }
    
    fun saveUserSession(employee: Employee) {
        val editor = prefs.edit()
        editor.putBoolean(KEY_IS_LOGGED_IN, true)
        editor.putInt(KEY_EMPLOYEE_ID, employee.id)
        editor.putString(KEY_EMPLOYEE_NIK, employee.nik)
        editor.putString(KEY_EMPLOYEE_NAME, employee.nama)
        employee.email?.let { editor.putString(KEY_EMPLOYEE_EMAIL, it) }
        employee.phone?.let { editor.putString(KEY_EMPLOYEE_PHONE, it) }
        employee.jabatan?.let { editor.putInt(KEY_EMPLOYEE_POSITION_ID, it.id) }
        employee.workScheduleId?.let { editor.putInt(KEY_EMPLOYEE_WORK_SCHEDULE_ID, it) }
        employee.fotoReferensi?.let { editor.putString(KEY_EMPLOYEE_PHOTO, it) }
        editor.apply()
        
        // Also save to TokenManager
        tokenManager.saveEmployeeInfo(employee.id, employee.nik, employee.nama)
    }
    
    fun isLoggedIn(): Boolean {
        // Check both old session and new token
        return prefs.getBoolean(KEY_IS_LOGGED_IN, false) || tokenManager.isLoggedIn()
    }
    
    fun getEmployeeId(): Int {
        val id = prefs.getInt(KEY_EMPLOYEE_ID, -1)
        return if (id != -1) id else tokenManager.getEmployeeId()
    }
    
    fun getEmployeeNik(): String? {
        return prefs.getString(KEY_EMPLOYEE_NIK, null) ?: tokenManager.getEmployeeNik()
    }
    
    fun getEmployeeName(): String? {
        return prefs.getString(KEY_EMPLOYEE_NAME, null) ?: tokenManager.getEmployeeName()
    }
    
    fun getEmployeeEmail(): String? {
        return prefs.getString(KEY_EMPLOYEE_EMAIL, null)
    }
    
    fun getEmployeePhone(): String? {
        return prefs.getString(KEY_EMPLOYEE_PHONE, null)
    }
    
    fun getEmployeePositionId(): Int {
        return prefs.getInt(KEY_EMPLOYEE_POSITION_ID, -1)
    }
    
    fun getEmployeeWorkScheduleId(): Int {
        return prefs.getInt(KEY_EMPLOYEE_WORK_SCHEDULE_ID, -1)
    }
    
    fun getEmployeePhoto(): String? {
        return prefs.getString(KEY_EMPLOYEE_PHOTO, null)
    }
    
    fun clearSession() {
        val editor = prefs.edit()
        editor.clear()
        editor.apply()
        
        // Also clear tokens
        tokenManager.clearTokens()
    }
    
    // Remember Me functions
    fun saveNik(nik: String) {
        prefs.edit().putString(KEY_SAVED_NIK, nik).apply()
    }
    
    fun getSavedNik(): String? {
        return prefs.getString(KEY_SAVED_NIK, null)
    }
    
    fun clearSavedNik() {
        prefs.edit().remove(KEY_SAVED_NIK).apply()
    }
}
