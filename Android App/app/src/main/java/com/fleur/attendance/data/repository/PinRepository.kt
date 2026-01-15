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
 * PinRepository - Handle PIN management operations
 * 
 * This repository handles:
 * - Validate PIN
 * - Change PIN
 */
class PinRepository(private val context: Context) {
    
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
                    "INVALID_PIN" -> "PIN yang dimasukkan salah"
                    "PIN_TOO_SHORT" -> "PIN minimal 6 digit"
                    "PIN_TOO_WEAK" -> "PIN terlalu lemah. Gunakan kombinasi angka yang berbeda"
                    "SAME_PIN" -> "PIN baru tidak boleh sama dengan PIN lama"
                    "UNAUTHORIZED" -> "Sesi telah berakhir. Silakan login kembali"
                    "TOKEN_EXPIRED" -> "Sesi telah berakhir. Silakan login kembali"
                    else -> if (message.isNotEmpty()) message else defaultMessage
                }
            } else {
                defaultMessage
            }
        } catch (e: Exception) {
            Log.e("PinRepository", "Error parsing error body", e)
            defaultMessage
        }
    }
    
    /**
     * Validate PIN
     */
    fun validatePin(
        pin: String,
        onSuccess: (ValidatePinResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        val request = ValidatePinRequest(pin)
        
        apiService.validatePin(request)
            .enqueue(object : Callback<ValidatePinResponse> {
                override fun onResponse(
                    call: Call<ValidatePinResponse>,
                    response: Response<ValidatePinResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal memvalidasi PIN"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<ValidatePinResponse>, t: Throwable) {
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
     * Change PIN
     */
    fun changePin(
        currentPin: String,
        newPin: String,
        onSuccess: (ChangePinResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        val request = ChangePinRequest(currentPin, newPin)
        
        apiService.changePin(request)
            .enqueue(object : Callback<ChangePinResponse> {
                override fun onResponse(
                    call: Call<ChangePinResponse>,
                    response: Response<ChangePinResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal mengubah PIN"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<ChangePinResponse>, t: Throwable) {
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
