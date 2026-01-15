package com.fleur.attendance.data.model

import com.google.gson.annotations.SerializedName

// ===== BASE RESPONSE MODELS =====

data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T?,
    val code: String?
)

// ===== AUTHENTICATION RESPONSE MODELS =====

data class CheckNikResponse(
    val success: Boolean,
    val message: String,
    val data: CheckNikData?
)

data class CheckNikData(
    val exists: Boolean,
    @SerializedName("is_activated")
    val isActivated: Boolean,
    @SerializedName("has_face_reference")
    val hasFaceReference: Boolean,
    val employee: EmployeeBasicInfo?
)

data class ActivateResponse(
    val success: Boolean,
    val message: String,
    val data: ActivateData?
)

data class ActivateData(
    val employee: EmployeeBasicInfo,
    val tokens: TokenData,
    @SerializedName("face_enrollment")
    val faceEnrollment: FaceEnrollmentResult
)

data class LoginResponse(
    val success: Boolean,
    val message: String,
    val data: LoginData?
)

data class LoginData(
    val employee: Employee,
    val tokens: TokenData,
    @SerializedName("work_schedule")
    val workSchedule: WorkSchedule?
)

data class TokenData(
    @SerializedName("access_token")
    val accessToken: String,
    @SerializedName("refresh_token")
    val refreshToken: String,
    @SerializedName("expires_in")
    val expiresIn: Int
)

data class RefreshTokenResponse(
    val success: Boolean,
    val message: String,
    val data: RefreshTokenData?
)

data class RefreshTokenData(
    @SerializedName("access_token")
    val accessToken: String,
    @SerializedName("expires_in")
    val expiresIn: Int
)

// ===== EMPLOYEE MODELS =====

data class Employee(
    val id: Int,
    val nik: String,
    val nama: String,
    val email: String?,
    val phone: String?,
    @SerializedName("profile_picture")
    val profilePicture: String?,
    val jabatan: JobInfo?,
    @SerializedName("is_activated")
    val isActivated: Boolean,
    @SerializedName("foto_referensi")
    val fotoReferensi: String?,
    @SerializedName("face_enrollment_completed")
    val faceEnrollmentCompleted: Boolean,
    @SerializedName("work_schedule_id")
    val workScheduleId: Int?,
    @SerializedName("created_at")
    val createdAt: String?
)

data class EmployeeBasicInfo(
    val id: Int,
    val nik: String,
    val nama: String
)

data class JobInfo(
    val id: Int,
    @SerializedName("nama_jabatan")
    val namaJabatan: String,
    val deskripsi: String?
)

// ===== ATTENDANCE RESPONSE MODELS =====

data class ClockInResponse(
    val success: Boolean,
    val message: String,
    val data: ClockInData?
)

data class ClockInData(
    @SerializedName("attendance_id")
    val attendanceId: Int,
    @SerializedName("clock_in_time")
    val clockInTime: String,
    val status: String,
    val location: LocationValidation,
    @SerializedName("face_match")
    val faceMatch: FaceMatchResult,
    @SerializedName("work_schedule")
    val workSchedule: WorkScheduleInfo?
)

data class ClockOutResponse(
    val success: Boolean,
    val message: String,
    val data: ClockOutData?
)

data class ClockOutData(
    @SerializedName("attendance_id")
    val attendanceId: Int,
    @SerializedName("clock_in_time")
    val clockInTime: String,
    @SerializedName("clock_out_time")
    val clockOutTime: String,
    @SerializedName("work_duration")
    val workDuration: String,
    @SerializedName("overtime_minutes")
    val overtimeMinutes: Int,
    val location: LocationValidation,
    @SerializedName("face_match")
    val faceMatch: FaceMatchResult
)

data class LocationValidation(
    @SerializedName("is_valid")
    val isValid: Boolean,
    val distance: Double,
    val status: String
)

data class FaceMatchResult(
    @SerializedName("is_match")
    val isMatch: Boolean,
    val similarity: Double,
    val threshold: Double,
    @SerializedName("faces_detected")
    val facesDetected: Int
)

data class AttendanceStatusResponse(
    val success: Boolean,
    val message: String,
    val data: AttendanceStatus?
)

