package com.fleur.attendance.data.api

import com.fleur.attendance.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Call
import retrofit2.http.*

interface ApiService {
    // ===== AUTHENTICATION ENDPOINTS (No JWT Required) =====
    
    // Note: check-nik endpoint will be added to server
    @POST("api/auth/check-nik")
    fun checkNik(@Body request: CheckNikRequest): Call<CheckNikResponse>
    
    // Note: Using separate activation endpoints
    // Step 1: Login to get token
    // Step 2: Use /api/activation/set-pin
    // Step 3: Use /api/activation/upload-face
    // Step 4: Use /api/activation/complete

    @Multipart
    @POST("api/auth/activate")
    fun activate(
        @Part("nik") nik: RequestBody,
        @Part("pin") pin: RequestBody,
        @Part face_photo: MultipartBody.Part
    ): Call<ActivateResponse>
    
    @POST("api/auth/login")
    fun login(@Body request: LoginRequest): Call<LoginResponse>
    
    @POST("api/auth/refresh")
    fun refreshToken(@Body request: RefreshTokenRequest): Call<RefreshTokenResponse>
    
    // ===== ATTENDANCE ENDPOINTS (JWT Auto-Injected) =====
    
    @Multipart
    @POST("api/attendance/checkin")
    fun clockIn(
        @Part latitude: MultipartBody.Part,
        @Part longitude: MultipartBody.Part,
        @Part photo: MultipartBody.Part
    ): Call<ClockInResponse>
    
    @Multipart
    @POST("api/attendance/checkout")
    fun clockOut(
        @Part latitude: MultipartBody.Part,
        @Part longitude: MultipartBody.Part,
        @Part photo: MultipartBody.Part
    ): Call<ClockOutResponse>
    
    // Note: Server expects /api/attendance/status/:karyawan_id
    @GET("api/attendance/status/{karyawan_id}")
    fun getAttendanceStatus(@Path("karyawan_id") karyawanId: Int): Call<AttendanceStatusResponse>
    
    @GET("api/attendance/history")
    fun getAttendanceHistory(
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null
    ): Call<AttendanceHistoryResponse>
    
    @GET("api/attendance/summary")
    fun getAttendanceSummary(
        @Query("month") month: Int? = null,
        @Query("year") year: Int? = null
    ): Call<AttendanceSummaryResponse>
    
    @GET("api/attendance/today")
    fun getTodayAttendance(): Call<TodayAttendanceResponse>
    
    // ===== EMPLOYEE PROFILE ENDPOINTS (JWT Auto-Injected) =====
    
    // Note: Server has /api/auth/profile/:id
    @GET("api/auth/profile/{id}")
    fun getEmployeeProfile(@Path("id") employeeId: Int): Call<EmployeeProfileResponse>
    
    @Multipart
    @PUT("api/auth/profile/{id}")
    fun updateEmployeeProfile(
        @Path("id") employeeId: Int,
        @Part("email") email: RequestBody?,
        @Part("phone") phone: RequestBody?,
        @Part profile_picture: MultipartBody.Part?
    ): Call<UpdateProfileResponse>
    
    // Note: Server has /api/schedule/today/:karyawan_id
    @GET("api/schedule/today/{karyawan_id}")
    fun getEmployeeWorkSchedule(@Path("karyawan_id") karyawanId: Int): Call<WorkScheduleResponse>
    
    @GET("api/employee/face-reference")
    fun getEmployeeFaceReference(): Call<EmployeeReferencePhotoResponse>
    
    // ===== PIN MANAGEMENT ENDPOINTS (JWT Auto-Injected) =====
    
    @POST("api/pin/validate")
    fun validatePin(@Body request: ValidatePinRequest): Call<ValidatePinResponse>
    
    @POST("api/pin/change")
    fun changePin(@Body request: ChangePinRequest): Call<ChangePinResponse>
    
    // ===== FACE RECOGNITION ENDPOINTS (JWT Auto-Injected) =====
    
    // Note: Server has /api/activation/upload-face
    @Multipart
    @POST("api/activation/upload-face")
    fun faceEnrollment(
        @Part("reference") reference: MultipartBody.Part  // Changed from face_photo to reference
    ): Call<FaceEnrollmentResponse>
    
    @Multipart
    @POST("api/face/re-enroll")
    fun faceReenrollment(
        @Part("current_pin") currentPin: RequestBody,
        @Part("face_photo") facePhoto: MultipartBody.Part
    ): Call<FaceReenrollmentResponse>
    
    @GET("api/face/status")
    fun getFaceRecognitionStatus(): Call<FaceRecognitionStatusResponse>
    
    // ===== LOCATION ENDPOINTS (JWT Auto-Injected) =====
    
    // Note: Server has /api/settings/office-location
    @GET("api/settings/office-location")
    fun getOfficeLocation(): Call<OfficeLocationResponse>
    
    // Note: Server has /api/validation/location
    @POST("api/validation/location")
    fun validateLocation(@Body request: ValidateLocationRequest): Call<ValidateLocationResponse>
    
    // ===== SYSTEM ENDPOINTS (No JWT Required) =====
    
    @GET("api/health")
    fun healthCheck(): Call<HealthResponse>
    
    // ===== FACE DETECTION REALTIME =====
    
    @Multipart
    @POST("api/attendance/validate-face")
    fun validateFaceRealtime(
        @Part photo: MultipartBody.Part
    ): Call<FaceValidationResponse>
}