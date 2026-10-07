export const JUMOLF_ENTITLEMENTS=Object.freeze(['premium','admin_grant','access_code','none']);
export const JUMOLF_CONSENT_KEYS=Object.freeze(['gps','weather','dog_history','ai_analysis','session_comparison']);
export const JUMOLF_QUALITY=Object.freeze(['high','medium','low','insufficient']);
export const JUMOLF_PROVENANCE=Object.freeze(['manual','phone_gps','gpx_import','garmin','weather_api','historical_weather','calculated','estimated','ai_generated','user_confirmed']);
export const cloneJumolf=value=>structuredClone(value);
