const express = require('express');
const net = require('net');
const axios = require('axios');

const app = express();
app.use(express.json());

// ==========================================
// CONFIGURATION - Change these values!
// ==========================================
const CONFIG = {
  VERIFY_TOKEN: 'my_bus_bot_verify_token',   // Any secret word you choose
  PAGE_ACCESS_TOKEN: 'YOUR_PAGE_ACCESS_TOKEN_HERE', // From Meta Developer dashboard
  PORT: process.env.PORT || 3000,
  GPS_PORT: process.env.GPS_PORT || 5000,    // Port GPS tracker sends data to
};

// ==========================================
// LOCATION STORAGE (in memory)
// ==========================================
let latestLocation = {
  lat: null,
  lng: null,
  speed: 0,
  timestamp: null,
};

// ==========================================
// GT06N GPS TRACKER SERVER (TCP)
// ==========================================
const gpsServer = net.createServer((socket) => {
  console.log('🚌 GPS Tracker connected:', socket.remoteAddress);

  socket.on('data', (data) => {
    try {
      const hex = data.toString('hex');
      console.log('📡 Raw GPS data:', hex);

      // GT06 protocol: starts with 7878 (short) or 7979 (long)
      if (hex.startsWith('7878') || hex.startsWith('7979')) {
        const msgType = parseInt(hex.substring(6, 8), 16); // Protocol number

        // Login packet (0x01) - send acknowledgment
        if (msgType === 0x01) {
          const response = Buffer.from('787801010001d9dc0d0a', 'hex');
          socket.write(response);
          console.log('✅ Login packet acknowledged');
        }

        // GPS Location packet (0x12)
        if (msgType === 0x12) {
          const location = parseGT06Location(hex);
          if (location) {
            latestLocation = {
              ...location,
              timestamp: new Date().toISOString(),
            };
            console.log('📍 Location updated:', latestLocation);

            // Send heartbeat response
            const serialNum = hex.substring(hex.length - 8, hex.length - 4);
            const response = Buffer.from(`787800120001${serialNum}0d0a`, 'hex');
            socket.write(response);
          }
        }

        // Heartbeat packet (0x13)
        if (msgType === 0x13) {
          const serialNum = hex.substring(hex.length - 8, hex.length - 4);
          const response = Buffer.from(`787800130001${serialNum}0d0a`, 'hex');
          socket.write(response);
          console.log('💓 Heartbeat received');
        }
      }
    } catch (err) {
      console.error('GPS parse error:', err.message);
    }
  });

  socket.on('error', (err) => console.error('GPS socket error:', err.message));
  socket.on('close', () => console.log('GPS tracker disconnected'));
});

// Parse GT06N location packet
function parseGT06Location(hex) {
  try {
    // GT06 GPS packet structure (short packet starting at byte 4)
    const offset = hex.startsWith('7878') ? 8 : 10;

    // Date/time (6 bytes)
    // const year = parseInt(hex.substring(offset, offset + 2), 16) + 2000;
    // const month = parseInt(hex.substring(offset + 2, offset + 4), 16);
    // const day = parseInt(hex.substring(offset + 4, offset + 6), 16);

    // GPS info byte
    const gpsInfoOffset = offset + 12;
    // const satellites = parseInt(hex.substring(gpsInfoOffset, gpsInfoOffset + 2), 16) & 0x0F;

    // Latitude (4 bytes)
    const latHex = hex.substring(gpsInfoOffset + 2, gpsInfoOffset + 10);
    const latRaw = parseInt(latHex, 16) / 1800000;

    // Longitude (4 bytes)
    const lngHex = hex.substring(gpsInfoOffset + 10, gpsInfoOffset + 18);
    const lngRaw = parseInt(lngHex, 16) / 1800000;

    // Speed
    const speed = parseInt(hex.substring(gpsInfoOffset + 18, gpsInfoOffset + 20), 16);

    // Course/flags byte
    const flags = parseInt(hex.substring(gpsInfoOffset + 20, gpsInfoOffset + 24), 16);
    const isNorth = (flags & 0x0400) !== 0;
    const isEast = (flags & 0x0800) !== 0;

    const lat = isNorth ? latRaw : -latRaw;
    const lng = isEast ? lngRaw : -lngRaw;

    // Validate coordinates
    if (lat === 0 && lng === 0) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { lat, lng, speed };
  } catch (e) {
    console.error('Location parse error:', e.message);
    return null;
  }
}

