package com.fleur.attendance.data.repository

import android.content.Context
import android.util.Log
import com.fleur.attendance.data.api.ApiConfig
import com.fleur.attendance.data.api.ApiService
import com.fleur.attendance.data.model.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.File

/**
 * EmployeeRepository - Handle employee profile operations
 * 
 * This repository handles:
 * - Get employee profile
 * - Get work schedule
 * - Get face reference
 */
class EmployeeRepository(private val context: Context) {
    
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
                    "EMPLOYEE_NOT_FOUND" -> "Data karyawan tidak ditemukan"
                    "UNAUTHORIZED" -> "Sesi telah berakhir. Silakan login kembali"
                    "TOKEN_EXPIRED" -> "Sesi telah berakhir. Silakan login kembali"
                    "INVALID_EMAIL" -> "Format email tidak valid"
                    "INVALID_PHONE" -> "Format nomor telepon tidak valid"
                    "FILE_TOO_LARGE" -> "Ukuran file terlalu besar. Maksimal 5MB"
                    "INVALID_FILE_TYPE" -> "Tipe file tidak didukung. Gunakan JPG atau PNG"
                    else -> if (message.isNotEmpty()) message else defaultMessage
                }
            } else {
                defaultMessage
            }
        } catch (e: Exception) {
            Log.e("EmployeeRepository", "Error parsing error body", e)
            defaultMessage
        }
    }
    
    /**
     * Get employee profile
     */
    fun getProfile(
        employeeId: Int,
        onSuccess: (EmployeeProfileResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        apiService.getEmployeeProfile(employeeId)
            .enqueue(object : Callback<EmployeeProfileResponse> {
                override fun onResponse(
                    call: Call<EmployeeProfileResponse>,
                    response: Response<EmployeeProfileResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal mengambil data profil"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<EmployeeProfileResponse>, t: Throwable) {
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
     * Get employee work schedule
     */
    fun getWorkSchedule(
        employeeId: Int,
        onSuccess: (WorkScheduleResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        apiService.getEmployeeWorkSchedule(employeeId)
            .enqueue(object : Callback<WorkScheduleResponse> {
                override fun onResponse(
                    call: Call<WorkScheduleResponse>,
                    response: Response<WorkScheduleResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal mengambil jadwal kerja"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<WorkScheduleResponse>, t: Throwable) {
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
     * Get employee face reference photo
     */
    fun getFaceReference(
        onSuccess: (EmployeeReferencePhotoResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        apiService.getEmployeeFaceReference()
            .enqueue(object : Callback<EmployeeReferencePhotoResponse> {
                override fun onResponse(
                    call: Call<EmployeeReferencePhotoResponse>,
                    response: Response<EmployeeReferencePhotoResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal mengambil foto referensi"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<EmployeeReferencePhotoResponse>, t: Throwable) {
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
     * Update employee profile (self-service)
     */
    fun updateProfile(
        employeeId: Int,
        email: String?,
        phone: String?,
        profilePicture: File?,
        onSuccess: (UpdateProfileResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        try {
            val emailPart = email?.toRequestBody("text/plain".toMediaTypeOrNull())
            val phonePart = phone?.toRequestBody("text/plain".toMediaTypeOrNull())
            
            val profilePicturePart = profilePicture?.let { file ->
                val requestFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                MultipartBody.Part.createFormData("profile_picture", file.name, requestFile)
            }
            
            apiService.updateEmployeeProfile(employeeId, emailPart, phonePart, profilePicturePart)
                .enqueue(object : Callback<UpdateProfileResponse> {
                    override fun onResponse(
                        call: Call<UpdateProfileResponse>,
                        response: Response<UpdateProfileResponse>
                    ) {
                        if (response.isSuccessful) {
                            response.body()?.let { onSuccess(it) }
                                ?: onError("Tidak ada respons dari server")
                        } else {
                            val errorMessage = parseErrorMessage(
                                response.errorBody(),
                                "Gagal memperbarui profil"
                            )
                            onError(errorMessage)
                        }
                    }
                    
                    override fun onFailure(call: Call<UpdateProfileResponse>, t: Throwable) {
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
        } catch (e: Exception) {
            onError("Terjadi kesalahan: ${e.message}")
        }
    }
}
