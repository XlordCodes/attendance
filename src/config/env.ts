/**
 * Centralized Environment Configuration
 * Strongly typed access to Vite environment variables with safe fallbacks
 */

export interface EnvConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;

  // Timezone
  officeTimezone: string;

  // Security - IP Whitelisting & Geofencing
  officeIpAddress: string;
  officeLatitude: number;
  officeLongitude: number;
  geofenceRadiusMeters: number;
}

/**
 * Parse and validate environment variables with safe fallbacks
 * Prevents runtime crashes from undefined or malformed values
 */
export const envConfig: EnvConfig = {
  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  // Timezone Configuration
  officeTimezone: import.meta.env.VITE_OFFICE_TIMEZONE || 'Asia/Kolkata',

  // Security Configuration - IP Whitelisting & Geofencing
  officeIpAddress: import.meta.env.VITE_OFFICE_IP_ADDRESS || '127.0.0.1',
  officeLatitude: parseFloat(import.meta.env.VITE_OFFICE_LATITUDE) || 12.9716,
  officeLongitude: parseFloat(import.meta.env.VITE_OFFICE_LONGITUDE) || 77.5946,
  geofenceRadiusMeters: parseFloat(import.meta.env.VITE_GEOFENCE_RADIUS_METERS) || 200,
};

/**
 * Validate that critical environment variables are properly configured
 * Returns true if all required values are present and valid
 */
export const validateEnvConfig = (): boolean => {
  if (!envConfig.supabaseUrl || !envConfig.supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration');
    return false;
  }

  if (isNaN(envConfig.officeLatitude) || envConfig.officeLatitude < -90 || envConfig.officeLatitude > 90) {
    console.error('❌ Invalid office latitude:', envConfig.officeLatitude);
    return false;
  }

  if (isNaN(envConfig.officeLongitude) || envConfig.officeLongitude < -180 || envConfig.officeLongitude > 180) {
    console.error('❌ Invalid office longitude:', envConfig.officeLongitude);
    return false;
  }

  if (isNaN(envConfig.geofenceRadiusMeters) || envConfig.geofenceRadiusMeters < 0) {
    console.error('❌ Invalid geofence radius:', envConfig.geofenceRadiusMeters);
    return false;
  }

  return true;
};
