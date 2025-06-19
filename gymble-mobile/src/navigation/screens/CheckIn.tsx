import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../../config';

export function CheckIn() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  
  // States for permissions and scanning
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  
  // Fetch member data on component mount
  useEffect(() => {
    fetchMemberData();
    checkAttendanceStatus();
  }, []);
  
  // Request camera permissions
  useEffect(() => {
    (async () => {
      try {
        // Check if Camera and its Constants are available
        if (!Camera || !Camera.Constants) {
          console.log('Camera or Camera.Constants is not available');
          setHasPermission(false);
          return;
        }
        
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.log('Error requesting camera permissions:', error);
        setHasPermission(false);
        Alert.alert('Permission Error', 'Could not request camera permissions');
      }
    })();
  }, []);
  
  // Fetch member data to get memberId and gymId
  const fetchMemberData = async () => {
    try {
      if (!user?.token) {
        Alert.alert('Error', 'Authentication token missing. Please log in again.');
        return;
      }
      
      const headers = {
        Authorization: `Bearer ${user.token}`
      };
      
      const response = await axios.get(`${API_URL}/api/members/me`, { headers });
      setMemberId(response.data.id);
      setGymId(response.data.gym_id);
    } catch (error) {
      console.error('Error fetching member data:', error);
      Alert.alert('Error', 'Failed to fetch member data');
    }
  };
  
  // Check if member is already checked in
  const checkAttendanceStatus = async () => {
    try {
      if (!user?.token) return;
      
      const headers = {
        Authorization: `Bearer ${user.token}`
      };
      
      const response = await axios.get(`${API_URL}/api/attendance/my-status`, { headers });
      setIsCheckedIn(response.data.status === 'checked_in');
    } catch (error) {
      console.error('Error checking attendance status:', error);
    }
  };
  
  // Handle QR code scan
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Prevent multiple scans
    if (loading) return;
    
    // Check if camera is available
    if (!Camera || !Camera.Constants) {
      console.log('Camera or Camera.Constants is not available');
      Alert.alert('Error', 'Camera is not available');
      setScanning(false);
      return;
    }
    
    setScanning(false);
    setLoading(true);
    processQRCode(data);
  };

  // Process the QR code data
  const processQRCode = async (data) => {
    try {
      if (!user?.token) {
        Alert.alert('Error', 'Authentication token missing');
        setLoading(false);
        return;
      }
      
      const headers = {
        Authorization: `Bearer ${user.token}`
      };
      
      const response = await axios.post(
        `${API_URL}/api/attendance/mark`,
        {
          qr_code_data: data,
          device_info: `Mobile App - ${Platform.OS}`
        },
        { headers }
      );
      
      // Update check-in status
      await checkAttendanceStatus();
      
      Alert.alert(
        isCheckedIn ? 'Checked Out' : 'Checked In',
        isCheckedIn ? 'You have successfully checked out.' : 'You have successfully checked in.'
      );
      
      // Navigate back to dashboard
      navigation.goBack();
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process QR code');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle manual code entry
  const handleManualEntry = async () => {
    if (manualCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    
    try {
      if (!user?.token || !memberId) {
        Alert.alert('Error', 'Authentication token or member ID missing');
        setLoading(false);
        return;
      }
      
      const headers = {
        Authorization: `Bearer ${user.token}`
      };
      
      // For manual entry, we need to construct a request that mimics the QR code data
      // This is a simplified approach - in a real app, you might need to validate the code on the server
      const response = await axios.post(
        `${API_URL}/api/attendance/mark`,
        {
          qr_code_data: `GYMBLE_ATTENDANCE:${gymId}:${manualCode}`,
          device_info: `Mobile App - Manual Entry`
        },
        { headers }
      );
      
      // Update check-in status
      await checkAttendanceStatus();
      
      Alert.alert(
        isCheckedIn ? 'Checked Out' : 'Checked In',
        isCheckedIn ? 'You have successfully checked out.' : 'You have successfully checked in.'
      );
      
      // Navigate back to dashboard
      navigation.goBack();
    } catch (error) {
      console.error('Error with manual code:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };
  
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }
  
  // Function to render camera with error handling
  const renderCamera = () => {
    try {
      return (
        <Camera
          ref={cameraRef}
          style={styles.scanner}
          type={Camera.Constants && Camera.Constants.Type ? Camera.Constants.Type.back : undefined}
          onBarCodeScanned={handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: ['qr', 'code128', 'code39', 'code93', 'ean13', 'ean8'],
          }}
        />
      );
    } catch (error) {
      console.log('Error rendering camera:', error);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera Error</Text>
          <Text>There was an error initializing the camera.</Text>
        </View>
      );
    }
  };

  // Render component
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{isCheckedIn ? 'Check Out' : 'Check In'}</Text>
            
            {scanning ? (
              <View style={styles.scannerContainer}>
                {hasPermission && Camera && Camera.Constants ? renderCamera() : (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Camera Not Available</Text>
                    <Text>Please make sure camera permissions are granted.</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setScanning(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                <Text style={styles.sectionTitle}>Option 1: Scan QR Code</Text>
                {hasPermission === false ? (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      Camera permission denied. Please enable camera access in your device settings.
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.button}
                    onPress={() => setScanning(true)}
                  >
                    <Text style={styles.buttonText}>Open Scanner</Text>
                  </TouchableOpacity>
                )}
                
                <Text style={[styles.sectionTitle, styles.manualTitle]}>Option 2: Enter Code Manually</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  value={manualCode}
                  onChangeText={setManualCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity 
                  style={styles.button}
                  onPress={handleManualEntry}
                >
                  <Text style={styles.buttonText}>Submit Code</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.backButtonText}>Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  optionsContainer: {
    flex: 1,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    alignSelf: 'flex-start',
    color: '#555',
  },
  manualTitle: {
    marginTop: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: 'white',
    fontSize: 16,
  },
  scannerContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEEBA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
});