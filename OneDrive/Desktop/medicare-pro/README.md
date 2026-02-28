# 🏥 MediCare Pro — Hospital Management System
### PostgreSQL Edition — Ready for Render Deployment

---

## 🚀 Quick Start (Local)

### 1. Install dependencies
```bash
npm install
```

### 2. Setup PostgreSQL database
```bash
psql -U postgres -c "CREATE DATABASE medicare_pro;"
psql -U postgres -d medicare_pro -f database/schema.sql
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your DB credentials
```

### 4. Run
```bash
npm start
# → http://localhost:3000
```

**Default login:** `admin@medicare.com` / `Admin@123`  
⚠️ **Change the password after first login!**

---

## ☁️ Deploy to Render (Free)

### Step 1 — Create PostgreSQL on Render
1. Go to [render.com](https://render.com) → New → PostgreSQL
2. Name: `medicare-db`, Plan: Free → Create
3. Wait for it to deploy, then copy **"External Database URL"**

### Step 2 — Run schema on Render DB
```bash
psql YOUR_EXTERNAL_DATABASE_URL -f database/schema.sql
```

### Step 3 — Create Web Service on Render
1. New → Web Service → connect your GitHub repo
2. Build Command: `npm install`
3. Start Command: `node backend/server.js`

### Step 4 — Set Environment Variables on Render
In your web service → Environment tab, add:
```
DATABASE_URL   = (paste External Database URL from Step 1)
JWT_SECRET     = (generate a long random string)
NODE_ENV       = production
PORT           = 3000
APP_URL        = https://your-service-name.onrender.com
```

### Step 5 — Deploy!
Push to GitHub → Render auto-deploys.

---

## 🔔 Enable Push Notifications (Optional, 100% Free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Project Settings → Service Accounts → Generate new private key
3. Add to Render environment:
   ```
   FIREBASE_PROJECT_ID    = your-project-id
   FIREBASE_PRIVATE_KEY   = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL  = firebase-adminsdk-xxxx@....iam.gserviceaccount.com
   ```

---

## 🔑 API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | /api/auth/login | – | Staff login |
| GET | /api/patients | Staff | List patients |
| POST | /api/patients | Staff | Register patient |
| GET | /api/appointments | Staff | List appointments |
| POST | /api/appointments | Staff | Schedule appointment |
| GET | /api/reports | Any | List reports |
| GET | /api/reports/:id/pdf | Any | Download report PDF |
| POST | /api/reports | Staff | Create report |
| GET | /api/bills | Any | List bills |
| GET | /api/bills/:id/pdf | Any | Download invoice PDF |
| POST | /api/bills | Staff | Create bill |
| POST | /api/bills/:id/payment | Staff | Record payment |
| POST | /api/patients/portal/login | – | Patient login |

---

## 💡 Features
- Patient registration with auto-generated IDs (MED1001, MED1002…)
- Appointment scheduling with status tracking
- Medical reports with PDF generation
- Itemized billing with PDF invoices
- Patient self-service portal (view records, download PDFs)
- Firebase push notifications (optional)
- JWT authentication for staff and patients
