/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OFFICE_IP_ADDRESS: string;
  readonly VITE_OFFICE_LATITUDE: string;
  readonly VITE_OFFICE_LONGITUDE: string;
  readonly VITE_GEOFENCE_RADIUS_METERS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
