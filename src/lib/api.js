import Constants from 'expo-constants';

/**
 * Base URL of our backend (the API-key proxy).
 * Set EXPO_PUBLIC_API_URL in .env for local dev, or in the
 * EAS build profile for production.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:3001';
