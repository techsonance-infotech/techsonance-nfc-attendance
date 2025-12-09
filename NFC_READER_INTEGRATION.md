# NFC Reader Integration Guide

## Overview

This document provides complete integration instructions for NFC reader hardware to connect with the NFC Attendance System. The system uses **a single NFC reader** that automatically handles both check-in and check-out when employees tap their NFC cards.

---

## System Architecture

```
┌─────────────┐      HTTP POST      ┌──────────────────┐      Database      ┌──────────┐
│ NFC Reader  │ ──────────────────> │  Toggle API      │ ────────────────> │ Database │
│  (Single)   │  <──────────────── │  (Auto Detect)   │ <──────────────── │ (Turso)  │
└─────────────┘      Response       └──────────────────┘      Query        └──────────┘

Logic Flow:
Employee Taps Card → Check Status → Has Active Check-In Today?
                                    ├─ NO  → Record Time In
                                    └─ YES → Record Time Out + Calculate Duration
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

## 1. Toggle Attendance API (Recommended)

**This is the primary endpoint for single-reader implementations.**

### Endpoint
```
POST /api/attendance/toggle
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

### Success Response - Check-In (201 Created)
```json
{
  "action": "checkin",
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

### Success Response - Check-Out (200 OK)
```json
{
  "action": "checkout",
  "id": 14,
  "employeeId": 1,
  "date": "2025-12-08",
  "timeIn": "2025-12-08T07:48:38.057Z",
  "timeOut": "2025-12-08T17:30:45.027Z",
  "duration": 582,                     // Duration in minutes (9.7 hours)
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
  "message": "Check-out successful. Duration: 582 minutes"
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

## 2. Legacy Endpoints (Backward Compatibility)

These endpoints are maintained for backward compatibility but are not recommended for new implementations.

### Check-In API (Legacy)

#### Endpoint
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

## 3. Check-Out API (Legacy)

#### Endpoint
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

## 4. Tag Lookup API

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

## 5. Reader Heartbeat API

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

### Python (Raspberry Pi) - Single Reader Toggle

```python
import requests
import time

API_BASE_URL = "http://localhost:3000"
AUTH_TOKEN = "your_bearer_token_here"
READER_ID = "READER-001"
LOCATION = "Main Entrance"

def toggle_attendance(tag_uid):
    """
    Single function to handle both check-in and check-out.
    The API automatically determines the action based on current status.
    """
    url = f"{API_BASE_URL}/api/attendance/toggle"
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
        
        if response.status_code in [200, 201]:
            action = data.get('action', 'unknown')
            employee_name = data['employee']['name']
            
            if action == 'checkin':
                print(f"✓ CHECK-IN: {employee_name}")
                print(f"  Time: {data['timeIn']}")
                return True
            elif action == 'checkout':
                duration = data.get('duration', 0)
                hours = duration / 60
                print(f"✓ CHECK-OUT: {employee_name}")
                print(f"  Duration: {hours:.1f} hours ({duration} minutes)")
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
    print(f"Mode: Single Reader Toggle (Auto Check-In/Check-Out)")
    
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
            print(f"\n📱 Tag detected: {tag_uid}")
            toggle_attendance(tag_uid)
            
            time.sleep(2)  # Prevent multiple reads
        
        time.sleep(0.1)  # Polling interval

if __name__ == "__main__":
    main()
```

### Node.js (ESP32 / IoT Device) - Single Reader Toggle

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your_bearer_token_here';
const READER_ID = 'READER-001';
const LOCATION = 'Main Entrance';

async function toggleAttendance(tagUid) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance/toggle`,
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
    
    const { action, employee, duration } = response.data;
    
    if (action === 'checkin') {
      console.log(`✓ CHECK-IN: ${employee.name}`);
      console.log(`  Department: ${employee.department}`);
      return { success: true, action: 'checkin' };
    } else if (action === 'checkout') {
      const hours = (duration / 60).toFixed(1);
      console.log(`✓ CHECK-OUT: ${employee.name}`);
      console.log(`  Duration: ${hours} hours`);
      return { success: true, action: 'checkout', duration };
    }
    
  } catch (error) {
    console.error('✗ Toggle failed:', error.response?.data?.error || error.message);
    return { success: false, error: error.response?.data?.error };
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
async function onTagDetected(tagUid) {
  console.log(`\n📱 Tag detected: ${tagUid}`);
  const result = await toggleAttendance(tagUid);
  
  // Provide visual/audio feedback based on action
  if (result.success) {
    if (result.action === 'checkin') {
      // Green LED + Single beep for check-in
      triggerFeedback('success', 'checkin');
    } else if (result.action === 'checkout') {
      // Blue LED + Double beep for check-out
      triggerFeedback('success', 'checkout');
    }
  } else {
    // Red LED + Error beep
    triggerFeedback('error');
  }
}

function triggerFeedback(type, action) {
  // Implement LED/buzzer control based on your hardware
  console.log(`Feedback: ${type} - ${action || 'error'}`);
}
```

### Arduino (ESP32 with PN532) - Single Reader Toggle

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

// LED pins for feedback
#define LED_GREEN 2
#define LED_RED 4
#define BUZZER_PIN 5

PN532_I2C pn532i2c(Wire);
PN532 nfc(pn532i2c);

void setup() {
  Serial.begin(115200);
  
  // Setup LED pins
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.println("Mode: Single Reader Toggle");
  
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
    
    toggleAttendance(tagUid);
    
    delay(2000); // Prevent multiple reads
  }
  
  delay(100);
}

