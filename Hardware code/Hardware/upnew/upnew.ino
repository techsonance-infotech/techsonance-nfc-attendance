#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

/* ---------- PIN CONFIG ---------- */
#define SS_PIN    D8
#define RST_PIN   D0
#define GREEN_LED D1
#define RED_LED   D2

/* ---------- WIFI ---------- */
#define WIFI_SSID "TechSonance InfoTech"
#define WIFI_PASS "TechSonance@1711#"

/* ---------- FIREBASE ---------- */
#define API_KEY "AIzaSyDsEZJSVLssVcKiTXxKZqN67is500qHt5Y"
#define DATABASE_URL "https://ts-attendence-web-default-rtdb.firebaseio.com/"

/* ---------- DEVICE ACCOUNT ---------- */
#define DEVICE_EMAIL "connect.techsonance@gmail.com"
#define DEVICE_PASS  "TechSonance@1711"

/* ---------- EMPLOYEE ID PREFIX ---------- */
#define EMP_PREFIX "TS1"

/* ---------- TIME (IST) ---------- */
#define NTP_SERVER "pool.ntp.org"
#define GMT_OFFSET_SEC 19800
#define DAYLIGHT_OFFSET_SEC 0

MFRC522 rfid(SS_PIN, RST_PIN);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

/* ---------- ANTI-GLITCH ---------- */
unsigned long lastTap = 0;
const unsigned long TAP_DELAY = 800;

/* ---------- SAFE NTAG READ ---------- */
String readPage(byte page) {
  byte buffer[18];
  byte size = sizeof(buffer);
  memset(buffer, 0, sizeof(buffer));

  MFRC522::StatusCode status =
    rfid.MIFARE_Read(page, buffer, &size);

  if (status != MFRC522::STATUS_OK) return "ERR";

  String s = "";
  for (byte i = 0; i < 4; i++) {
    if (buffer[i] >= '0' && buffer[i] <= 'Z')
      s += (char)buffer[i];
    else
      s += '_';
  }
  return s;
}

/* ---------- STRONG VALIDATION ---------- */
bool isValidField(String s) {
  if (s.length() != 4) return false;
  if (s == "ERR") return false;

  for (int i = 0; i < 4; i++) {
    if (!(isalnum(s[i]) && s[i] <= 'Z')) return false;
  }
  return true;
}

/* ---------- TIME HELPERS ---------- */
String getDate() {
  time_t now = time(nullptr);
  struct tm *t = localtime(&now);
  char buf[12];
  sprintf(buf, "%04d-%02d-%02d",
          t->tm_year + 1900,
          t->tm_mon + 1,
          t->tm_mday);
  return String(buf);
}

String getTimeOnly() {
  time_t now = time(nullptr);
  struct tm *t = localtime(&now);
  char buf[10];
  sprintf(buf, "%02d:%02d:%02d",
          t->tm_hour,
          t->tm_min,
          t->tm_sec);
  return String(buf);
}

/* ---------- LED ---------- */
void greenShort() {
  digitalWrite(GREEN_LED, HIGH);
  delay(120);
  digitalWrite(GREEN_LED, LOW);
}
void greenLong() {
  digitalWrite(GREEN_LED, HIGH);
  delay(400);
  digitalWrite(GREEN_LED, LOW);
}
void redBlink() {
  digitalWrite(RED_LED, HIGH);
  delay(300);
  digitalWrite(RED_LED, LOW);
}

/* ---------- SETUP ---------- */
void setup() {
  Serial.begin(9600);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);

  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);

  /* WiFi */
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  /* Time */
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  while (time(nullptr) < 100000) delay(300);
  Serial.println("Time synced (IST)");

  /* Firebase */
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = DEVICE_EMAIL;
  auth.user.password = DEVICE_PASS;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase auth OK");
  Serial.println("System Ready");
  Serial.println("Tap NTAG213 card...");
}

/* ---------- LOOP ---------- */
void loop() {

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  if (millis() - lastTap < TAP_DELAY) {
    rfid.PICC_HaltA();
    return;
  }
  lastTap = millis();

  if (rfid.PICC_GetType(rfid.uid.sak) != MFRC522::PICC_TYPE_MIFARE_UL) {
    redBlink();
    rfid.PICC_HaltA();
    return;
  }

  /* UID */
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) uid += ":";
  }
  uid.toUpperCase();

  /* Read NTAG data */
  String name  = readPage(4);
  String desg  = readPage(5);
  String empId = readPage(6);

  /* ---------- HARD VALIDATION ---------- */
  if (!isValidField(name) ||
      !isValidField(desg) ||
      !isValidField(empId)) {

    Serial.println("❌ INVALID / UNSTABLE CARD READ");
    Serial.print("Name: "); Serial.println(name);
    Serial.print("Desg: "); Serial.println(desg);
    Serial.print("Emp : "); Serial.println(empId);

    redBlink();
    rfid.PICC_HaltA();

    while (rfid.PICC_IsNewCardPresent() || rfid.PICC_ReadCardSerial()) {
      delay(50);
    }
    return;
  }

  /* Build final Employee ID */
  String empIdFinal = String(EMP_PREFIX) + empId;   // TS1XXXX

  String today = getDate();
  String nowT  = getTimeOnly();
  String path  = "/attendance/" + uid + "/" + today;

  Serial.println("\n--- CARD VERIFIED ---");
  Serial.print("UID        : "); Serial.println(uid);
  Serial.print("Name       : "); Serial.println(name);
  Serial.print("Desg       : "); Serial.println(desg);
  Serial.print("Emp(card)  : "); Serial.println(empId);
  Serial.print("Emp(final) : "); Serial.println(empIdFinal);

  /* ---------- CHECK-IN / CHECK-OUT ---------- */
  if (!Firebase.RTDB.getString(&fbdo, path + "/check_in")) {

    FirebaseJson json;
    json.set("name", name);
    json.set("designation", desg);
    json.set("employee_id", empIdFinal);
    json.set("check_in", nowT);

    Firebase.RTDB.setJSON(&fbdo, path, &json);
    Serial.println("✅ CHECK-IN");
    greenShort();

  } 
  else if (!Firebase.RTDB.getString(&fbdo, path + "/check_out")) {

    Firebase.RTDB.setString(&fbdo, path + "/check_out", nowT);
    Serial.println("✅ CHECK-OUT");
    greenLong();

  } 
  else {
    Serial.println("⚠️ Attendance already completed");
    redBlink();
  }

  rfid.PICC_HaltA();
  delay(300);

  while (rfid.PICC_IsNewCardPresent() || rfid.PICC_ReadCardSerial()) {
    delay(50);
  }
}
