/**
 * NFC Utility Functions
 * Helpers for formatting and validating NFC card IDs
 */

/**
 * Format NFC serial number for display
 * Converts hex string to uppercase with separators
 * Example: "04a332bc984a" -> "04:A3:32:BC:98:4A"
 */
export function formatNFCSerial(serial: string): string {
  if (!serial) return "";
  
  // Remove any existing separators
  const cleaned = serial.replace(/[:\s-]/g, "").toUpperCase();
  
  // Add colons every 2 characters
  return cleaned.match(/.{1,2}/g)?.join(":") || cleaned;
}

/**
 * Validate NFC UID format
 * Checks if the UID is a valid hex string
 */
export function isValidNFCUID(uid: string): boolean {
  if (!uid) return false;
  
  // Remove separators and check if it's a valid hex string
  const cleaned = uid.replace(/[:\s-]/g, "");
  
  // NFC UIDs are typically 4, 7, or 10 bytes (8, 14, or 20 hex characters)
  const validLengths = [8, 14, 20];
  
  return /^[0-9A-Fa-f]+$/.test(cleaned) && validLengths.includes(cleaned.length);
}

/**
 * Clean NFC UID for storage
 * Removes separators and converts to lowercase
 */
export function cleanNFCUID(uid: string): string {
  return uid.replace(/[:\s-]/g, "").toLowerCase();
}

/**
 * Generate a random NFC UID for testing
 * Creates a 7-byte (14 character) hex string
 */
export function generateRandomNFCUID(): string {
  const bytes = 7;
  const hex = Array.from({ length: bytes }, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
  
  return hex.toUpperCase();
}
