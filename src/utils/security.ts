/**
 * Security utilities for IP whitelisting and geofencing validation
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Fetch client public IP address
 */
export const getClientIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error('Failed to fetch client IP:', error);
    return null;
  }
};

/**
 * Verify client IP address against allowed office IP
 */
export const verifyIPAddress = async (allowedIP: string): Promise<{ valid: boolean; ip: string | null }> => {
  try {
    const clientIP = await getClientIP();
    
    if (!clientIP) {
      return { valid: false, ip: null };
    }
    
    // Support wildcard matching for subnets (e.g., 192.168.1.*)
    if (allowedIP.includes('*')) {
      const allowedPattern = allowedIP.replace(/\./g, '\\.').replace(/\*/g, '.*');
      const regex = new RegExp(`^${allowedPattern}$`);
      return { valid: regex.test(clientIP), ip: clientIP };
    }
    
    return { valid: clientIP === allowedIP, ip: clientIP };
  } catch (error) {
    console.error('IP verification failed:', error);
    return { valid: false, ip: null };
  }
};

/**
 * Validate geofence location
 */
export const verifyGeofence = (
  currentLat: number,
  currentLon: number,
  officeLat: number,
  officeLon: number,
  allowedRadiusMeters: number
): { valid: boolean; distance: number } => {
  const distance = calculateDistance(currentLat, currentLon, officeLat, officeLon);
  return {
    valid: distance <= allowedRadiusMeters,
    distance: Math.round(distance)
  };
};