void toggleAttendance(String tagUid) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(apiBaseUrl) + "/api/attendance/toggle";
    
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
      
      // Parse response
      StaticJsonDocument<512> responseDoc;
      deserializeJson(responseDoc, response);
      
      String action = responseDoc["action"];
      String employeeName = responseDoc["employee"]["name"];
      
      if (httpCode == 201 || httpCode == 200) {
        Serial.print("✓ Success: ");
        Serial.println(action);
        Serial.print("  Employee: ");
        Serial.println(employeeName);
        
        if (action == "checkin") {
          // Green LED + Single beep for check-in
          digitalWrite(LED_GREEN, HIGH);
          tone(BUZZER_PIN, 1000, 200);
          delay(500);
          digitalWrite(LED_GREEN, LOW);
        } else if (action == "checkout") {
          // Blue flash + Double beep for check-out
          int duration = responseDoc["duration"];
          Serial.print("  Duration: ");
          Serial.print(duration);
          Serial.println(" minutes");
          
          digitalWrite(LED_GREEN, HIGH);
          tone(BUZZER_PIN, 1500, 200);
          delay(300);
          tone(BUZZER_PIN, 1500, 200);
          delay(500);
          digitalWrite(LED_GREEN, LOW);
        }
      }
    } else {
      Serial.println("✗ HTTP request failed");
      // Red LED + Error beep
      digitalWrite(LED_RED, HIGH);
      tone(BUZZER_PIN, 500, 500);
      delay(1000);
      digitalWrite(LED_RED, LOW);
    }
    
    http.end();
  }
}
```

---

## Reader Logic - Single Device Implementation

### How It Works

The **single-reader toggle approach** is the recommended implementation:

```
Employee Taps NFC Card on Single Reader
          ↓
API Checks: Does employee have active check-in today?
          ↓
     ┌────┴────┐
     ↓         ↓
    NO        YES
     ↓         ↓
  Time In   Time Out
  (Start)   (End + Duration)
