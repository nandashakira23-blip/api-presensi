package com.fleur.attendance.data.repository

import android.content.Context
import android.util.Log
import com.fleur.attendance.data.api.ApiConfig
import com.fleur.attendance.data.api.ApiService
import com.fleur.attendance.data.model.*
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

/**
 * LocationRepository - Handle location operations
 * 
 * This repository handles:
 * - Get office location
 * - Validate location
 */
class LocationRepository(private val context: Context) {
    
    private val apiService: ApiService = ApiConfig.getApiService()
    
    /**
     * Parse error message from API response body
     */
    private fun parseErrorMessage(errorBody: okhttp3.ResponseBody?, defaultMessage: String): String {
        return try {
            val errorJson = errorBody?.string()
            if (errorJson != null) {
                val jsonObject = JSONObject(errorJson)
                val message = jsonObject.optString("message", "")
                val code = jsonObject.optString("code", "")
                
                when (code) {
                    "NO_OFFICE_LOCATION" -> "Lokasi kantor belum dikonfigurasi"
                    "LOCATION_INVALID" -> {
                        val data = jsonObject.optJSONObject("data")
                        val distance = data?.optDouble("distance", 0.0)?.toInt() ?: 0
                        "Anda berada di luar area kantor (${distance}m dari kantor)"
                    }
                    "UNAUTHORIZED" -> "Sesi telah berakhir. Silakan login kembali"
                    "TOKEN_EXPIRED" -> "Sesi telah berakhir. Silakan login kembali"
                    else -> if (message.isNotEmpty()) message else defaultMessage
                }
            } else {
                defaultMessage
            }
        } catch (e: Exception) {
            Log.e("LocationRepository", "Error parsing error body", e)
            defaultMessage
        }
    }
    
    /**
     * Get office location and radius
     */
    fun getOfficeLocation(
        onSuccess: (OfficeLocationResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        apiService.getOfficeLocation()
            .enqueue(object : Callback<OfficeLocationResponse> {
                override fun onResponse(
                    call: Call<OfficeLocationResponse>,
                    response: Response<OfficeLocationResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal mengambil lokasi kantor"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<OfficeLocationResponse>, t: Throwable) {
                    val errorMessage = when {
                        t.message?.contains("timeout", ignoreCase = true) == true -> 
                            "Koneksi timeout. Periksa koneksi internet Anda"
                        t.message?.contains("Unable to resolve host", ignoreCase = true) == true ->
                            "Tidak dapat terhubung ke server. Periksa koneksi internet"
                        else -> "Terjadi kesalahan jaringan"
                    }
                    onError(errorMessage)
                }
            })
    }
    
    /**
     * Validate if location is within office radius
     */
    fun validateLocation(
        latitude: Double,
        longitude: Double,
        onSuccess: (ValidateLocationResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        val request = ValidateLocationRequest(latitude, longitude)
        
        apiService.validateLocation(request)
            .enqueue(object : Callback<ValidateLocationResponse> {
                override fun onResponse(
                    call: Call<ValidateLocationResponse>,
                    response: Response<ValidateLocationResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal memvalidasi lokasi"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<ValidateLocationResponse>, t: Throwable) {
                    val errorMessage = when {
                        t.message?.contains("timeout", ignoreCase = true) == true -> 
                            "Koneksi timeout. Periksa koneksi internet Anda"
                        t.message?.contains("Unable to resolve host", ignoreCase = true) == true ->
                            "Tidak dapat terhubung ke server. Periksa koneksi internet"
                        else -> "Terjadi kesalahan jaringan"
                    }
                    onError(errorMessage)
                }
            })
    }
}
