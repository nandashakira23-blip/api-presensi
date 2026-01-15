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
 * FaceRepository - Handle face recognition operations
 * 
 * This repository handles:
 * - Face enrollment
 * - Face re-enrollment
 * - Face recognition status
 */
class FaceRepository(private val context: Context) {
    
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
                    "NO_FACE_DETECTED" -> "Wajah tidak terdeteksi pada foto. Pastikan wajah terlihat jelas"
                    "MULTIPLE_FACES" -> "Terdeteksi lebih dari satu wajah. Pastikan hanya ada satu wajah"
                    "FACE_QUALITY_LOW" -> "Kualitas foto wajah kurang baik. Pastikan pencahayaan cukup"
                    "FACE_ALREADY_ENROLLED" -> "Wajah sudah terdaftar sebelumnya"
                    "INVALID_PIN" -> "PIN yang dimasukkan salah"
                    "UNAUTHORIZED" -> "Sesi telah berakhir. Silakan login kembali"
                    "TOKEN_EXPIRED" -> "Sesi telah berakhir. Silakan login kembali"
                    else -> if (message.isNotEmpty()) message else defaultMessage
                }
            } else {
                defaultMessage
            }
        } catch (e: Exception) {
            Log.e("FaceRepository", "Error parsing error body", e)
            defaultMessage
        }
    }
    
    /**
     * Enroll face (first time)
     */
    fun enrollFace(
        facePhotoFile: File,
        onSuccess: (FaceEnrollmentResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        val photoBody = facePhotoFile.asRequestBody("image/*".toMediaTypeOrNull())
        val photoPart = MultipartBody.Part.createFormData(
            "reference",  // Changed from face_photo to reference to match server
            facePhotoFile.name,
            photoBody
        )
        
        apiService.faceEnrollment(photoPart)
            .enqueue(object : Callback<FaceEnrollmentResponse> {
                override fun onResponse(
                    call: Call<FaceEnrollmentResponse>,
                    response: Response<FaceEnrollmentResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal mendaftarkan wajah"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<FaceEnrollmentResponse>, t: Throwable) {
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
     * Re-enroll face (update existing)
     */
    fun reenrollFace(
        currentPin: String,
        facePhotoFile: File,
        onSuccess: (FaceReenrollmentResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        val pinBody = currentPin.toRequestBody("text/plain".toMediaTypeOrNull())
        val photoBody = facePhotoFile.asRequestBody("image/*".toMediaTypeOrNull())
        val photoPart = MultipartBody.Part.createFormData(
            "face_photo",
            facePhotoFile.name,
            photoBody
        )
        
        apiService.faceReenrollment(pinBody, photoPart)
            .enqueue(object : Callback<FaceReenrollmentResponse> {
                override fun onResponse(
                    call: Call<FaceReenrollmentResponse>,
                    response: Response<FaceReenrollmentResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal memperbarui data wajah"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<FaceReenrollmentResponse>, t: Throwable) {
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
     * Get face recognition status
     */
    fun getFaceStatus(
        onSuccess: (FaceRecognitionStatusResponse) -> Unit,
        onError: (String) -> Unit
    ) {
        apiService.getFaceRecognitionStatus()
            .enqueue(object : Callback<FaceRecognitionStatusResponse> {
                override fun onResponse(
                    call: Call<FaceRecognitionStatusResponse>,
                    response: Response<FaceRecognitionStatusResponse>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let { onSuccess(it) }
                            ?: onError("Tidak ada respons dari server")
                    } else {
                        val errorMessage = parseErrorMessage(
                            response.errorBody(),
                            "Gagal mengambil status wajah"
                        )
                        onError(errorMessage)
                    }
                }
                
                override fun onFailure(call: Call<FaceRecognitionStatusResponse>, t: Throwable) {
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
