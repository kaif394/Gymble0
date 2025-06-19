import { Platform } from 'react-native';
import axios from 'axios'; // Using axios instead of NetInfo

// Configuration file for the Gymble mobile app

// Backend API URLs
// For development on emulator, use 10.0.2.2 which maps to host's localhost
const EMULATOR_API_URL = 'http://10.0.2.2:8000';

// For physical devices, use the actual IP address of your development machine
// Replace with your computer's IP address on your local network
const PHYSICAL_DEVICE_API_URL = 'http://192.168.57.172:8000'; // Your actual Wi-Fi IP address

// Fallback URL if the primary connection fails
const FALLBACK_API_URL = 'http://localhost:8000';

// Set this to true to force using the physical device URL, or false to force using the emulator URL
// Set to null for automatic detection
const FORCE_PHYSICAL_DEVICE = null; // Changed to null to enable automatic detection

// Function to determine if running on an emulator
// This is a simplified approach and may not work for all emulators
const isEmulator = () => {
  if (Platform.OS !== 'android') return false;
  
  // Common emulator IP addresses
  return (
    Platform.constants?.isEmulator === true || // Some React Native versions provide this
    Platform.constants?.Brand?.toLowerCase() === 'google' // Google emulators
  );
};

// Choose the appropriate API URL based on configuration
export const API_URL = FORCE_PHYSICAL_DEVICE === null
  ? (isEmulator() ? EMULATOR_API_URL : PHYSICAL_DEVICE_API_URL)
  : (FORCE_PHYSICAL_DEVICE ? PHYSICAL_DEVICE_API_URL : EMULATOR_API_URL);

// Log the selected API URL for debugging purposes
console.log(`Using API URL: ${API_URL}`);

// Function to test API connection
export const testApiConnection = async (url = API_URL) => {
  try {
    // Try to connect to the API
    const response = await axios.get(`${url}/api/gyms/all`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.log(`Connection test failed for ${url}:`, error.message);
    return false;
  }
};

// Function to get a working API URL
export const getWorkingApiUrl = async () => {
  // Try the default API URL first
  if (await testApiConnection(API_URL)) {
    return API_URL;
  }
  
  // If that fails, try the fallback URL
  if (await testApiConnection(FALLBACK_API_URL)) {
    console.log('Using fallback API URL');
    return FALLBACK_API_URL;
  }
  
  // If both fail, try the other URL type (emulator vs physical)
  const alternateUrl = isEmulator() ? PHYSICAL_DEVICE_API_URL : EMULATOR_API_URL;
  if (await testApiConnection(alternateUrl)) {
    console.log('Using alternate API URL');
    return alternateUrl;
  }
  
  // If all attempts fail, return the default URL and let the app handle the error
  console.log('All connection attempts failed');
  return API_URL;
};

// App configuration
export const APP_CONFIG = {
  // Authentication
  tokenStorageKey: 'gymble_auth_token',
  userStorageKey: 'gymble_user',
  
  // API endpoints
  endpoints: {
    login: '/api/auth/login',
    register: '/api/auth/register-member',
    gyms: '/api/gyms/all',
    plans: '/api/plans/gym',
    me: '/api/members/me',
  },
  
  // UI Configuration
  ui: {
    primaryColor: '#4CAF50',
    secondaryColor: '#2196F3',
    errorColor: '#F44336',
    successColor: '#4CAF50',
    warningColor: '#FF9800',
    infoColor: '#2196F3',
  },
};