import axios from 'axios';
import { getWorkingApiUrl } from '../config';
import { jwtDecode } from 'jwt-decode';
import StorageService from './StorageService';

// Define token payload type
type TokenPayload = {
  exp: number;
  sub: string;
  [key: string]: any;
};

// Define user type
type User = {
  id: string;
  name: string;
  email: string;
  gym_id?: string;
  role?: string;
  token?: string;
};

// Keys for storage
const TOKEN_KEY = 'gymble_auth_token';
const USER_KEY = 'gymble_user';
const REFRESH_TOKEN_KEY = 'gymble_refresh_token';

/**
 * Service for handling authentication-related operations
 */
export class AuthService {
  /**
   * Save authentication token to storage
   * @param token The JWT token to save
   */
  static async saveToken(token: string): Promise<void> {
    try {
      await StorageService.setItem(TOKEN_KEY, token);
      console.log('Token saved to storage');
    } catch (error) {
      console.error('Error saving token to storage:', error);
      throw error;
    }
  }

  /**
   * Save refresh token to storage
   * @param refreshToken The refresh token to save
   */
  static async saveRefreshToken(refreshToken: string): Promise<void> {
    try {
      await StorageService.setItem(REFRESH_TOKEN_KEY, refreshToken);
      console.log('Refresh token saved to storage');
    } catch (error) {
      console.error('Error saving refresh token to storage:', error);
      throw error;
    }
  }

  /**
   * Get authentication token from storage
   * @returns The JWT token or null if not found
   */
  static async getToken(): Promise<string | null> {
    try {
      const token = await StorageService.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting token from storage:', error);
      return null;
    }
  }

  /**
   * Get refresh token from storage
   * @returns The refresh token or null if not found
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      const refreshToken = await StorageService.getItem(REFRESH_TOKEN_KEY);
      return refreshToken;
    } catch (error) {
      console.error('Error getting refresh token from storage:', error);
      return null;
    }
  }

  /**
   * Check if the current token is expired
   * @returns True if token is expired or not found, false otherwise
   */
  static async isTokenExpired(): Promise<boolean> {
    try {
      const token = await AuthService.getToken();
      if (!token) return true;

      try {
        const decoded = jwtDecode<TokenPayload>(token);
        const currentTime = Date.now() / 1000;
        
        // Return true if token is expired or will expire in the next 5 minutes
        return decoded.exp < currentTime + 300; // 300 seconds = 5 minutes
      } catch (decodeError) {
        console.error('Error decoding token:', decodeError);
        return true; // Assume token is expired if it can't be decoded
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // Assume token is expired if there's an error
    }
  }

  /**
   * Refresh the authentication token
   * @returns True if token was successfully refreshed, false otherwise
   */
  static async refreshToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;
      
      // Get the current working API URL
      const apiUrl = await getWorkingApiUrl();
      
      // Call refresh token endpoint
      const response = await axios.post(`${apiUrl}/api/auth/refresh-token`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.access_token) {
        // Save the new token
        await this.saveToken(response.data.access_token);
        
        // Save the new refresh token if provided
        if (response.data.refresh_token) {
          await this.saveRefreshToken(response.data.refresh_token);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Save user data to storage
   * @param user The user object to save
   */
  static async saveUser(user: User): Promise<void> {
    try {
      const userJson = JSON.stringify(user);
      await StorageService.setItem(USER_KEY, userJson);
      console.log('User data saved to storage');
    } catch (error) {
      console.error('Error saving user data to storage:', error);
      throw error;
    }
  }

  /**
   * Get user data from storage
   * @returns The user object or null if not found
   */
  static async getUser(): Promise<User | null> {
    try {
      const userJson = await StorageService.getItem(USER_KEY);
      if (!userJson) return null;
      
      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error('Error getting user data from storage:', error);
      return null;
    }
  }

  /**
   * Clear all authentication data from storage
   */
  static async logout(): Promise<void> {
    try {
      await StorageService.removeItem(TOKEN_KEY);
      await StorageService.removeItem(USER_KEY);
      await StorageService.removeItem(REFRESH_TOKEN_KEY);
      console.log('All auth data cleared from storage');
    } catch (error) {
      console.error('Error clearing auth data from storage:', error);
      throw error;
    }
  }


}