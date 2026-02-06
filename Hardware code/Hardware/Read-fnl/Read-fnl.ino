#include <SPI.h>
#include <MFRC522.h>

/* ---------- PIN CONFIG ---------- */
#define SS_PIN  D8
#define RST_PIN D0

MFRC522 rfid(SS_PIN, RST_PIN);

/* ---------- CONTROL ---------- */
String lastUID = "";

/* ---------- SAFE READ FUNCTION ---------- */
String safeReadPage(byte page) {
  byte buffer[18];
  byte size = sizeof(buffer);

  memset(buffer, 0, sizeof(buffer));

  MFRC522::StatusCode status =
    rfid.MIFARE_Read(page, buffer, &size);

  if (status != MFRC522::STATUS_OK) {
    return "ERR";
  }

  String s = "";
  for (byte i = 0; i < 4; i++) {
    if (buffer[i] >= 32 && buffer[i] <= 126)
      s += (char)buffer[i];
    else
      s += '_';
  }
  return s;
}

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);

  Serial.println("📖 NTAG213 READ MODE");
  Serial.println("Tap card to read data...");
}

void loop() {

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Ensure NTAG213
  if (rfid.PICC_GetType(rfid.uid.sak) != MFRC522::PICC_TYPE_MIFARE_UL) {
    Serial.println("❌ Not an NTAG213 card");
    rfid.PICC_HaltA();
    delay(1000);
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

  // Prevent repeated reads
  if (uid == lastUID) {
    rfid.PICC_HaltA();
    return;
  }
  lastUID = uid;

  /* READ DATA */
  String name  = safeReadPage(4);
  String desg  = safeReadPage(5);
  String empId = safeReadPage(6);

  /* SERIAL OUTPUT */
  Serial.println("\n--- CARD READ ---");
  Serial.print("UID        : "); Serial.println(uid);
  Serial.print("Name       : "); Serial.println(name);
  Serial.print("Designation: "); Serial.println(desg);
  Serial.print("EmployeeID : "); Serial.println(empId);
  Serial.println("------------------");

  Serial.println("📌 Remove card");

  rfid.PICC_HaltA();

  /* Force card removal */
  while (rfid.PICC_IsNewCardPresent() || rfid.PICC_ReadCardSerial()) {
    delay(50);
  }

  delay(300);
}