// Start GPS TCP server
gpsServer.listen(CONFIG.GPS_PORT, () => {
  console.log(`📡 GPS Server listening on TCP port ${CONFIG.GPS_PORT}`);
});

// ==========================================
// FACEBOOK MESSENGER WEBHOOK
// ==========================================

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
        console.log(`💬 Message from ${senderId}: ${text}`);

        // Respond to location requests
        const locationKeywords = ['location', 'where', 'bus', 'কোথায়', 'লোকেশন', 'বাস'];
        const isLocationRequest = locationKeywords.some(kw => text.includes(kw));

        if (isLocationRequest) {
          sendLocationReply(senderId);
        } else {
          sendTextMessage(senderId,
            '🚌 Bus Tracker Bot\n\nType "location" or "where is the bus" to get the current bus location!\n\nবাসের অবস্থান জানতে "location" লিখুন।'
          );
        }
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Reverse geocode: GPS coords → place name using OpenStreetMap (FREE)
async function getPlaceName(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'BusTrackerBot/1.0' }, // Required by Nominatim
      timeout: 5000,
    });

    const addr = response.data.address;
    if (!addr) return null;

    // Build place name from most specific to least specific
    // Example output: "Madaiha, Chandina, Cumilla"
    const parts = [];

    // Village / suburb / neighbourhood (most specific)
    if (addr.village) parts.push(addr.village);
    else if (addr.suburb) parts.push(addr.suburb);
    else if (addr.neighbourhood) parts.push(addr.neighbourhood);
    else if (addr.hamlet) parts.push(addr.hamlet);
    else if (addr.road) parts.push(addr.road);

    // Upazila / town / city
    if (addr.town) parts.push(addr.town);
    else if (addr.city) parts.push(addr.city);
    else if (addr.county) parts.push(addr.county);

    // District
    if (addr.state_district) parts.push(addr.state_district);
    else if (addr.state) parts.push(addr.state);

    return parts.length > 0 ? parts.join(', ') : null;
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return null;
  }
}

// Send location reply with place name
async function sendLocationReply(senderId) {
  if (!latestLocation.lat || !latestLocation.lng) {
    return sendTextMessage(senderId,
      '⚠️ No location data yet. The bus tracker may not be connected.\n\nএখনো কোনো লোকেশন পাওয়া যায়নি।'
    );
  }

  const { lat, lng, speed, timestamp } = latestLocation;
  const time = new Date(timestamp).toLocaleTimeString('en-BD', { timeZone: 'Asia/Dhaka' });

  // Get place name from coordinates
  const placeName = await getPlaceName(lat, lng);

  let message;
  if (placeName) {
    message =
      `🚌 Bus is here:\n` +
      `📍 ${placeName}\n\n` +
      `🚀 Speed: ${speed} km/h\n` +
      `🕐 Updated: ${time}`;
  } else {
    // Fallback if geocoding fails
    message =
      `🚌 Bus is here:\n` +
      `📍 Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}\n\n` +
      `🚀 Speed: ${speed} km/h\n` +
      `🕐 Updated: ${time}`;
  }

  await sendTextMessage(senderId, message);
}

// Send text message via Messenger API
async function sendTextMessage(recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${CONFIG.PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text },
      }
    );
    console.log(`✅ Message sent to ${recipientId}`);
  } catch (err) {
    console.error('❌ Send message error:', err.response?.data || err.message);
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: '🚌 Bus Tracker Bot is running!',
    location: latestLocation.lat
      ? `${latestLocation.lat}, ${latestLocation.lng}`
      : 'No location yet',
    lastUpdate: latestLocation.timestamp || 'Never',
  });
});

// Start HTTP server
app.listen(CONFIG.PORT, () => {
  console.log(`🤖 Messenger Bot running on port ${CONFIG.PORT}`);
  console.log(`🌐 Webhook URL: https://YOUR-RAILWAY-URL.railway.app/webhook`);
});
