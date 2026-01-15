package com.fleur.attendance

import android.app.Application
import com.fleur.attendance.data.api.TokenManager

class AttendanceApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Load saved token into ApiConfig on app start
        val tokenManager = TokenManager.getInstance(this)
        tokenManager.loadToken()
    }
}
