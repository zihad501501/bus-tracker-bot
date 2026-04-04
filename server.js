const express = require('express');
const axios = require('axios');

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

app.get('/', (req, res) => {
  res.json({
    status: '🚌 Bus Tracker Bot is running!',
    location: latestLocation.lat ? `${latestLocation.lat}, ${latestLocation.lng}` : 'No location yet',
    lastUpdate: latestLocation.timestamp || 'Never',
  });
});
app.get('/track', (req, res) => {
  res.redirect('/');
});
app.listen(CONFIG.PORT, () => console.log(`🤖 Bot running on port ${CONFIG.PORT}`));
