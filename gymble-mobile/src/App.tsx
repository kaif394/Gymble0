import { Assets as NavigationAssets } from '@react-navigation/elements';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './navigation';
import { AuthProvider } from './context/AuthContext';

Asset.loadAsync([
  ...NavigationAssets,
  require('./assets/newspaper.png'),
  require('./assets/bell.png'),
]);

SplashScreen.preventAutoHideAsync();

export function App() {
  return (
    <AuthProvider>
      <NavigationContainer
        linking={{
          enabled: 'auto',
          prefixes: [
            // Scheme matches the one defined in app.json
            'gymblemobile://',
          ],
        }}
        onReady={() => {
          SplashScreen.hideAsync();
        }}
      >
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
