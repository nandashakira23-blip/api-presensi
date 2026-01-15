package com.fleur.attendance.data.api

import android.content.Context
import android.content.SharedPreferences

/**
 * TokenManager - Secure token storage and management
 * 
 * This class handles:
 * - Secure storage of JWT tokens
 * - Token retrieval and validation
 * - Automatic token refresh
 * - Token clearing on logout
 */
class TokenManager(context: Context) {
    
    companion object {
        private const val PREFS_NAME = "fleur_attendance_secure_prefs"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_TOKEN_EXPIRY = "token_expiry"
        private const val KEY_EMPLOYEE_ID = "employee_id"
        private const val KEY_EMPLOYEE_NIK = "employee_nik"
        private const val KEY_EMPLOYEE_NAME = "employee_name"
        
        @Volatile
        private var INSTANCE: TokenManager? = null
        
        fun getInstance(context: Context): TokenManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: TokenManager(context.applicationContext).also {
                    INSTANCE = it
                }
            }
        }
    }
    
    private val sharedPreferences: SharedPreferences
    
    init {
        // Use regular SharedPreferences
        // For production, consider using EncryptedSharedPreferences
        sharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    /**
     * Save tokens after login or activation
     */
    fun saveTokens(accessToken: String, refreshToken: String, expiresIn: Int) {
        val expiryTime = System.currentTimeMillis() + (expiresIn * 1000L)
        
        sharedPreferences.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putLong(KEY_TOKEN_EXPIRY, expiryTime)
            .apply()
        
        // Update ApiConfig
        ApiConfig.setAuthToken(accessToken)
    }
    
    /**
     * Save employee info after login
     */
    fun saveEmployeeInfo(id: Int, nik: String, name: String) {
        sharedPreferences.edit()
            .putInt(KEY_EMPLOYEE_ID, id)
            .putString(KEY_EMPLOYEE_NIK, nik)
            .putString(KEY_EMPLOYEE_NAME, name)
            .apply()
    }
    
    /**
     * Get access token
     */
    fun getAccessToken(): String? {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }
    
    /**
     * Get refresh token
     */
    fun getRefreshToken(): String? {
        return sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
    }
    
    /**
     * Check if token is expired or about to expire (within 5 minutes)
     */
    fun isTokenExpired(): Boolean {
        val expiryTime = sharedPreferences.getLong(KEY_TOKEN_EXPIRY, 0)
        val currentTime = System.currentTimeMillis()
        val bufferTime = 5 * 60 * 1000 // 5 minutes buffer
        
        return currentTime >= (expiryTime - bufferTime)
    }
    
    /**
     * Check if user is logged in (has valid tokens)
     */
    fun isLoggedIn(): Boolean {
        val accessToken = getAccessToken()
        val refreshToken = getRefreshToken()
        return !accessToken.isNullOrEmpty() && !refreshToken.isNullOrEmpty()
    }
    
    /**
     * Get employee ID
     */
    fun getEmployeeId(): Int {
        return sharedPreferences.getInt(KEY_EMPLOYEE_ID, -1)
    }
    
    /**
     * Get employee NIK
     */
    fun getEmployeeNik(): String? {
        return sharedPreferences.getString(KEY_EMPLOYEE_NIK, null)
    }
    
    /**
     * Get employee name
     */
    fun getEmployeeName(): String? {
        return sharedPreferences.getString(KEY_EMPLOYEE_NAME, null)
    }
    
    /**
     * Clear all tokens and user data (logout)
     */
    fun clearTokens() {
        sharedPreferences.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_TOKEN_EXPIRY)
            .remove(KEY_EMPLOYEE_ID)
            .remove(KEY_EMPLOYEE_NIK)
            .remove(KEY_EMPLOYEE_NAME)
            .apply()
        
        // Clear from ApiConfig
        ApiConfig.clearAuthToken()
    }
    
    /**
     * Load token into ApiConfig (call on app start)
     */
    fun loadToken() {
        val accessToken = getAccessToken()
        if (!accessToken.isNullOrEmpty()) {
            ApiConfig.setAuthToken(accessToken)
        }
    }
}
