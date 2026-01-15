package com.fleur.attendance.data.model

import com.google.gson.annotations.SerializedName

// ===== AUTHENTICATION REQUEST MODELS =====

data class CheckNikRequest(
    val nik: String
)

data class LoginRequest(
    val nik: String,
    val pin: String
)

data class RefreshTokenRequest(
    @SerializedName("refresh_token")
    val refreshToken: String
)

// ===== PIN MANAGEMENT REQUEST MODELS =====

data class ValidatePinRequest(
    val pin: String
)

data class ChangePinRequest(
    @SerializedName("current_pin") 
    val currentPin: String,
    @SerializedName("new_pin") 
    val newPin: String
)

// ===== LOCATION REQUEST MODELS =====

data class ValidateLocationRequest(
    val latitude: Double,
    val longitude: Double
)