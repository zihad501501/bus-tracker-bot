const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

const CONFIG = {
  VERIFY_TOKEN: process.env.VERIFY_TOKEN || 'my_bus_bot_verify_token',
  PAGE_ACCESS_TOKEN: process.env.PAGE_ACCESS_TOKEN || '',
  PORT: process.env.PORT || 3000,
};

let latestLocation = {
  lat: null,
  lng: null,
  speed: 0,
  timestamp: null,
};

// GPS endpoint - receives from GPSLogger app
app.get('/gps', (req, res) => {
  const { lat, lng, speed } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing lat or lng' });
  latestLocation = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    speed: parseFloat(speed) || 0,
    timestamp: new Date().toISOString(),
  };
  console.log('📍 Location received:', latestLocation);
  res.json({ status: 'ok', location: latestLocation });
});

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === CONFIG.VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive messages
app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    body.entry.forEach((entry) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;
      if (event.message && event.message.text) {
        const text = event.message.text.toLowerCase().trim();
        console.log(`💬 Message: ${text}`);
        const locationKeywords = ['location', 'where', 'bus', 'কোথায়', 'লোকেশন', 'বাস'];
        if (locationKeywords.some(kw => text.includes(kw))) {
          sendLocationReply(senderId);
        } else {
          sendTextMessage(senderId, '🚌 Bus Tracker Bot\n\nType "location" to get bus location!\nবাসের অবস্থান জানতে "location" লিখুন।');
        }
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

async function getPlaceName(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
    const response = await axios.get(url, { headers: { 'User-Agent': 'BusTrackerBot/1.0' }, timeout: 5000 });
    const addr = response.data.address;
    if (!addr) return null;
    const parts = [];
    if (addr.village) parts.push(addr.village);
    else if (addr.suburb) parts.push(addr.suburb);
    else if (addr.neighbourhood) parts.push(addr.neighbourhood);
    else if (addr.hamlet) parts.push(addr.hamlet);
    else if (addr.road) parts.push(addr.road);
    if (addr.town) parts.push(addr.town);
    else if (addr.city) parts.push(addr.city);
    else if (addr.county) parts.push(addr.county);
    if (addr.state_district) parts.push(addr.state_district);
    else if (addr.state) parts.push(addr.state);
    return parts.length > 0 ? parts.join(', ') : null;
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return null;
  }
}

async function sendLocationReply(senderId) {
  if (!latestLocation.lat || !latestLocation.lng) {
    return sendTextMessage(senderId, '⚠️ No location data yet.\n\nএখনো কোনো লোকেশন পাওয়া যায়নি।');
  }
  const { lat, lng, speed, timestamp } = latestLocation;
  const time = new Date(timestamp).toLocaleTimeString('en-BD', { timeZone: 'Asia/Dhaka' });
  const placeName = await getPlaceName(lat, lng);
  const message = placeName
    ? `🚌 Bus is here:\n📍 ${placeName}\n\n🚀 Speed: ${speed} km/h\n🕐 Updated: ${time}`
    : `🚌 Bus is here:\n📍 Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}\n\n🚀 Speed: ${speed} km/h\n🕐 Updated: ${time}`;
  await sendTextMessage(senderId, message);
}

async function sendTextMessage(recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${CONFIG.PAGE_ACCESS_TOKEN}`,
      { recipient: { id: recipientId }, message: { text } }
    );
    console.log(`✅ Message sent to ${recipientId}`);
  } catch (err) {
    console.error('❌ Send error:', err.response?.data || err.message);
  }
}

// API endpoint for location data
app.get('/api/location', (req, res) => {
  res.json(latestLocation);
});

// Beautiful tracking page for passengers
app.get('/track', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bus Cumilla - Live Tracker</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f4f8; min-height: 100vh; }
  .header { background: #1a73e8; color: white; padding: 20px 16px 24px; text-align: center; }
  .header h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
  .header p { font-size: 13px; opacity: 0.85; }
  .status-bar { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; animation: pulse 2s infinite; }
  .dot.offline { background: #f87171; animation: none; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .status-text { font-size: 13px; opacity: 0.9; }
  .content { padding: 16px; max-width: 480px; margin: 0 auto; }
  .card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .card-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .place-name { font-size: 22px; font-weight: 600; color: #111827; line-height: 1.3; }
  .place-name.loading { color: #9ca3af; font-weight: 400; font-size: 16px; }
  .updated { font-size: 13px; color: #6b7280; margin-top: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .metric-card { background: white; border-radius: 16px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); text-align: center; }
  .metric-value { font-size: 28px; font-weight: 700; color: #1a73e8; }
  .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .maps-btn { display: block; background: #1a73e8; color: white; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 500; margin-bottom: 12px; }
  .maps-btn:active { opacity: 0.85; }
  .refresh-btn { display: block; width: 100%; background: white; border: 1.5px solid #e5e7eb; color: #374151; padding: 12px; border-radius: 12px; font-size: 14px; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .refresh-btn:active { background: #f9fafb; }
  .share-card { background: #eff6ff; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
  .share-label { font-size: 12px; color: #3b82f6; margin-bottom: 6px; }
  .share-url { font-size: 13px; color: #1e40af; word-break: break-all; font-weight: 500; }
  .no-location { text-align: center; padding: 24px; color: #6b7280; }
  .no-location .icon { font-size: 40px; margin-bottom: 12px; }
  .no-location p { font-size: 14px; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #e5e7eb; border-top-color: #1a73e8; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="header">
  <h1>🚌 Bus Cumilla</h1>
  <p>Live Location Tracker</p>
  <div class="status-bar">
    <div class="dot" id="dot"></div>
    <span class="status-text" id="status-text">Connecting...</span>
  </div>
</div>

<div class="content">
  <div id="main-content">
    <div class="card">
      <div class="card-label">Current Location</div>
      <div class="place-name loading" id="place-name">Loading...</div>
      <div class="updated" id="updated"></div>
    </div>

    <div class="grid">
      <div class="metric-card">
        <div class="metric-value" id="speed">--</div>
        <div class="metric-label">Speed (km/h)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" id="mins">--</div>
        <div class="metric-label">Mins ago</div>
      </div>
    </div>

    <a id="maps-btn" class="maps-btn" href="#" style="display:none;">📍 Open in Google Maps</a>

    <button class="refresh-btn" onclick="fetchLocation()">
      <span id="spinner" class="spinner" style="display:none;"></span>
      Refresh location
    </button>
  </div>

  <div class="share-card" style="margin-top:12px;">
    <div class="share-label">Share this link with passengers</div>
    <div class="share-url">https://bus-tracker-bot-2jwa.onrender.com/track</div>
  </div>
</div>

<script>
async function getPlaceName(lat, lng) {
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&accept-language=en', {
      headers: { 'User-Agent': 'BusTrackerPage/1.0' }
    });
    const d = await r.json();
    const a = d.address;
    if (!a) return null;
    const parts = [];
    if (a.village) parts.push(a.village);
    else if (a.suburb) parts.push(a.suburb);
    else if (a.neighbourhood) parts.push(a.neighbourhood);
    else if (a.hamlet) parts.push(a.hamlet);
    else if (a.road) parts.push(a.road);
    if (a.town) parts.push(a.town);
    else if (a.city) parts.push(a.city);
    else if (a.county) parts.push(a.county);
    if (a.state_district) parts.push(a.state_district);
    else if (a.state) parts.push(a.state);
    return parts.join(', ') || null;
  } catch(e) { return null; }
}

function minsAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (diff < 1) return '<1';
  return diff;
}

async function fetchLocation() {
  document.getElementById('spinner').style.display = 'inline-block';
  try {
    const r = await fetch('/api/location');
    const d = await r.json();
    document.getElementById('spinner').style.display = 'none';

    if (!d.lat) {
      document.getElementById('dot').className = 'dot offline';
      document.getElementById('status-text').textContent = 'Waiting for GPS...';
      document.getElementById('place-name').textContent = 'No location yet';
      document.getElementById('place-name').className = 'place-name loading';
      document.getElementById('updated').textContent = 'GPS tracker not connected';
      document.getElementById('speed').textContent = '--';
      document.getElementById('mins').textContent = '--';
      return;
    }

    document.getElementById('dot').className = 'dot';
    document.getElementById('status-text').textContent = 'Live';
    document.getElementById('speed').textContent = Math.round(d.speed || 0);
    document.getElementById('mins').textContent = minsAgo(d.timestamp);

    const time = new Date(d.timestamp).toLocaleTimeString('en-BD', { timeZone: 'Asia/Dhaka' });
    document.getElementById('updated').textContent = 'Updated at ' + time;

    const mapsBtn = document.getElementById('maps-btn');
    mapsBtn.style.display = 'block';
    mapsBtn.href = 'https://maps.google.com/?q=' + d.lat + ',' + d.lng;

    document.getElementById('place-name').className = 'place-name loading';
    document.getElementById('place-name').textContent = 'Getting place name...';
    const place = await getPlaceName(d.lat, d.lng);
    document.getElementById('place-name').className = 'place-name';
    document.getElementById('place-name').textContent = place || (d.lat.toFixed(4) + ', ' + d.lng.toFixed(4));
  } catch(e) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('dot').className = 'dot offline';
    document.getElementById('status-text').textContent = 'Server offline';
    document.getElementById('place-name').textContent = 'Cannot connect to server';
  }
}

fetchLocation();
setInterval(fetchLocation, 30000);
</script>
</body>
</html>`);
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '🚌 Bus Tracker Bot is running!',
    location: latestLocation.lat ? latestLocation.lat + ', ' + latestLocation.lng : 'No location yet',
    speed: latestLocation.speed,
    lastUpdate: latestLocation.timestamp || 'Never',
  });
});

app.listen(CONFIG.PORT, () => console.log('🤖 Bot running on port ' + CONFIG.PORT));
