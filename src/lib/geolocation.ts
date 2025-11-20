import { OfficeLocation } from '@/types/attendance';

export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    // First attempt with high accuracy
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        // If high accuracy fails, try with lower accuracy as fallback
        console.warn('High accuracy failed, trying with lower accuracy:', error.message);
        navigator.geolocation.getCurrentPosition(
          resolve,
          (fallbackError) => {
            // Both attempts failed, provide detailed error
            let errorMessage = 'Failed to get location: ';
            switch (fallbackError.code) {
              case fallbackError.PERMISSION_DENIED:
                errorMessage += 'Permission denied. Please allow location access in your browser settings.';
                break;
              case fallbackError.POSITION_UNAVAILABLE:
                errorMessage += 'Location information unavailable. Please check your device settings.';
                break;
              case fallbackError.TIMEOUT:
                errorMessage += 'Location request timed out. Please try again.';
                break;
              default:
                errorMessage += fallbackError.message || 'Unknown error occurred.';
            }
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: false, // Lower accuracy, faster response
            timeout: 20000, // 20 seconds for fallback
            maximumAge: 60000, // Accept cached position up to 1 minute old
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds for first attempt
        maximumAge: 0,
      }
    );
  });
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const isWithinOfficeLocation = (
  currentLat: number,
  currentLon: number,
  officeLocation: OfficeLocation
): boolean => {
  const distance = calculateDistance(
    currentLat,
    currentLon,
    officeLocation.latitude,
    officeLocation.longitude
  );

  return distance <= officeLocation.radius;
};