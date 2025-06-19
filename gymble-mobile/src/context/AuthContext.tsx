import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL, getWorkingApiUrl, testApiConnection } from '../config';
import { Alert } from 'react-native';

// Define user type
type User = {
  id: string;
  name: string;
  email: string;
  gym_id?: string;
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
      (config) => {
        // Use the current working API URL
        if (config.url && config.url.startsWith(API_URL)) {
          config.url = config.url.replace(API_URL, currentApiUrl);
        }
        
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
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

  // Check if user is logged in on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          setUser(JSON.parse(userJson));
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
      
      const response = await axios.post(`${currentApiUrl}/api/auth/login`, { email, password })
        .catch(error => {
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
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
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
        console.log('Setting user data:', userData);
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
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
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      apiConnected,
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