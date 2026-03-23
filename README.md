# 🎓 AttendAI — Smart Attendance Management System

<div align="center">

![AttendAI Banner](https://img.shields.io/badge/AttendAI-Smart%20Attendance-blue?style=for-the-badge&logo=react)
![Version](https://img.shields.io/badge/Version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)

**A full-stack AI-powered attendance system with Face Recognition, Fingerprint (WebAuthn), Manual Form, and 6 AI/ML features.**

[Live](https://attend-ai-smart-attendance-system-1.onrender.com/) • [Report Bug](#) • [Request Feature](#)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [AI Features](#-ai-features)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

AttendAI is a modern, bilingual (Hindi + English) attendance management system built for schools and institutions. It supports three attendance methods — **Face Recognition**, **Fingerprint (WebAuthn)**, and **Manual Form** — along with 6 powerful AI/ML modules for advanced analytics.

---

## ✨ Features

### 🎯 Core Features
| Feature | Description |
|---|---|
| 👤 **Face Recognition** | Real-time face detection using face-api.js |
| 📸 **Photo Upload Attendance** | Mark attendance by uploading a student photo |
| 🖐 **Fingerprint (WebAuthn)** | Device biometric — Windows Hello / Touch ID / Android |
| 📝 **Manual Form** | Bulk attendance with Present/Late/Absent options |
| 📊 **Dashboard** | Live stats, charts, weekly analytics |
| 👨‍🎓 **Student Management** | Add, edit, delete students with photo upload |
| 📅 **Reports** | Daily & student-wise attendance reports with CSV export |
| 🔐 **JWT Authentication** | Secure login with role-based access (Admin/Teacher) |
| 🌐 **Bilingual UI** | Hindi + English throughout the interface |

### 🤖 AI/ML Features
| Feature | Technology |
|---|---|
| ⚠️ **Anomaly Detection** | Rule-based pattern analysis (5 detection rules) |
| 📈 **Attendance Prediction** | Exponential smoothing + linear trend + day-of-week bias |
| 😷 **Mask Detection** | Face landmark geometry heuristic |
| 👁 **Liveness Detection** | Blink count + nose tip motion tracking |
| 😊 **Emotion Tracking** | face-api.js expression model, 7 emotions, engagement score |
| 💬 **NLP Query Bot** | 17 intents, Hindi/English/Hinglish support |

---

## 🛠 Tech Stack

### Frontend
```
React 18          — UI framework
face-api.js       — Face recognition AI
react-webcam      — Camera access
recharts          — Charts and graphs
react-router-dom  — Navigation
axios             — HTTP client
react-hot-toast   — Notifications
react-icons       — Icons
```

### Backend
```
Node.js + Express — REST API server
MongoDB + Mongoose — Database
JWT               — Authentication
multer            — File uploads
bcryptjs          — Password hashing
moment.js         — Date handling
```

### Deployment
```
Render            — Backend + Frontend hosting (Free)
MongoDB Atlas     — Cloud database (Free tier)
GitHub            — Version control
```

---

## 📁 Project Structure

```
attendance-system/
├── 📄 README.md
├── 📄 package.json
│
├── 🖥️ backend/
│   ├── 📄 .env                    ← Environment variables
│   ├── 📄 package.json
│   ├── 📄 server.js               ← Main server file
│   ├── 📁 middleware/
│   │   └── auth.js                ← JWT middleware
│   ├── 📁 models/
│   │   ├── User.js                ← Admin/Teacher model
│   │   ├── Student.js             ← Student model
│   │   ├── Attendance.js          ← Attendance records
│   │   └── AnomalyLog.js          ← AI anomaly logs
│   ├── 📁 routes/
│   │   ├── auth.js                ← Login/Register APIs
│   │   ├── students.js            ← Student CRUD APIs
│   │   ├── attendance.js          ← Attendance APIs
│   │   ├── dashboard.js           ← Dashboard stats
│   │   ├── anomaly.js             ← AI anomaly detection
│   │   ├── prediction.js          ← AI attendance prediction
│   │   └── nlpQuery.js            ← NLP bot (17 intents)
│   └── 📁 uploads/                ← Student photos storage
│
└── ⚛️ frontend/
    ├── 📄 .env                    ← Local environment
    ├── 📄 .env.production         ← Production environment
    ├── 📄 package.json
    ├── 📄 .eslintrc.json
    ├── 📁 public/
    │   └── index.html
    └── 📁 src/
        ├── 📄 App.js
        ├── 📄 App.css
        ├── 📁 context/
        │   └── AuthContext.js     ← Auth state management
        ├── 📁 utils/
        │   └── api.js             ← Axios instance
        ├── 📁 components/
        │   ├── Layout.js          ← Sidebar + navigation
        │   ├── FaceAttendance.js  ← Face recognition
        │   ├── FaceEnrollModal.js ← Face enrollment
        │   ├── FingerprintAttendance.js
        │   ├── FingerprintEnrollModal.js
        │   ├── ManualAttendance.js
        │   ├── AnomalyDetection.js
        │   ├── AttendancePrediction.js
        │   ├── MaskLivenessDetection.js
        │   ├── EmotionTracking.js
        │   └── NLPQueryBot.js
        └── 📁 pages/
            ├── Login.js
            ├── Dashboard.js
            ├── AttendancePage.js
            ├── Students.js
            ├── Reports.js
            └── AIFeatures.js
```

---

## 🚀 Getting Started

### Prerequisites
```
Node.js >= 16.x
MongoDB (local) OR MongoDB Atlas account
Git
```

### Installation

**Step 1 — Clone the repository**
```bash
git clone https://github.com/YOUR-USERNAME/attendance-system.git
cd attendance-system
```

**Step 2 — Backend setup**
```bash
cd backend
npm install
```

**Step 3 — Create backend `.env` file**
```bash
# backend/.env
PORT=5000
MONGO_URI=mongodb://localhost:27017/attendance_db
JWT_SECRET=your_super_secret_key_here
NODE_ENV=development
```

**Step 4 — Frontend setup**
```bash
cd ../frontend
npm install --legacy-peer-deps
```

**Step 5 — Create frontend `.env` file**
```bash
# frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
GENERATE_SOURCEMAP=false
```

**Step 6 — Start both servers**
```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Runs on http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm start
# Runs on http://localhost:3000
```

**Step 7 — Create first admin account**
```
1. Open http://localhost:3000
2. Click "New Account / नया अकाउंट" tab
3. Fill in your details
4. Click "Account Banao / Create Account"
5. Login with your credentials
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/attendance_db` |
| `JWT_SECRET` | Secret key for JWT tokens | `your_secret_key` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.onrender.com` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `GENERATE_SOURCEMAP` | Disable source maps | `false` |

---

## 📡 API Documentation

### Authentication
```
POST   /api/auth/register     — Create first admin account
POST   /api/auth/login        — Login (returns JWT token)
GET    /api/auth/me           — Get current user profile
POST   /api/auth/add-user     — Add teacher/staff (auth required)
GET    /api/auth/users        — Get all users (auth required)
```

### Students
```
GET    /api/students                        — Get all students
POST   /api/students                        — Add new student
GET    /api/students/:id                    — Get single student
PUT    /api/students/:id                    — Update student
DELETE /api/students/:id                    — Deactivate student
POST   /api/students/:id/face-descriptor    — Enroll face
POST   /api/students/:id/fingerprint        — Enroll fingerprint
GET    /api/students/face/all-descriptors   — Get all face data
```

### Attendance
```
POST   /api/attendance/mark              — Mark single attendance
POST   /api/attendance/bulk             — Bulk attendance (whole class)
GET    /api/attendance/date/:date        — Get attendance by date
GET    /api/attendance/student/:id       — Student attendance history
GET    /api/attendance/today/summary     — Today's live summary
```

### Dashboard
```
GET    /api/dashboard/stats    — All dashboard statistics
```

### AI Routes
```
POST   /api/anomaly/run              — Run anomaly detection (all students)
GET    /api/anomaly                  — Get all anomalies
PATCH  /api/anomaly/:id/resolve      — Mark anomaly resolved
GET    /api/prediction/student/:id   — Predict student attendance
GET    /api/prediction/class-risk    — Class risk analysis
POST   /api/nlp/query                — NLP bot query
GET    /api/nlp/suggestions          — Get suggested queries
```

### Health Check
```
GET    /api/health    — Server health check (no auth required)
```

---

## 🤖 AI Features

### 1. Anomaly Detection
Detects 5 types of attendance anomalies:
- **Consecutive Absence** — 2+ days absent in a row
- **Late Pattern** — 30%+ days marked late
- **Sudden Drop** — 20%+ attendance drop recently
- **Irregular Check-in** — Check-in times with high variance
- **No Records** — Student with zero attendance records

### 2. Attendance Prediction
Uses exponential smoothing + linear trend analysis:
- Predicts next 7 days attendance probability
- Day-of-week bias adjustment
- Class-wide risk analysis
- At-risk student identification

### 3. Mask & Liveness Detection
Real-time camera analysis:
- Face landmark geometry for mask detection
- Blink detection for liveness check
- Anti-spoofing (photo/video rejection)

### 4. Emotion Tracking
Real-time facial expression analysis:
- 7 emotions: Happy, Sad, Angry, Surprised, Fearful, Disgusted, Neutral
- Engagement score calculation
- Session timeline visualization
- Radar chart for expression breakdown

### 5. NLP Query Bot
Natural language attendance queries with 17 intents:
```
"Aaj ki attendance kaisi hai?"
"Is Rahul present today?"
"Students below 75%"
"Kaun lagatar absent hai?"
"This month ka report"
"Best attendance students"
"Check anomalies"
... and 10 more intents
```
Supports: English, Hindi, Hinglish

---

## 🌐 Deployment

### Deploy on Render + MongoDB Atlas (Free)

#### Step 1 — MongoDB Atlas
```
1. Create account at mongodb.com/atlas
2. Create M0 FREE cluster
3. Add database user
4. Allow all IPs (0.0.0.0/0)
5. Copy connection string
```

#### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/attendance-system.git
git push -u origin main
```

#### Step 3 — Deploy Backend on Render
```
New Web Service → Connect GitHub repo
Root Directory: backend
Build Command:  npm install
Start Command:  npm start
Instance Type:  Free

Environment Variables:
PORT=5000
MONGO_URI=your_atlas_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=production
FRONTEND_URL=https://your-frontend.onrender.com
```

#### Step 4 — Deploy Frontend on Render
```
New Static Site → Connect GitHub repo
Root Directory:    frontend
Build Command:     npm install --legacy-peer-deps && npm run build
Publish Directory: build

Environment Variables:
REACT_APP_API_URL=https://your-backend.onrender.com/api
GENERATE_SOURCEMAP=false

Redirects/Rewrites:
Source: /*  →  Destination: /index.html  →  Action: Rewrite
```

#### Step 5 — Update CORS
Add your frontend URL to backend's `FRONTEND_URL` environment variable.

---

## 📸 Screenshots

### Dashboard
- Live attendance stats
- Weekly bar chart
- Recent activity feed
- Method breakdown (Face/Fingerprint/Manual)

### Attendance Methods
- **Face Recognition** — Camera scan + Photo upload
- **Fingerprint** — WebAuthn device biometric
- **Manual Form** — Bulk class attendance with color-coded rows

### Students Page
- Student table with biometric enrollment status
- Face enrollment modal with camera
- Fingerprint enrollment modal
- Photo preview in add/edit form

### AI Features
- Anomaly detection cards with severity badges
- Attendance prediction charts
- Emotion tracking radar chart
- NLP bot with quick action chips

---

## 🔧 Troubleshooting

### Frontend Issues

**`Module not found: Can't resolve 'fs'`**
```bash
# Delete node_modules and reinstall
cd frontend
rm -rf node_modules
npm install --legacy-peer-deps
```

**`Compiled with warnings` on build**
```bash
# Use CI=false in build command
npm run build  # Already set to CI=false in package.json
```

**Face models not loading**
```
Models load from GitHub CDN automatically
Requires internet connection on first load
Browser caches models after first load
```

### Backend Issues

**`MongoDB connection error`**
```
1. Check MONGO_URI in .env file
2. Verify IP whitelist in MongoDB Atlas (0.0.0.0/0)
3. Check username/password in connection string
```

**`Registration/Login failed` on deployed site**
```
1. Check REACT_APP_API_URL in frontend environment
2. Verify backend is running: /api/health endpoint
3. Check CORS — FRONTEND_URL in backend env vars
4. Open browser Console (F12) for specific error
```

**`Port already in use`**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill
```

### Render Deployment Issues

**`Build failed`**
```
1. Check build logs in Render dashboard
2. Ensure build command: npm install --legacy-peer-deps && npm run build
3. Check all environment variables are set
```

**`Backend sleeping (slow first request)`**
```
Free Render plan sleeps after 15 min inactivity
First request takes 30-60 seconds to wake up
Upgrade to paid plan for always-on service
```

**`WebAuthn not working`**
```
WebAuthn requires HTTPS — works automatically on Render
On localhost it works on http://localhost only
```

---

## 📦 NPM Scripts

### Backend
```bash
npm start       # Start production server
npm run dev     # Start with nodemon (auto-restart)
```

### Frontend
```bash
npm start       # Start development server
npm run build   # Build for production (CI=false)
npm test        # Run tests
```

---

## 🔐 Security Notes

- JWT tokens expire after 7 days
- Passwords hashed with bcrypt (salt rounds: 12)
- Biometric data (fingerprint) never stored — only credential ID
- Face descriptors stored as 128-dimensional vectors
- MongoDB Atlas IP whitelist for database security
- Change default JWT_SECRET in production

---

## 📱 Browser Support

| Browser | Face Recognition | Fingerprint | Manual |
|---|---|---|---|
| Chrome 80+ | ✅ | ✅ | ✅ |
| Firefox 75+ | ✅ | ✅ | ✅ |
| Edge 80+ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ (Touch ID) | ✅ |
| Mobile Chrome | ✅ | ✅ | ✅ |

---

## 🤝 Contributing

```
1. Fork the repository
2. Create feature branch: git checkout -b feature/AmazingFeature
3. Commit changes: git commit -m 'Add AmazingFeature'
4. Push to branch: git push origin feature/AmazingFeature
5. Open Pull Request
```

---

## 📄 License

Distributed under the MIT License.

---

## 👨‍💻 Author

**AttendAI** — Built with ❤️ using React, Node.js, MongoDB and face-api.js

---

## 🙏 Acknowledgements

- [face-api.js](https://github.com/justadudewhohacks/face-api.js) — Face recognition library
- [WebAuthn API](https://webauthn.io/) — Biometric authentication
- [MongoDB Atlas](https://mongodb.com/atlas) — Cloud database
- [Render](https://render.com) — Free hosting platform
- [recharts](https://recharts.org) — React charts library

---

<div align="center">

⭐ **Star this repo if you found it helpful!** ⭐

</div>
