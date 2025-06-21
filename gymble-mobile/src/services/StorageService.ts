import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Define a storage service that works across platforms
class StorageService {
  /**
   * Set an item in storage
   * @param key The key to store the value under
   * @param value The value to store (must be a string)
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.setItem(key, value);
      } else {
        // Use SecureStore for mobile platforms
        await SecureStore.setItemAsync(key, value);
      }
      console.log(`Item saved to storage with key: ${key}`);
    } catch (error) {
      console.error(`Error saving item to storage with key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get an item from storage
   * @param key The key to retrieve the value for
   * @returns The stored value or null if not found
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        return localStorage.getItem(key);
      } else {
        // Use SecureStore for mobile platforms
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Error getting item from storage with key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove an item from storage
   * @param key The key to remove
   */
  static async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.removeItem(key);
      } else {
        // Use SecureStore for mobile platforms
        await SecureStore.deleteItemAsync(key);
      }
      console.log(`Item removed from storage with key: ${key}`);
    } catch (error) {
      console.error(`Error removing item from storage with key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if the storage API is available on the current device
   * @returns True if storage is available, false otherwise
   */
  static isAvailable(): boolean {
    if (Platform.OS === 'web') {
      // Check if localStorage is available in the browser
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    } else {
      // For mobile platforms, we assume SecureStore is available
      // In a real app, you might want to use SecureStore.isAvailableAsync() if available
      return true;
    }
  }
}

export default StorageService;