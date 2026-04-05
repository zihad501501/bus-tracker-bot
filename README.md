# bus-tracker-bot
# 🚌 Bus tracker bot - Live GPS Tracker Bot

A real-time bus location tracking system that uses your Android phone as a GPS tracker and serves live location through a beautiful webpage. Built with Node.js, GPSLogger, and deployed free on Render.com.

---

## 📱 How It Works

```
Android Phone (GPSLogger) → Render.com Server → Passengers open tracking webpage
```

1. **GPSLogger** app on the bus driver's phone sends GPS location to your server every 30 seconds
2. **Server** stores the latest location and serves it via a webpage
3. **Passengers** open the tracking link to see live bus location with place name

---

## 🌟 Features

- 📍 Real-time GPS location with place name (e.g. "Madaiha, Chandina, Cumilla")
- 🚀 Speed display in km/h
- 🕐 Last updated time
- 🗺️ Google Maps button for exact pin
- 📱 Mobile-friendly tracking webpage
- 🔄 Auto-refreshes every 30 seconds
- 💬 Facebook Messenger webhook ready
- 🆓 100% free to run

---

## 💰 Cost

| Item | Cost |
|---|---|
| Render.com hosting | Free |
| GPSLogger app | Free |
| Tracking webpage | Free |
| SIM data (if using dedicated device) | ~200-300 BDT/month |
| **Total** | **Nearly free!** |

---

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **GPS:** GPSLogger Android app (HTTP)
- **Geocoding:** OpenStreetMap Nominatim (free, no API key)
- **Hosting:** Render.com (free tier)
- **Messenger:** Facebook Messenger Webhook API

---

## 📋 Prerequisites

- Android phone (for GPS tracking)
- GitHub account
- Render.com account (free)
- Facebook Page + Meta Developer account (for Messenger bot)
- Facebook app **published** with `pages_messaging` permission approved

---

## 🚀 Complete Deployment Guide (A to Z)

---

### PHASE 1: Set Up GPS Tracking App

#### Step 1: Install GPSLogger
1. Open **Google Play Store** on your Android phone
2. Search for **"GPSLogger for Android"** by **mendhak**
3. Install it ✅

#### Step 2: Configure GPSLogger
1. Open GPSLogger
2. Tap **☰ menu** → **"Log to custom URL"**
3. Turn it **ON** ✅
4. Set **URL** to *(add your Render URL after deployment)*:
   ```
   https://YOUR-RENDER-URL.onrender.com/gps?lat=%LAT&lng=%LON&speed=%SPD
   ```
5. Set **HTTP Method** → **GET**
6. Go to **Performance** → set **"Time before logging"** → **30 seconds**
7. Tap back and tap **START LOGGING** ✅

---

### PHASE 2: Set Up Facebook Page & Meta Developer App

#### Step 3: Create Facebook Page
1. Go to **facebook.com**
2. Tap ☰ menu → **"Pages"** → **"Create"**
3. Name: e.g. `Bus Cumilla Tracker`
4. Category: `Transportation`
5. Click **"Create Page"** ✅

#### Step 4: Create Meta Developer Account
1. Go to **developers.facebook.com**
2. Click **"Get Started"** → log in with Facebook
3. Accept terms → **"Complete Registration"** ✅

#### Step 5: Create Meta App
1. Click **"My Apps"** → **"Create App"**
2. Select **"Other"** → Next
3. Select **"Business"** → Next
4. App name: `Bus Tracker Bot`
5. Click **"Create App"** ✅

#### Step 6: Add Messenger to App
1. Inside app dashboard → find **"Use cases"**
2. Click **"Business messaging"**
3. Select **"Engage with customers on Messenger from Meta"** ✅
4. Click **Next** → skip business portfolio → **Next**
5. Click **"Create App"** ✅

#### Step 7: Get Page Access Token
1. Go to **Use cases** → **Customize** → **Messenger API Settings**
2. Scroll to **"Generate access tokens"**
3. Click **"Generate"** next to your page
4. **Copy and save this token** (starts with `EAAB...`) ⚠️

---

### PHASE 3: Deploy to GitHub & Render

#### Step 8: Upload Code to GitHub
1. Go to **github.com** → sign in
2. Click **"+"** → **"New repository"**
3. Name: `bus-tracker-bot`
4. Set to **Public** → tick **"Add README"**
5. Click **"Create repository"**
6. Click **"Add file"** → **"Upload files"**
7. Upload **server.js** and **package.json**
8. Make sure files are named exactly:
   - `server.js` ✅ (not `server (1).js`)
   - `package.json` ✅
9. Click **"Commit changes"** ✅

#### Step 9: Deploy on Render.com
1. Go to **render.com** → sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Select your **bus-tracker-bot** repository
4. Fill in settings:
   - **Name:** `bus-tracker-bot`
   - **Region:** Singapore (Southeast Asia)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free ✅
5. Scroll to **"Environment Variables"** → add:
   - `PAGE_ACCESS_TOKEN` = your token from Step 7
   - `VERIFY_TOKEN` = `my_bus_bot_verify_token`
   - `NODE_ENV` = `production`
6. Click **"Deploy Web Service"** 🚀
7. Wait 2-3 minutes → status shows **"Live"** ✅
8. **Save your Render URL** (e.g. `https://bus-tracker-bot-2jwa.onrender.com`)

