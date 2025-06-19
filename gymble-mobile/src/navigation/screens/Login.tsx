import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>Gymble</Text>
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
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#666',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});