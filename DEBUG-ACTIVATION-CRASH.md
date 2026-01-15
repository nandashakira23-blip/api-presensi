# Debug Aktivasi Crash - Android App

## Masalah
Aktivasi berhasil di server (terlihat di log PM2) tapi Android app crash/keluar setelah aktivasi.

## Perubahan yang Sudah Dilakukan

### 1. Fix Response API (routes/api.js)
- Ubah response key dari camelCase ke snake_case
- `accessToken` → `access_token`
- `refreshToken` → `refresh_token`
- `expiresIn` → `expires_in`

Ini agar sesuai dengan Android model yang menggunakan `@SerializedName`.

### 2. Tambah Logging Detail (FaceEnrollmentActivity.kt)
- Log setiap step proses aktivasi
- Log response dari API
- Log saat save tokens
- Log saat navigasi ke login
- Tambah try-catch di setiap step

### 3. Tambah Logging Detail (AuthRepository.kt)
- Log response code dan body
- Log saat save tokens
- Log saat save employee info
- Catch exception saat save data

### 4. Improve Error Handling (FaceEnrollmentActivity.kt)
- Wrap semua callback dalam `runOnUiThread`
- Tambah fallback navigation jika error
- Auto navigate ke login setelah 2 detik jika ada error
- Tambah Toast message sebagai fallback

## Cara Debug

### Step 1: Build dan Install APK Baru
```bash
cd "Android App"
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Step 2: Monitor Logcat
Buka Android Studio atau gunakan adb logcat:
```bash
adb logcat | grep -E "(FaceEnrollment|AuthRepository)"
```

Atau filter lebih spesifik:
```bash
adb logcat *:E FaceEnrollment:D AuthRepository:D
```

### Step 3: Test Aktivasi
1. Buka app
2. Masukkan NIK yang belum diaktivasi
3. Buat PIN 4 digit
4. Upload foto wajah
5. Perhatikan log

### Step 4: Analisa Log

#### Log yang Diharapkan (Success):
```
FaceEnrollment: === STARTING ACTIVATION ===
FaceEnrollment: NIK: 0000000000000000
FaceEnrollment: File: 2026-01-15-11-23-43-355.jpg, size: 1656820 bytes
AuthRepository: === ACTIVATE RESPONSE ===
AuthRepository: Response code: 200
AuthRepository: Response successful: true
AuthRepository: Response body: ActivateResponse(success=true, message=Account activated successfully, data=...)
AuthRepository: Saving tokens...
AuthRepository: Tokens saved
AuthRepository: Saving employee info...
AuthRepository: Employee info saved
AuthRepository: Calling onSuccess callback...
FaceEnrollment: === ACTIVATION SUCCESS CALLBACK ===
FaceEnrollment: Response success: true
FaceEnrollment: Response message: Account activated successfully
FaceEnrollment: Showing success dialog...
FaceEnrollment: Photo file deleted
FaceEnrollment: Success dialog OK clicked, navigating to login...
FaceEnrollment: Navigation completed
```

#### Log Jika Ada Error:
Cari baris yang mengandung:
- `Error in success handler`
- `Error saving tokens/employee info`
- `Error navigating to login`
- Exception stack trace

### Step 5: Cek Server Log
```bash
ssh root@76.13.19.34
pm2 logs presensi-api --lines 100
```

Pastikan response dari server benar:
```json
{
  "success": true,
  "message": "Account activated successfully",
  "data": {
    "employee": {
      "id": 10,
      "nik": "0000000000000000",
      "nama": "Test User"
    },
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": 3600
    },
    "face_enrollment": {
      "faces_detected": 1,
      "enrollment_completed": true,
      "photo_saved": "ref-1768447424107-714311659.jpg"
    }
  }
}
```

## Kemungkinan Penyebab Crash

### 1. Response Parsing Error
- Key tidak match (camelCase vs snake_case) ✅ FIXED
- Data null atau missing field
- JSON parsing exception

### 2. Token Save Error
- SharedPreferences error
- Context null
- Permission denied

### 3. Navigation Error
- Activity not found
- Intent flag error
- Context invalid

### 4. UI Thread Error
- Update UI dari background thread
- View already destroyed

## Solusi yang Sudah Diterapkan

1. ✅ Fix response key naming (snake_case)
2. ✅ Wrap callback dalam `runOnUiThread`
3. ✅ Tambah try-catch di setiap step
4. ✅ Tambah logging detail
5. ✅ Tambah fallback navigation
6. ✅ Tambah auto-navigate setelah 2 detik jika error

## Testing Checklist

- [ ] Push code ke GitHub
- [ ] Pull di server
- [ ] Restart PM2
- [ ] Build APK baru
- [ ] Install di device
- [ ] Test aktivasi dengan logcat
- [ ] Cek apakah masih crash
- [ ] Cek log untuk error message
- [ ] Verify bisa login setelah aktivasi

## Jika Masih Crash

1. **Cek Logcat** - Lihat exact error message
2. **Cek Server Log** - Pastikan response benar
3. **Test Manual** - Coba hit API langsung dengan Postman
4. **Simplify** - Hapus dialog, langsung navigate
5. **Isolate** - Test save tokens secara terpisah

## Workaround Sementara

Jika masih crash, user bisa:
1. Tutup app
2. Buka app lagi
3. Login dengan NIK dan PIN yang baru dibuat
4. Seharusnya bisa masuk karena aktivasi sudah berhasil di server
