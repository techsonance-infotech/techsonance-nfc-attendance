/**
 * NFC Utility Functions for Web NFC API
 * Supports reading NFC cards and checking browser compatibility
 */

export interface NFCReadResult {
  serialNumber: string;
  records?: any[];
}

/**
 * Check if NFC is supported in the current browser
 */
export const isNFCSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'NDEFReader' in window;
};

/**
 * Request NFC permissions (some browsers require explicit permission)
 */
export const requestNFCPermission = async (): Promise<boolean> => {
  try {
    // Check if permissions API is available
    if ('permissions' in navigator) {
      // @ts-ignore - NFC permission might not be in TypeScript types yet
      const permission = await navigator.permissions.query({ name: 'nfc' });
      return permission.state === 'granted' || permission.state === 'prompt';
    }
    // If permissions API not available, assume permission is granted
    return true;
  } catch (error) {
    console.error('NFC permission check failed:', error);
    return true; // Assume granted if check fails
  }
};

/**
 * Read NFC card and return serial number
 * @param onSuccess Callback when card is successfully read
 * @param onError Callback when error occurs
 * @returns AbortController to stop scanning
 */
export const startNFCReader = async (
  onSuccess: (result: NFCReadResult) => void,
  onError: (error: Error) => void
): Promise<AbortController | null> => {
  if (!isNFCSupported()) {
    onError(new Error('NFC is not supported in this browser. Please use a device with NFC capability and a compatible browser (Chrome on Android).'));
    return null;
  }

  try {
    // Check permissions
    const hasPermission = await requestNFCPermission();
    if (!hasPermission) {
      onError(new Error('NFC permission denied. Please enable NFC in your device settings.'));
      return null;
    }

    // @ts-ignore - NDEFReader is not in TypeScript types yet
    const ndef = new NDEFReader();
    const abortController = new AbortController();

    // Start scanning
    await ndef.scan({ signal: abortController.signal });

    console.log('NFC scanning started. Please tap your NFC card...');

    // Listen for NFC tags
    ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
      console.log('NFC card detected:', serialNumber);
      
      const records = message.records.map((record: any) => ({
        recordType: record.recordType,
        mediaType: record.mediaType,
        data: record.data,
      }));

      onSuccess({
        serialNumber: serialNumber || 'UNKNOWN',
        records,
      });
    });

    // Listen for read errors
    ndef.addEventListener('readingerror', () => {
      onError(new Error('Failed to read NFC card. Please try again.'));
    });

    return abortController;
  } catch (error: any) {
    console.error('NFC read error:', error);
    
    let errorMessage = 'Failed to start NFC reader. ';
    
    if (error.name === 'NotAllowedError') {
      errorMessage += 'NFC permission denied. Please enable NFC in your device settings.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage += 'NFC is not supported on this device.';
    } else if (error.name === 'NotReadableError') {
      errorMessage += 'NFC hardware is not accessible. Please check if NFC is enabled.';
    } else {
      errorMessage += error.message || 'Unknown error occurred.';
    }
    
    onError(new Error(errorMessage));
    return null;
  }
};

/**
 * Stop NFC scanning
 */
export const stopNFCReader = (abortController: AbortController | null) => {
  if (abortController) {
    abortController.abort();
    console.log('NFC scanning stopped.');
  }
};

/**
 * Format NFC serial number for display
 */
export const formatNFCSerial = (serialNumber: string): string => {
  return serialNumber.toUpperCase();
};
