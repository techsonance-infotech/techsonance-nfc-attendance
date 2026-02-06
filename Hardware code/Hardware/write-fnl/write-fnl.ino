#include <SPI.h>
#include <MFRC522.h>

/* ---------- PIN CONFIG ---------- */
#define SS_PIN  D8
#define RST_PIN D0

MFRC522 rfid(SS_PIN, RST_PIN);

/* ---------- DATA (4 chars ONLY) ---------- */
byte NAME[4] = {'S','O','M','Y'};
byte DESG[4] = {'O','N','W','R'};
byte EMP [4] = {'0','0','0','2'};

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

/* ---------- SETUP ---------- */
void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);

  Serial.println("📝 NTAG213 SAFE WRITE MODE");
  Serial.println("Tap card to write data...");
}

/* ---------- LOOP ---------- */
void loop() {

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

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

  if (uid == lastUID) {
    rfid.PICC_HaltA();
    return;
  }
  lastUID = uid;

  Serial.println("\n--- WRITING CARD ---");
  Serial.print("UID : "); Serial.println(uid);

  /* ---------- WRITE ---------- */
  rfid.MIFARE_Ultralight_Write(4, NAME, 4);
  rfid.MIFARE_Ultralight_Write(5, DESG, 4);
  rfid.MIFARE_Ultralight_Write(6, EMP,  4);

  /* ---------- VERIFY ---------- */
  String rName = safeReadPage(4);
  String rDesg = safeReadPage(5);
  String rEmp  = safeReadPage(6);

  if (rName == String((char*)NAME).substring(0,4) &&
      rDesg == String((char*)DESG).substring(0,4) &&
      rEmp  == String((char*)EMP ).substring(0,4)) {

    Serial.println("✅ WRITE VERIFIED SUCCESS");
  } else {
    Serial.println("❌ WRITE VERIFICATION FAILED");
    Serial.print("Read Name : "); Serial.println(rName);
    Serial.print("Read Desg : "); Serial.println(rDesg);
    Serial.print("Read Emp  : "); Serial.println(rEmp);
  }

  Serial.println("📌 Remove card before next write");

  rfid.PICC_HaltA();

  /* ---------- FORCE CARD REMOVAL ---------- */
  while (rfid.PICC_IsNewCardPresent() || rfid.PICC_ReadCardSerial()) {
    delay(50);
  }

  delay(500);
}
