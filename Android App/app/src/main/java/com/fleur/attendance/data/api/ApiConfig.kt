package com.fleur.attendance.data.api

import android.content.Context
import android.os.Build
import com.fleur.attendance.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiConfig {
    // Development URLs
    private const val BASE_URL_LOCALHOST = "http://localhost:3000/"
    private const val BASE_URL_NETWORK = "http://192.168.1.102:3000/"
    private const val BASE_URL_EMULATOR = "http://10.0.2.2:3000/"
    
    // Production URL - Server VPS
    private const val BASE_URL_PRODUCTION = "http://76.13.19.34:3000/"
    
    private var authToken: String? = null
    
    fun getBaseUrl(): String {
        return when (BuildConfig.BUILD_TYPE) {
            "debug" -> {
                // Untuk development, pakai server production
                BASE_URL_PRODUCTION
            }
            "release" -> BASE_URL_PRODUCTION
            else -> BASE_URL_PRODUCTION
        }
    }
    
    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86"))
    }
    
    /**
     * Set JWT token for authenticated requests
     */
    fun setAuthToken(token: String?) {
        authToken = token
    }
    
    /**
     * Get current auth token
     */
    fun getAuthToken(): String? {
        return authToken
    }
    
    /**
     * Clear auth token (for logout)
     */
    fun clearAuthToken() {
        authToken = null
    }
    
    /**
     * Create auth interceptor for adding JWT token to requests
     */
    private fun createAuthInterceptor(): Interceptor {
        return Interceptor { chain ->
            val originalRequest = chain.request()
            
            // Skip adding token if Authorization header already exists
            if (originalRequest.header("Authorization") != null) {
                return@Interceptor chain.proceed(originalRequest)
            }
            
            // Add token if available
            val newRequest = if (authToken != null) {
                originalRequest.newBuilder()
                    .header("Authorization", "Bearer $authToken")
                    .build()
            } else {
                originalRequest
            }
            
            chain.proceed(newRequest)
        }
    }
    
    fun getApiService(): ApiService {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
        
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(createAuthInterceptor())
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
        
        val retrofit = Retrofit.Builder()
            .baseUrl(getBaseUrl())
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        
        return retrofit.create(ApiService::class.java)
    }
}
