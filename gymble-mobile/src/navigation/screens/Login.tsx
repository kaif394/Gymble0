import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Checking connection...');
  const { login, isLoading, apiConnected, checkApiConnection } = useAuth();
  const navigation = useNavigation();

  // Check API connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkApiConnection();
      setConnectionStatus(connected ? 'Connected' : 'Not connected to server');
    };
    
    checkConnection();
  }, []);

  // Retry connection
  const handleRetryConnection = async () => {
    setConnectionStatus('Checking connection...');
    const connected = await checkApiConnection();
    setConnectionStatus(connected ? 'Connected' : 'Not connected to server');
    
    if (!connected) {
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Check connection before attempting login
    const connected = await checkApiConnection();
    if (!connected) {
      setConnectionStatus('Not connected to server');
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
      return;
    }

    const success = await login(email, password);
    if (!success) {
      Alert.alert('Login Failed', 'Invalid email or password');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>GYMBLE</Text>
          <Text style={styles.subtitle}>Login to your account</Text>
          
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
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.registerContainer}>
              <Text>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerText}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
    marginBottom: 25,
    color: '#666',
    textAlign: 'center',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    marginBottom: 30,
  },
  registerText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});