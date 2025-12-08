# NFC Reader Integration Guide

## Overview

This document provides complete integration instructions for NFC reader hardware to connect with the NFC Attendance System. The system supports automatic check-in/check-out when employees tap their NFC cards on registered readers.

---

## System Architecture

```
┌─────────────┐      HTTP POST      ┌──────────────────┐      Database      ┌──────────┐
│ NFC Reader  │ ──────────────────> │  API Endpoints   │ ────────────────> │ Database │
│  Hardware   │  <──────────────── │  (Next.js API)   │ <──────────────── │ (Turso)  │
└─────────────┘      Response       └──────────────────┘      Query        └──────────┘
```

---

## API Endpoints

### Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

### Authentication
All API requests require a bearer token in the Authorization header:
```
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

## 1. Check-In API

### Endpoint
```
POST /api/attendance/checkin
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_AUTH_TOKEN
```

### Request Body
```json
{
  "tagUid": "NFC-001-A7K9M2X5",           // Required: NFC tag UID
  "readerId": "READER-001",                // Optional: Reader device ID
  "location": "Main Entrance",             // Optional: Physical location
  "idempotencyKey": "unique-key-123",     // Optional: For preventing duplicates
  "locationLatitude": -6.2088,            // Optional: GPS latitude
  "locationLongitude": 106.8456,          // Optional: GPS longitude
  "metadata": {                           // Optional: Additional data
    "readerVersion": "1.0.0",
    "firmwareVersion": "2.1.0"
  }
}
```

### Success Response (201 Created)
```json
{
  "id": 14,
  "employeeId": 1,
  "date": "2025-12-08",
  "timeIn": "2025-12-08T07:48:38.057Z",
  "timeOut": null,
  "duration": null,
  "status": "present",
  "checkInMethod": "nfc",
  "readerId": "READER-001",
  "location": "Main Entrance",
  "tagUid": "NFC-001-A7K9M2X5",
  "employee": {
    "id": 1,
    "name": "Sarah Johnson",
    "email": "sarah.johnson@company.com",
    "department": "Engineering",
    "photoUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
  },
  "message": "Check-in successful"
}
```

### Already Checked In Response (200 OK)
```json
{
  "id": 14,
  "employeeId": 1,
  "date": "2025-12-08",
  "timeIn": "2025-12-08T07:48:38.057Z",
  "employee": {
    "name": "Sarah Johnson"
  },
  "message": "Already checked in today"
}
```

### Error Responses

**400 Bad Request - Tag Not Found**
```json
{
  "error": "NFC tag not found",
  "code": "TAG_NOT_FOUND"
}
```

**400 Bad Request - Tag Inactive**
```json
{
  "error": "NFC tag is not active",
  "code": "TAG_INACTIVE"
}
```

**400 Bad Request - Tag Not Assigned**
```json
{
  "error": "NFC tag is not assigned to any employee",
  "code": "TAG_NOT_ASSIGNED"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

---

## 2. Check-Out API

### Endpoint
```
POST /api/attendance/checkout
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_AUTH_TOKEN
```

### Request Body
```json
{
  "tagUid": "NFC-001-A7K9M2X5",      // Required: NFC tag UID
  "readerId": "READER-001",           // Optional: Reader device ID
  "location": "Main Exit"             // Optional: Physical location
}
```

### Success Response (200 OK)
```json
{
  "id": 14,
  "employeeId": 1,
  "date": "2025-12-08",
  "timeIn": "2025-12-08T07:48:38.057Z",
  "timeOut": "2025-12-08T17:30:45.027Z",
  "duration": 582,                     // Duration in minutes
  "status": "present",
  "checkInMethod": "nfc",
  "readerId": "READER-001",
  "location": "Main Exit",
  "tagUid": "NFC-001-A7K9M2X5",
  "employee": {
    "id": 1,
    "name": "Sarah Johnson",
    "email": "sarah.johnson@company.com",
    "department": "Engineering"
  }
}
```

### Error Responses

**404 Not Found - No Active Check-In**
```json
{
  "error": "No active check-in found for today",
  "code": "NO_ACTIVE_CHECKIN"
}
```

---

## 3. Tag Lookup API

Use this to verify tag enrollment before check-in/check-out.

### Endpoint
```
GET /api/enrollments/tag/{tagUid}
```

### Example
```
GET /api/enrollments/tag/NFC-001-A7K9M2X5
```

### Success Response (200 OK)
```json
{
  "id": 1,
  "tagUid": "NFC-001-A7K9M2X5",
  "employeeId": 1,
  "status": "active",
  "enrolledAt": "2024-02-01T00:00:00.000Z",
  "employee": {
    "id": 1,
    "name": "Sarah Johnson",
    "email": "sarah.johnson@company.com",
    "department": "Engineering",
    "status": "active"
  }
}
```

### Error Response (404 Not Found)
```json
{
  "error": "NFC tag not found",
  "code": "TAG_NOT_FOUND"
}
```

---

## 4. Reader Heartbeat API

Send periodic heartbeats to show reader is online.

### Endpoint
```
POST /api/readers/{id}/heartbeat
```

### Request Body
```json
{
  "status": "online",
  "ipAddress": "192.168.1.100",
  "firmwareVersion": "2.1.0"
}
```

### Success Response (200 OK)
```json
{
  "id": 1,
  "readerId": "READER-001",
  "location": "Main Entrance",
  "status": "online",
  "lastHeartbeat": "2025-12-08T07:50:00.000Z"
}
```

---

## Implementation Examples

### Python (Raspberry Pi)
```python
import requests
import time

API_BASE_URL = "http://localhost:3000"
AUTH_TOKEN = "your_bearer_token_here"
READER_ID = "READER-001"
LOCATION = "Main Entrance"

def check_in(tag_uid):
    """Send check-in request when NFC tag is detected"""
    url = f"{API_BASE_URL}/api/attendance/checkin"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }
    payload = {
        "tagUid": tag_uid,
        "readerId": READER_ID,
        "location": LOCATION,
        "idempotencyKey": f"{tag_uid}-{int(time.time())}"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        data = response.json()
        
        if response.status_code == 201:
            print(f"✓ Check-in successful: {data['employee']['name']}")
            return True
        elif response.status_code == 200:
            print(f"ℹ Already checked in: {data['employee']['name']}")
            return True
        else:
            print(f"✗ Error: {data.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"✗ Request failed: {str(e)}")
        return False

def check_out(tag_uid):
    """Send check-out request when NFC tag is detected"""
    url = f"{API_BASE_URL}/api/attendance/checkout"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }
    payload = {
        "tagUid": tag_uid,
        "readerId": READER_ID,
        "location": LOCATION
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        data = response.json()
        
        if response.status_code == 200:
            duration = data.get('duration', 0)
            print(f"✓ Check-out successful: {data['employee']['name']} ({duration} min)")
            return True
        else:
            print(f"✗ Error: {data.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"✗ Request failed: {str(e)}")
        return False

def send_heartbeat():
    """Send heartbeat to show reader is online"""
    url = f"{API_BASE_URL}/api/readers/1/heartbeat"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }
    payload = {
        "status": "online",
        "ipAddress": "192.168.1.100",
        "firmwareVersion": "1.0.0"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            print("✓ Heartbeat sent")
            return True
    except Exception as e:
        print(f"✗ Heartbeat failed: {str(e)}")
        return False

# Example: Main loop
def main():
    print(f"NFC Reader {READER_ID} starting...")
    print(f"Location: {LOCATION}")
    
    last_heartbeat = 0
    
    while True:
        # Send heartbeat every 60 seconds
        if time.time() - last_heartbeat > 60:
            send_heartbeat()
            last_heartbeat = time.time()
        
        # Simulate NFC tag detection
        # Replace this with actual NFC reader library
        tag_uid = detect_nfc_tag()  # Your NFC reading function
        
        if tag_uid:
            print(f"Tag detected: {tag_uid}")
            
            # Determine check-in or check-out based on your logic
            # Option 1: Always check-in (system handles duplicate)
            check_in(tag_uid)
            
            # Option 2: Toggle behavior
            # is_checked_in = check_current_status(tag_uid)
            # if is_checked_in:
            #     check_out(tag_uid)
            # else:
            #     check_in(tag_uid)
            
            time.sleep(2)  # Prevent multiple reads
        
        time.sleep(0.1)  # Polling interval

if __name__ == "__main__":
    main()
```

### Node.js (ESP32 / IoT Device)
```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your_bearer_token_here';
const READER_ID = 'READER-001';
const LOCATION = 'Main Entrance';

async function checkIn(tagUid) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance/checkin`,
      {
        tagUid,
        readerId: READER_ID,
        location: LOCATION,
        idempotencyKey: `${tagUid}-${Date.now()}`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );
    
    console.log(`✓ Check-in: ${response.data.employee.name}`);
    return true;
  } catch (error) {
    console.error('✗ Check-in failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function checkOut(tagUid) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance/checkout`,
      {
        tagUid,
        readerId: READER_ID,
        location: LOCATION
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );
    
    const duration = response.data.duration;
    console.log(`✓ Check-out: ${response.data.employee.name} (${duration} min)`);
    return true;
  } catch (error) {
    console.error('✗ Check-out failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function sendHeartbeat() {
  try {
    await axios.post(
      `${API_BASE_URL}/api/readers/1/heartbeat`,
      {
        status: 'online',
        ipAddress: '192.168.1.100',
        firmwareVersion: '1.0.0'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );
    console.log('✓ Heartbeat sent');
  } catch (error) {
    console.error('✗ Heartbeat failed:', error.message);
  }
}

// Send heartbeat every 60 seconds
setInterval(sendHeartbeat, 60000);

// Example: Handle NFC tag detection
function onTagDetected(tagUid) {
  console.log(`Tag detected: ${tagUid}`);
  checkIn(tagUid);
}
```

### Arduino (ESP32 with PN532)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiBaseUrl = "http://192.168.1.100:3000";
const char* authToken = "your_bearer_token_here";
const char* readerId = "READER-001";
const char* location = "Main Entrance";

PN532_I2C pn532i2c(Wire);
PN532 nfc(pn532i2c);

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  
  // Initialize NFC reader
  nfc.begin();
  nfc.SAMConfig();
  Serial.println("NFC Reader initialized");
}

void loop() {
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
  uint8_t uidLength;
  
  // Wait for an NFC card
  if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength)) {
    String tagUid = "NFC-";
    for (uint8_t i = 0; i < uidLength; i++) {
      tagUid += String(uid[i], HEX);
    }
    tagUid.toUpperCase();
    
    Serial.print("Tag detected: ");
    Serial.println(tagUid);
    
    checkIn(tagUid);
    
    delay(2000); // Prevent multiple reads
  }
  
  delay(100);
}

void checkIn(String tagUid) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(apiBaseUrl) + "/api/attendance/checkin";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + authToken);
    
    // Create JSON payload
    StaticJsonDocument<256> doc;
    doc["tagUid"] = tagUid;
    doc["readerId"] = readerId;
    doc["location"] = location;
    doc["idempotencyKey"] = tagUid + "-" + String(millis());
    
    String payload;
    serializeJson(doc, payload);
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
      
      if (httpCode == 201 || httpCode == 200) {
        Serial.println("✓ Check-in successful");
      }
    } else {
      Serial.println("✗ HTTP request failed");
    }
    
    http.end();
  }
}
```

---

## Reader Logic Options

### Option 1: Always Check-In (Recommended)
- Reader always calls check-in API
- System automatically handles:
  - If already checked in → returns existing record
  - If not checked in → creates new record
- Simple implementation

### Option 2: Smart Toggle
- Reader checks current status first
- Toggles between check-in and check-out
- Requires additional API call to check status

### Option 3: Dual Readers
- One reader for check-in (entrance)
- Another reader for check-out (exit)
- Each reader calls appropriate endpoint

---

## Best Practices

### 1. Idempotency
Always include `idempotencyKey` to prevent duplicate check-ins:
```json
{
  "idempotencyKey": "NFC-001-A7K9M2X5-1733648318"
}
```

### 2. Error Handling
- Implement retry logic with exponential backoff
- Cache failed requests and retry when connection restored
- Display appropriate feedback to users (LED, buzzer, display)

### 3. Offline Support
- Queue attendance records locally if API is unavailable
- Sync queued records when connection is restored
- Implement local timestamp to prevent time drift

### 4. Security
- Store auth tokens securely
- Use HTTPS in production
- Rotate tokens regularly
- Implement rate limiting

### 5. Heartbeat
- Send heartbeat every 60 seconds
- Update reader status to "offline" if heartbeat stops

### 6. User Feedback
Provide clear feedback to employees:
- ✅ Green LED + Beep: Success
- ❌ Red LED + Error Beep: Failed
- 🟡 Yellow LED: Already checked in
- Display employee name on screen

---

## Testing

### Test with cURL
```bash
# Check-in
curl -X POST http://localhost:3000/api/attendance/checkin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tagUid": "NFC-001-A7K9M2X5",
    "readerId": "READER-001",
    "location": "Main Entrance"
  }'

# Check-out
curl -X POST http://localhost:3000/api/attendance/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tagUid": "NFC-001-A7K9M2X5",
    "readerId": "READER-001",
    "location": "Main Exit"
  }'

# Verify tag
curl -X GET http://localhost:3000/api/enrollments/tag/NFC-001-A7K9M2X5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test with Postman
1. Import the API endpoints
2. Set authorization header with bearer token
3. Test check-in, check-out, and tag lookup
4. Verify responses match documentation

---

## Troubleshooting

### Issue: "Authentication required"
**Solution:** Ensure Authorization header is included with valid bearer token

### Issue: "NFC tag not found"
**Solution:** Tag must be enrolled in system first via web dashboard

### Issue: "NFC tag is not active"
**Solution:** Activate tag in enrollment management page

### Issue: "No active check-in found"
**Solution:** Employee must check in first before checking out

### Issue: Network timeout
**Solution:** Check reader network connection and API endpoint availability

---

## Support

For technical support or questions:
- **Documentation:** See main README.md
- **Database:** Access database studio in dashboard
- **API Testing:** Use provided test endpoints

---

## Hardware Recommendations

### Supported NFC Readers
- **PN532 NFC Module** (I2C/SPI/UART)
- **RC522 RFID Reader**
- **ACR122U USB NFC Reader**
- **Custom ESP32-based readers**

### Supported NFC Tags
- **MIFARE Classic 1K**
- **MIFARE Ultralight**
- **NTAG213/215/216**
- **ISO 14443A compatible tags**

---

**Last Updated:** December 8, 2024  
**API Version:** 1.0.0
