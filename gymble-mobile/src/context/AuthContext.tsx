import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL, getWorkingApiUrl, testApiConnection, APP_CONFIG } from '../config';
import { Alert } from 'react-native';
import { AuthService } from '../services/AuthService';

// Define user type
type User = {
  id: string;
  name: string;
  email: string;
  gym_id?: string;
  role?: string;
  token?: string;
};

// Define gym type
type Gym = {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
};

// Define plan type
type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  gym_id: string;
  is_active: boolean;
};

// Define auth context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  apiConnected: boolean;
  isOwnerMode: boolean;
  setIsOwnerMode: (isOwner: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, gym_id: string, plan_id: string, phone?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchGyms: () => Promise<Gym[]>;
  fetchPlans: (gym_id: string) => Promise<Plan[]>;
  checkApiConnection: () => Promise<boolean>;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Create the auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState(API_URL);
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  
  // Reference to store the refresh token interval
  const tokenRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Check API connection on startup
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await testApiConnection();
      setApiConnected(connected);
      
      if (!connected) {
        // Try to find a working API URL
        const workingUrl = await getWorkingApiUrl();
        setCurrentApiUrl(workingUrl);
        
        // Test again with the new URL
        const retryConnected = await testApiConnection();
        setApiConnected(retryConnected);
        
        if (!retryConnected) {
          console.error('Failed to connect to any API endpoint');
        }
      }
    };
    
    checkConnection();
  }, []);

  // Set up axios interceptor to add auth token to requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async (config) => {
        // Use the current working API URL
        if (config.url && config.url.startsWith(API_URL)) {
          config.url = config.url.replace(API_URL, currentApiUrl);
        }
        
        // Check if token is expired and refresh if needed
        if (user?.token) {
          const isExpired = await AuthService.isTokenExpired();
          if (isExpired) {
            console.log('Token expired, attempting to refresh...');
            const refreshed = await AuthService.refreshToken();
            if (!refreshed) {
              // If refresh fails, log the user out
              console.log('Token refresh failed, logging out');
              await logout();
              return config;
            }
            
            // Get the new token
            const newToken = await AuthService.getToken();
            if (newToken) {
              // Update user object with new token
              setUser(prev => prev ? {...prev, token: newToken} : null);
              config.headers.Authorization = `Bearer ${newToken}`;
            }
          } else {
            // Token is still valid
            config.headers.Authorization = `Bearer ${user.token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle network errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Log detailed error information
        console.error('Axios error:', error);
        if (error.response) {
          // The request was made and the server responded with a status code
          console.error('Error response data:', error.response.data);
          console.error('Error response status:', error.response.status);
          
          // Handle 401 Unauthorized errors (token expired or invalid)
          if (error.response.status === 401) {
            // Attempt to refresh the token
            AuthService.refreshToken().catch(() => {
              // If refresh fails, log the user out
              logout();
              Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
            });
          }
        } else if (error.request) {
          // The request was made but no response was received
          console.error('Error request:', error.request);
          console.error('Network error - no response received');
        } else {
          // Something happened in setting up the request
          console.error('Error message:', error.message);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [user, currentApiUrl]);

  // Set up token refresh interval
  useEffect(() => {
    // Clear any existing interval
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current);
      tokenRefreshInterval.current = null;
    }
    
    // If user is logged in, set up token refresh interval
    if (user?.token) {
      // Refresh token every 23 hours (slightly less than the 24-hour expiry)
      tokenRefreshInterval.current = setInterval(async () => {
        console.log('Attempting scheduled token refresh');
        await AuthService.refreshToken();
      }, 23 * 60 * 60 * 1000); // 23 hours in milliseconds
    }
    
    // Clean up interval on unmount
    return () => {
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
      }
    };
  }, [user]);

  // Check if user is logged in on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Get user from secure storage
        const userData = await AuthService.getUser();
        if (userData) {
          // Check if token is expired
          const isExpired = await AuthService.isTokenExpired();
          if (isExpired) {
            // Try to refresh the token
            const refreshed = await AuthService.refreshToken();
            if (!refreshed) {
              // If refresh fails, clear user data
              await AuthService.logout();
              setUser(null);
            } else {
              // Get the refreshed token and update user
              const newToken = await AuthService.getToken();
              setUser({...userData, token: newToken});
            }
          } else {
            // Token is still valid
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Failed to load user from storage', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Function to check API connection
  const checkApiConnection = async (): Promise<boolean> => {
    try {
      const connected = await testApiConnection();
      setApiConnected(connected);
      
      if (!connected) {
        // Try to find a working API URL
        const workingUrl = await getWorkingApiUrl();
        setCurrentApiUrl(workingUrl);
        
        // Test again with the new URL
        const retryConnected = await testApiConnection();
        setApiConnected(retryConnected);
        return retryConnected;
      }
      
      return connected;
    } catch (error) {
      console.error('Error checking API connection:', error);
      setApiConnected(false);
      return false;
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check API connection before attempting login
      const connected = await checkApiConnection();
      if (!connected) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
        return false;
      }
      
      console.log(`Attempting to login with API URL: ${currentApiUrl}`);
      
      const response = await axios.post(`${currentApiUrl}/api/auth/login`, { 
        email, 
        password 
      }).catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Error response data:', error.response.data);
          console.error('Error response status:', error.response.status);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('Error request:', error.request);
          console.error('Network error - no response received');
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error message:', error.message);
        }
        throw error;
      });
      
      // Check for access_token instead of token
      if (response.data.access_token && response.data.user) {
        const userData = {
          ...response.data.user,
          token: response.data.access_token // Store access_token as token
        };
        
        // Save user data and token securely
        await AuthService.saveUser(userData);
        await AuthService.saveToken(response.data.access_token);
        
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string, gym_id: string, plan_id: string, phone: string = '1234567890'): Promise<boolean> => {
    try {
      // Check API connection before attempting registration
      const connected = await checkApiConnection();
      if (!connected) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
        return false;
      }
      
      console.log('Starting registration process with:', { name, email, gym_id, plan_id, phone });
      setIsLoading(true);
      
      const response = await axios.post(`${currentApiUrl}/api/auth/register-member`, { 
        name, 
        email, 
        password,
        gym_id,
        plan_id,
        phone // Use the provided phone number or the default
      });
      
      console.log('Registration response:', response.data);
      
      // Check for access_token instead of token
      if (response.data.access_token && response.data.user) {
        const userData = {
          ...response.data.user,
          token: response.data.access_token // Store access_token as token
        };
        
        // Save user data and token securely
        await AuthService.saveUser(userData);
        await AuthService.saveToken(response.data.access_token);
        
        console.log('Setting user data:', userData);
        setUser(userData);
        return true;
      }
      console.log('Registration failed: No access_token or user data in response');
      return false;
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        // Show more specific error message if available
        if (error.response.data && error.response.data.detail) {
          Alert.alert('Registration Error', error.response.data.detail);
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all gyms
  const fetchGyms = async (): Promise<Gym[]> => {
    try {
      // Check API connection before fetching gyms
      const connected = await checkApiConnection();
      if (!connected) {
        return [];
      }
      
      const response = await axios.get(`${currentApiUrl}/api/gyms/all`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gyms', error);
      return [];
    }
  };

  // Fetch plans for a specific gym
  const fetchPlans = async (gym_id: string): Promise<Plan[]> => {
    try {
      // Check API connection before fetching plans
      const connected = await checkApiConnection();
      if (!connected) {
        return [];
      }
      
      const response = await axios.get(`${currentApiUrl}/api/plans/gym/${gym_id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching plans', error);
      return [];
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Clear secure storage
      await AuthService.logout();
      setUser(null);
      
      // Clear token refresh interval
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
        tokenRefreshInterval.current = null;
      }
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      apiConnected,
      isOwnerMode,
      setIsOwnerMode,
      login, 
      register, 
      logout, 
      fetchGyms, 
      fetchPlans,
      checkApiConnection
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};