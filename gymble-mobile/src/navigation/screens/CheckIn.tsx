import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, SafeAreaView, Platform, Vibration } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../../config';

export function CheckIn() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const cameraRef = useRef(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [checkInMethod, setCheckInMethod] = useState<'qr' | 'manual' | null>(null);

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === 'granted');

      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus.status === 'granted');
    })();
  }, []);

  const processCheckIn = async (qrCode: string) => {
    setLoading(true);
    if (!hasLocationPermission) {
        Alert.alert('Permission Denied', 'Location permission is required to check in.');
        setLoading(false);
        return;
    }

    try {
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const response = await axios.post(`${API_URL}/api/attendance/mark_new`, 
            { qr_code: qrCode, latitude, longitude },
            { headers: { Authorization: `Bearer ${user?.token}` } }
        );

        Vibration.vibrate();
        Alert.alert('Success', response.data.message);
        navigation.goBack();

    } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Check-in failed. Please try again.';
        Alert.alert('Error', errorMessage);
    } finally {
        setLoading(false);
        setScanned(false); // Allow scanning again
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    processCheckIn(data);
  };

  const handleManualCheckIn = () => {
    if (manualCode.length === 6) {
        processCheckIn(manualCode);
    } else {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code.');
    }
  };

  if (hasCameraPermission === null || hasLocationPermission === null) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#000" /></View>;
  }
  if (hasCameraPermission === false) {
    return <View style={styles.container}><Text>No access to camera. Please grant permission in settings.</Text></View>;
  }
  if (hasLocationPermission === false) {
    return <View style={styles.container}><Text>No access to location. Please grant permission in settings.</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {!checkInMethod ? (
        <View style={styles.selectionContainer}>
          <TouchableOpacity style={styles.button} onPress={() => setCheckInMethod('qr')}>
            <Text style={styles.buttonText}>Scan QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => setCheckInMethod('manual')}>
            <Text style={styles.buttonText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      ) : checkInMethod === 'qr' ? (
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            ratio='16:9'
          />
          <View style={styles.scanFrame} />
          {loading && <ActivityIndicator size="large" color="#fff" />}
        </View>
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.manualInstruction}>Enter the 6-digit code provided by the gym:</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
            value={manualCode}
            onChangeText={setManualCode}
          />
          <TouchableOpacity style={styles.button} onPress={handleManualCheckIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check In</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}


  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualInstruction: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
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
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setCheckInMethod(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
    backgroundColor: '#fff',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center