# Fleur Atelier d'artistes - Attendance System (Android)

## 📱 Overview

Aplikasi Android untuk Sistem Presensi Fleur Atelier d'artistes dengan fitur Face Recognition, Location-Based Services, dan Work Schedule Management.

## 🎨 Features

### ✅ Implemented
- **Splash Screen** - Loading animation dengan brown theme
- **Authentication System** - NIK + PIN login
- **Account Activation** - Setup PIN untuk user baru
- **Face Enrollment** - Registrasi wajah dengan camera
- **Main Dashboard** - Status absensi dan quick actions
- **Clock In** - Absensi masuk dengan foto dan lokasi
- **Clock Out** - Absensi keluar dengan work summary
- **Location Services** - Radius check 100m dari kantor
- **Session Management** - Persistent login state

### 🚧 To Be Implemented
- **Attendance History** - Riwayat absensi dengan filter
- **Profile Screen** - Informasi karyawan dan statistik
- **Settings Screen** - Change PIN, face re-enrollment
- **Face Recognition** - ML Kit integration untuk verifikasi
- **Offline Mode** - Local storage untuk data sementara

## 🏗️ Architecture

```
app/
├── src/main/java/com/fleur/attendance/
│   ├── data/
│   │   ├── api/           # API configuration & service
│   │   └── model/         # Data models & responses
│   ├── ui/
│   │   ├── splash/        # Splash screen
│   │   ├── auth/          # Login, activation, face enrollment
│   │   ├── main/          # Dashboard
│   │   ├── attendance/    # Clock in/out, history
│   │   ├── profile/       # User profile
│   │   └── settings/      # App settings
│   └── utils/             # Utilities & helpers
└── src/main/res/
    ├── layout/            # XML layouts
    ├── drawable/          # Icons & graphics
    ├── values/            # Colors, strings, styles
    └── menu/              # Navigation menus
```

## 🎨 Design System

### Color Palette
- **Primary Brown**: `#A67C52`
- **Dark Background**: `#1A1D20`
- **Dark Surface**: `#212529`
- **Text Primary**: `#FFFFFF`
- **Success Green**: `#10B981`
- **Error Red**: `#EF4444`

### Typography
- **Headers**: Sans-serif Medium, 24sp
- **Body**: Sans-serif Regular, 14sp
- **Buttons**: Sans-serif Medium, 16sp

## 🔧 API Integration

### Base URLs
- **Development**: `http://192.168.1.102:3000/api/`
- **Emulator**: `http://10.0.2.2:3000/api/`
- **Production**: `https://api.fleuratelier.com/api/`

### Key Endpoints
- `POST /check-nik` - Validasi NIK
- `POST /activate` - Aktivasi akun
- `POST /login` - Login dengan PIN
- `POST /face-enrollment` - Registrasi wajah
- `POST /clock-in` - Absensi masuk
- `GET /employee/{id}/profile` - Profil karyawan

## 📱 Screens Flow

```
Splash → Login → Check NIK → Activation → Face Enrollment → Dashboard
                     ↓
                 Dashboard → Clock In/Out → Success
                     ↓
                 Bottom Nav → Attendance History / Profile
```

## 🔒 Permissions

- `INTERNET` - API communication
- `ACCESS_FINE_LOCATION` - GPS location
- `CAMERA` - Photo capture
- `WRITE_EXTERNAL_STORAGE` - Photo storage

## 🚀 Getting Started

### Prerequisites
- Android Studio Arctic Fox or later
- Android SDK 24+ (Android 7.0)
- Backend API server running

### Setup
1. Clone repository
2. Open in Android Studio
3. Sync Gradle dependencies
4. Update API base URL in `ApiConfig.kt`
5. Run on device or emulator

### Build Variants
- **Debug**: Development with logging
- **Release**: Production optimized

## 📦 Dependencies

### Core
- **Material Components** - UI components
- **ConstraintLayout** - Flexible layouts
- **CardView** - Card UI elements

### Networking
- **Retrofit** - HTTP client
- **OkHttp** - Network interceptor
- **Gson** - JSON parsing

### Camera & Location
- **CameraX** - Camera functionality
- **Play Services Location** - GPS services
- **ML Kit** - Face detection (planned)

### Utilities
- **Glide** - Image loading
- **Dexter** - Permission handling

## 🧪 Testing

### Manual Testing
1. Install APK on device
2. Test login flow with valid NIK
3. Complete face enrollment
4. Test clock in with location
5. Verify API responses

### Test Accounts
- NIK: `1234567890123456`
- PIN: `1234` (after activation)

## 📋 TODO

### High Priority
- [ ] Implement ClockOutActivity
- [ ] Add face recognition verification
- [ ] Complete AttendanceHistoryActivity
- [ ] Add offline mode support

### Medium Priority
- [ ] Implement ProfileActivity
- [ ] Add SettingsActivity
- [ ] Improve error handling
- [ ] Add data validation

### Low Priority
- [ ] Add animations
- [ ] Implement dark/light theme toggle
- [ ] Add biometric authentication
- [ ] Performance optimizations

## 🐛 Known Issues

1. **Location Permission** - May need manual grant on some devices
2. **Camera Preview** - Rotation handling needs improvement
3. **Network Timeout** - Long API calls may timeout

## 📞 Support

- **Backend API**: Ready dan tested
- **Development Guide**: `ANDROID_DEVELOPMENT_GUIDE.md`
- **API Documentation**: `http://localhost:3000/api-docs`

## 📄 License

© 2026 Fleur Atelier d'artistes - Internal Use Only

---

**Happy Coding! 🚀📱**