data class AttendanceStatus(
    val date: String,
    @SerializedName("has_clocked_in")
    val hasClockedIn: Boolean,
    @SerializedName("has_clocked_out")
    val hasClockedOut: Boolean,
    @SerializedName("clock_in_time")
    val clockInTime: String?,
    @SerializedName("clock_out_time")
    val clockOutTime: String?,
    @SerializedName("work_duration")
    val workDuration: String?,
    @SerializedName("can_clock_in")
    val canClockIn: Boolean,
    @SerializedName("can_clock_out")
    val canClockOut: Boolean,
    @SerializedName("next_action")
    val nextAction: String,
    @SerializedName("work_schedule")
    val workSchedule: WorkScheduleInfo?
)

data class WorkScheduleInfo(
    val name: String,
    @SerializedName("start_time")
    val startTime: String,
    @SerializedName("end_time")
    val endTime: String,
    @SerializedName("clock_in_start")
    val clockInStart: String?,
    @SerializedName("clock_in_end")
    val clockInEnd: String?,
    @SerializedName("clock_out_start")
    val clockOutStart: String?,
    @SerializedName("clock_out_end")
    val clockOutEnd: String?
)

data class TodayAttendanceResponse(
    val success: Boolean,
    val message: String,
    val data: TodayAttendanceData?
)

data class TodayAttendanceData(
    val date: String,
    @SerializedName("clock_in")
    val clockIn: AttendanceRecord?,
    @SerializedName("clock_out")
    val clockOut: AttendanceRecord?,
    @SerializedName("work_duration")
    val workDuration: String?,
    val status: String
)

data class AttendanceRecord(
    val time: String,
    val location: LocationInfo,
    @SerializedName("face_match")
    val faceMatch: FaceMatchInfo?,
    val photo: String?
)

data class LocationInfo(
    val latitude: Double,
    val longitude: Double,
    val distance: Double,
    @SerializedName("is_valid")
    val isValid: Boolean
)

data class FaceMatchInfo(
    @SerializedName("is_match")
    val isMatch: Boolean,
    val similarity: Double
)

// ===== ATTENDANCE HISTORY RESPONSE MODELS =====

data class AttendanceHistoryResponse(
    val success: Boolean,
    val message: String,
    val data: AttendanceHistoryList?
)

data class AttendanceHistoryList(
    val records: List<AttendanceHistoryItem>,
    val pagination: PaginationInfo
)

data class AttendanceHistoryItem(
    val id: Int,
    val date: String,
    val time: String,
    val type: String,
    val location: LocationInfo,
    @SerializedName("face_match")
    val faceMatch: FaceMatchInfo?,
    val photo: String?,
    val status: String
)

data class PaginationInfo(
    val total: Int,
    val limit: Int,
    val offset: Int,
    @SerializedName("has_more")
    val hasMore: Boolean
)

data class AttendanceSummaryResponse(
    val success: Boolean,
    val message: String,
    val data: AttendanceSummaryData?
)

data class AttendanceSummaryData(
    val month: Int,
    val year: Int,
    @SerializedName("total_days")
    val totalDays: Int,
    @SerializedName("present_days")
    val presentDays: Int,
    @SerializedName("absent_days")
    val absentDays: Int,
    @SerializedName("late_days")
    val lateDays: Int,
    @SerializedName("total_work_hours")
    val totalWorkHours: String,
    @SerializedName("average_work_hours")
    val averageWorkHours: String,
    @SerializedName("daily_records")
    val dailyRecords: List<DailyAttendanceRecord>
)

data class DailyAttendanceRecord(
    val date: String,
    @SerializedName("clock_in")
    val clockIn: String?,
    @SerializedName("clock_out")
    val clockOut: String?,
    @SerializedName("work_duration")
    val workDuration: String?,
    val status: String
)

// ===== EMPLOYEE PROFILE RESPONSE MODELS =====

data class EmployeeProfileResponse(
    val success: Boolean,
    val message: String,
    val data: EmployeeProfile?
)

data class EmployeeProfile(
    val employee: Employee,
    @SerializedName("work_schedule")
    val workSchedule: WorkSchedule?,
    @SerializedName("face_enrollment")
    val faceEnrollment: FaceEnrollmentInfo?
)

data class FaceEnrollmentInfo(
    val completed: Boolean,
    @SerializedName("has_reference")
    val hasReference: Boolean,
    @SerializedName("enrollment_date")
    val enrollmentDate: String?
)

// ===== WORK SCHEDULE RESPONSE MODELS =====

data class WorkScheduleResponse(
    val success: Boolean,
    val message: String,
    val data: WorkSchedule?
)