```

### Benefits

✅ **Cost-Effective**: Only need one NFC reader device  
✅ **Simple Setup**: Single device to configure and maintain  
✅ **Zero Confusion**: Employees always use the same reader  
✅ **Automatic Detection**: System intelligently determines action  
✅ **Accurate Duration**: Calculates work hours automatically  
✅ **Real-time Feedback**: Instant response shows check-in or check-out  

### Implementation Tips

1. **Visual Feedback**: Use different LED colors for check-in vs check-out
   - Green LED + Single beep = Check-in
   - Blue LED + Double beep = Check-out
   - Red LED + Long beep = Error

2. **Display Information**: Show employee name and action on LCD/OLED
   ```
   ✓ Sarah Johnson
   CHECK-IN: 08:30 AM
   ```
   ```
   ✓ Sarah Johnson
   CHECK-OUT: 05:45 PM
   Duration: 9.25 hours
   ```

3. **Debouncing**: Add 2-second delay after each tap to prevent duplicate reads

4. **Offline Queue**: Store failed requests locally and sync when online

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

### 6. User Feedback (Single Reader)

Provide clear differentiated feedback:

**Check-In (Morning):**
- ✅ Green LED (solid 1 second)
- 🔊 Single beep (1000Hz, 200ms)
- 📺 Display: "✓ CHECK-IN | Sarah Johnson | 08:30 AM"

**Check-Out (Evening):**
- 🔵 Blue/Green LED (flash twice)
- 🔊 Double beep (1500Hz, 200ms each)
- 📺 Display: "✓ CHECK-OUT | Sarah Johnson | 9.5 hours"

**Error:**
- ❌ Red LED (flash 3 times)
- 🔊 Error beep (500Hz, 500ms)
- 📺 Display: "✗ Tag Not Found"

---

## Testing

### Test with cURL - Toggle API

```bash
# First tap - Should check-in
curl -X POST http://localhost:3000/api/attendance/toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tagUid": "NFC-001-A7K9M2X5",
    "readerId": "READER-001",
    "location": "Main Entrance"
  }'

# Response: action: "checkin"

# Second tap (same day) - Should check-out
curl -X POST http://localhost:3000/api/attendance/toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tagUid": "NFC-001-A7K9M2X5",
    "readerId": "READER-001",
    "location": "Main Entrance"
  }'

# Response: action: "checkout" with duration

# Verify tag enrollment
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

### Issue: Employee can't check-out
**Solution:** Verify employee checked in today. Check attendance records in dashboard.

### Issue: Network timeout
**Solution:** Check reader network connection and API endpoint availability

### Issue: Wrong action detected (check-in instead of check-out)
**Solution:** Verify system date/time is correct. Check if previous check-out was recorded.

---

## Support

For technical support or questions:
- **Documentation:** See SINGLE_READER_IMPLEMENTATION.md for detailed flow
- **Employee Module:** See EMPLOYEE_LOGIN_MODULE.md
- **Database:** Access database studio in dashboard
- **API Testing:** Use provided test endpoints

---

## Hardware Recommendations

### Supported NFC Readers
- **PN532 NFC Module** (I2C/SPI/UART) - Recommended for ESP32
- **RC522 RFID Reader** - Budget-friendly option
- **ACR122U USB NFC Reader** - For Raspberry Pi/PC
- **Custom ESP32-based readers** - Best for production

### Supported NFC Tags
- **MIFARE Classic 1K** - Most common
- **MIFARE Ultralight** - Cost-effective
- **NTAG213/215/216** - High memory
- **ISO 14443A compatible tags**

### Hardware Setup Example (Single Reader)

```
┌────────────────────────────────┐
│     ESP32 Development Board    │
│                                │
│  ┌──────────────────────────┐ │
│  │     PN532 NFC Module     │ │
│  │  (I2C: SDA=21, SCL=22)   │ │
│  └──────────────────────────┘ │
│                                │
│  LED Indicators:               │
│  • Green (GPIO 2) - Check-In   │
│  • Red (GPIO 4) - Error        │
│  • Buzzer (GPIO 5) - Audio     │
│                                │
│  Optional: OLED Display        │
│  (I2C: SDA=21, SCL=22)         │
└────────────────────────────────┘
         ↓ WiFi
    Internet → API Server
```

---

**Last Updated:** December 9, 2025  
**API Version:** 2.0.0 (Single Reader Toggle)  
**Implementation:** Single NFC Reader for Time In & Time Out