---

### PHASE 4: Connect Everything

#### Step 10: Update GPSLogger URL
1. Open **GPSLogger** on your phone
2. Go to **"Log to custom URL"** settings
3. Update URL with your real Render URL:
   ```
   https://YOUR-RENDER-URL.onrender.com/gps?lat=%LAT&lng=%LON&speed=%SPD
   ```
4. Save and make sure logging is **ON** ✅

#### Step 11: Connect Facebook Webhook
1. Go to **developers.facebook.com** → your app
2. Go to **Use cases** → **Customize** → **Messenger API Settings**
3. Scroll to **"Configure webhooks"** → click **"Edit"**
4. Enter:
   - **Callback URL:** `https://YOUR-RENDER-URL.onrender.com/webhook`
   - **Verify Token:** `my_bus_bot_verify_token`
5. **Wake up server first** by opening your Render URL in browser
6. Click **"Verify and Save"** ✅
7. Scroll to **"Generate access tokens"** → click **"Add Subscriptions"**
8. Tick **`messages`** and **`messaging_postbacks`** ✅
9. Click **"Save"** ✅

#### Step 12: Publish Your App
1. Go to **App settings** → add Privacy Policy URL:
   ```
   https://YOUR-RENDER-URL.onrender.com/track
   ```
2. Go to **"Publish"** → click **"Publish App"** ✅

> ⚠️ Note: Full Messenger bot functionality requires Meta App Review approval for `pages_messaging` permission. This requires business verification. While waiting, use the tracking webpage and Facebook auto-reply instead.

---

### PHASE 5: Set Up Facebook Auto-Reply (Works Immediately!)

#### Step 13: Enable Instant Reply
1. Go to your Facebook Page
2. Click **"Inbox"** → **"Automations"**
3. Click **"Instant reply"** → turn **ON**
4. Edit message:
   ```
   🚌 Bus Cumilla Live Tracker!
   
   See where the bus is right now:
   https://YOUR-RENDER-URL.onrender.com/track
   
   Tap the link to see live location! 📍
   ```
5. Click **"Save"** ✅

---

### PHASE 6: Test Everything

#### Step 14: Test GPS
Open in browser:
```
https://YOUR-RENDER-URL.onrender.com/gps?lat=23.460&lng=91.187&speed=0
```
Should return:
```json
{"status":"ok","location":{...}}
```

#### Step 15: Test Tracking Page
Open in browser:
```
https://YOUR-RENDER-URL.onrender.com/track
```
Should show beautiful tracking page with location! ✅

#### Step 16: Test Messenger
Message your Facebook Page with `location` → should get auto-reply with tracking link ✅

---

## 📁 File Structure

```
bus-tracker-bot/
├── server.js        # Main server (GPS receiver + Messenger bot + tracking page)
├── package.json     # Dependencies
└── README.md        # This file
```

---

## 🔑 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token | `EAAB...` |
| `VERIFY_TOKEN` | Webhook verify token | `my_bus_bot_verify_token` |
| `PORT` | Server port (auto-set by Render) | `3000` |
| `NODE_ENV` | Environment | `production` |

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check + location status |
| `/gps` | GET | Receive GPS from GPSLogger |
| `/track` | GET | Beautiful passenger tracking page |
| `/api/location` | GET | Raw location JSON |
| `/webhook` | GET | Facebook webhook verification |
| `/webhook` | POST | Receive Facebook messages |

---

## 📱 GPSLogger URL Format

```
https://YOUR-SERVER.onrender.com/gps?lat=%LAT&lng=%LON&speed=%SPD
```

| Parameter | Description |
|---|---|
| `%LAT` | Latitude (auto-filled by GPSLogger) |
| `%LON` | Longitude (auto-filled by GPSLogger) |
| `%SPD` | Speed in km/h (auto-filled by GPSLogger) |

---

## 💬 Messenger Keywords

Users can send any of these to get bus location:
- `location`
- `where`
- `bus`
- `কোথায়` (Bengali)
- `লোকেশন` (Bengali)
- `বাস` (Bengali)

---

## ⚠️ Known Limitations

- **Render free tier** spins down after 15 mins inactivity (wakes in ~50 seconds)
- **Messenger bot** requires Meta App Review approval for public use
- **Location resets** when server restarts (use a database for persistence)
- **GPSLogger** needs mobile data or WiFi to send location

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| Server shows "No location yet" | Check GPSLogger URL is correct and logging is ON |
| Webhook verification fails | Wake server first by opening Render URL in browser |
| Bot not replying | Check PAGE_ACCESS_TOKEN in Render environment variables |
| Wrong place name | OpenStreetMap may not have your area mapped yet |
| Server crashed | Check Render logs for errors |

---

## 🌍 Built For

This project was built for local bus tracking in the **all region of Bangladesh** 🇧🇩

---

## 📄 License

Free to use for personal and community projects.

---

## 🙏 Credits

- [GPSLogger](https://github.com/mendhak/gpslogger) - Android GPS logging app
- [OpenStreetMap Nominatim](https://nominatim.org/) - Free geocoding
- [Render.com](https://render.com) - Free hosting
- [Express.js](https://expressjs.com/) - Web framework