data class WorkSchedule(
    val id: Int,
    val name: String,
    @SerializedName("start_time")
    val startTime: String,
    @SerializedName("end_time")
    val endTime: String,
    @SerializedName("clock_in_start")
    val clockInStart: String?,
    @SerializedName("clock_in_end")
    val clockInEnd: String?,
    @SerializedName("clock_out_start")
    val clockOutStart: String?,
    @SerializedName("clock_out_end")
    val clockOutEnd: String?,
    @SerializedName("work_days")
    val workDays: List<String>,
    @SerializedName("is_active")
    val isActive: Boolean
)

// ===== PIN MANAGEMENT RESPONSE MODELS =====

data class ValidatePinResponse(
    val success: Boolean,
    val message: String,
    val data: ValidatePinData?
)

data class ValidatePinData(
    @SerializedName("pin_valid")
    val pinValid: Boolean,
    @SerializedName("validated_at")
    val validatedAt: String
)

data class ChangePinResponse(
    val success: Boolean,
    val message: String,
    val data: ChangePinData?
)

data class ChangePinData(
    @SerializedName("pin_changed")
    val pinChanged: Boolean,
    @SerializedName("changed_at")
    val changedAt: String
)

// ===== FACE RECOGNITION RESPONSE MODELS =====

data class FaceEnrollmentResponse(
    val success: Boolean,
    val message: String,
    val data: FaceEnrollmentResult?
)

data class FaceEnrollmentResult(
    @SerializedName("faces_detected")
    val facesDetected: Int,
    @SerializedName("enrollment_completed")
    val enrollmentCompleted: Boolean,
    @SerializedName("photo_saved")
    val photoSaved: String
)

data class FaceReenrollmentResponse(
    val success: Boolean,
    val message: String,
    val data: FaceReenrollmentResult?
)

data class FaceReenrollmentResult(
    @SerializedName("faces_detected")
    val facesDetected: Int,
    @SerializedName("old_photo")
    val oldPhoto: String?,
    @SerializedName("new_photo")
    val newPhoto: String,
    @SerializedName("updated_at")
    val updatedAt: String
)

data class FaceRecognitionStatusResponse(
    val success: Boolean,
    val message: String,
    val data: FaceRecognitionStatus?
)

data class FaceRecognitionStatus(
    val enabled: Boolean,
    @SerializedName("has_reference")
    val hasReference: Boolean,
    @SerializedName("enrollment_completed")
    val enrollmentCompleted: Boolean
)

data class EmployeeReferencePhotoResponse(
    val success: Boolean,
    val message: String,
    val data: EmployeeReferencePhoto?
)

data class EmployeeReferencePhoto(
    @SerializedName("has_reference")
    val hasReference: Boolean,
    @SerializedName("photo_url")
    val photoUrl: String?,
    @SerializedName("upload_date")
    val uploadDate: String?
)

// ===== LOCATION RESPONSE MODELS =====

data class OfficeLocationResponse(
    val success: Boolean,
    val message: String,
    val data: OfficeLocation?
)

data class OfficeLocation(
    val latitude: Double,
    val longitude: Double,
    @SerializedName("radius_meters")
    val radiusMeters: Double,
    val address: String?
)

data class ValidateLocationResponse(
    val success: Boolean,
    val message: String,
    val data: LocationValidationResult?
)

data class LocationValidationResult(
    @SerializedName("is_valid")
    val isValid: Boolean,
    val distance: Double,
    val status: String,
    @SerializedName("office_location")
    val officeLocation: OfficeLocation
)

// ===== SYSTEM RESPONSE MODELS =====

data class HealthResponse(
    val success: Boolean,
    val message: String,
    val timestamp: String,
    val version: String?
)

// ===== FACE VALIDATION REALTIME RESPONSE =====

data class FaceValidationResponse(
    val success: Boolean,
    val message: String? = null,
    val data: FaceValidationData?
)

data class FaceValidationData(
    @SerializedName("facesDetected")
    val facesDetected: Int,
    @SerializedName("isMatch")
    val isMatch: Boolean,
    val similarity: Double,
    val confidence: String,
    val threshold: Double,
    val message: String
)

data class Point(
    val x: Double,
    val y: Double
)

// ===== UPDATE PROFILE RESPONSE =====

data class UpdateProfileResponse(
    val success: Boolean,
    val message: String,
    val data: UpdateProfileData?
)

data class UpdateProfileData(
    val employee: Employee
)
