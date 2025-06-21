import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedGym, setSelectedGym] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [gyms, setGyms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loadingGyms, setLoadingGyms] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Checking connection...');
  
  const { register, isLoading, fetchGyms, fetchPlans, apiConnected, checkApiConnection } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Check API connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkApiConnection();
      setConnectionStatus(connected ? 'Connected' : 'Not connected to server');
    };
    
    checkConnection();
  }, []);

  // Fetch gyms on component mount
  useEffect(() => {
    const getGyms = async () => {
      setLoadingGyms(true);
      try {
        // Check connection before fetching gyms
        const connected = await checkApiConnection();
        if (!connected) {
          setConnectionStatus('Not connected to server');
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please check your internet connection and try again.'
          );
          setLoadingGyms(false);
          return;
        }
        
        setConnectionStatus('Connected');
        const gymList = await fetchGyms();
        setGyms(gymList);
        
        // Set default selected gym if gyms are available
        if (gymList.length > 0) {
          setSelectedGym(gymList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch gyms:', error);
        Alert.alert('Error', 'Failed to fetch gyms. Please try again.');
      } finally {
        setLoadingGyms(false);
      }
    };
    
    getGyms();
  }, []);

  // Fetch plans when a gym is selected
  useEffect(() => {
    const getPlans = async () => {
      if (selectedGym) {
        setLoadingPlans(true);
        try {
          const planList = await fetchPlans(selectedGym);
          setPlans(planList);
          
          // Set default selected plan if plans are available
          if (planList.length > 0) {
            setSelectedPlan(planList[0].id);
          } else {
            setSelectedPlan('');
          }
        } catch (error) {
          console.error('Failed to fetch plans:', error);
          Alert.alert('Error', 'Failed to fetch plans. Please try again.');
        } finally {
          setLoadingPlans(false);
        }
      }
    };
    
    getPlans();
  }, [selectedGym]);

  // Retry connection
  const handleRetryConnection = async () => {
    setConnectionStatus('Checking connection...');
    const connected = await checkApiConnection();
    if (connected) {
      setConnectionStatus('Connected');
      // Reload gyms
      const getGyms = async () => {
        setLoadingGyms(true);
        try {
          const gymList = await fetchGyms();
          setGyms(gymList);
          
          // Set default selected gym if gyms are available
          if (gymList.length > 0) {
            setSelectedGym(gymList[0].id);
          }
        } catch (error) {
          console.error('Failed to fetch gyms:', error);
        } finally {
          setLoadingGyms(false);
        }
      };
      
      getGyms();
    } else {
      setConnectionStatus('Not connected to server');
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    }
  };

  const handleRegister = async () => {
    // Validate inputs
    if (!name || !email || !phone || !password || !confirmPassword || !selectedGym || !selectedPlan) {
      Alert.alert('Error', 'Please fill in all fields and select a gym and plan');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Basic phone validation
    if (!/^[+]?[\d\s\-()]{10,15}$/.test(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      // Check connection before attempting registration
      const connected = await checkApiConnection();
      if (!connected) {
        setConnectionStatus('Not connected to server');
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
        return;
      }
      
      console.log('Attempting registration...');
      // Attempt registration
      const success = await register(name, email, password, selectedGym, selectedPlan, phone);
      console.log('Registration result:', success);
      
      if (success) {
        console.log('Registration successful, navigating to Home');
        // Explicitly navigate to Root screen after successful registration
        navigation.navigate('Root');
      } else {
        Alert.alert('Registration Failed', 'Could not register with the provided details');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', 'An unexpected error occurred during registration');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>GYMBLE</Text>
          <Text style={styles.subtitle}>Create your account</Text>
          
          {/* Connection status indicator */}
          <View style={styles.connectionContainer}>
            <Text style={styles.connectionLabel}>Server connection: </Text>
            <Text 
              style={[
                styles.connectionStatus, 
                connectionStatus === 'Connected' ? styles.connected : 
                connectionStatus === 'Checking connection...' ? styles.checking : 
                styles.notConnected
              ]}
            >
              {connectionStatus}
            </Text>
            {connectionStatus !== 'Connected' && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetryConnection}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <Text style={styles.sectionLabel}>Select Gym</Text>
            {loadingGyms ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <View style={styles.pickerContainer}>
                {gyms.length > 0 ? (
                  <Picker
                    selectedValue={selectedGym}
                    onValueChange={(itemValue) => setSelectedGym(itemValue)}
                    style={styles.picker}
                  >
                    {gyms.map((gym) => (
                      <Picker.Item key={gym.id} label={gym.name} value={gym.id} />
                    ))}
                  </Picker>
                ) : (
                  <Text style={styles.noDataText}>No gyms available</Text>
                )}
              </View>
            )}
            
            <Text style={styles.sectionLabel}>Select Plan</Text>
            {loadingPlans ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <View style={styles.pickerContainer}>
                {plans.length > 0 ? (
                  <Picker
                    selectedValue={selectedPlan}
                    onValueChange={(itemValue) => setSelectedPlan(itemValue)}
                    style={styles.picker}
                  >
                    {plans.map((plan) => (
                      <Picker.Item 
                        key={plan.id} 
                        label={`${plan.name} - $${plan.price} (${plan.duration_days} days)`} 
                        value={plan.id} 
                      />
                    ))}
                  </Picker>
                ) : (
                  <Text style={styles.noDataText}>
                    {selectedGym ? 'No plans available for this gym' : 'Please select a gym first'}
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.loginContainer}>
              <Text>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4CAF50',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
    textAlign: 'center',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  connectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectionStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  connected: {
    color: 'green',
  },
  checking: {
    color: 'orange',
  },
  notConnected: {
    color: 'red',
  },
  retryButton: {
    marginLeft: 'auto',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    marginTop: 5,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  noDataText: {
    padding: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  loginText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});