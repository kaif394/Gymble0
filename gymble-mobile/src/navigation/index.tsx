import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderButton, Text } from '@react-navigation/elements';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image } from 'react-native';
import bell from '../assets/bell.png';
import newspaper from '../assets/newspaper.png';
import { Home } from './screens/Home';
import { Dashboard } from './screens/Dashboard';
import { Profile } from './screens/Profile';
import { Settings } from './screens/Settings';
import { Updates } from './screens/Updates';
import { NotFound } from './screens/NotFound';
import { Login } from './screens/Login';
import { Register } from './screens/Register';
import { CheckIn } from './screens/CheckIn';
import { useAuth } from '../context/AuthContext';
import React from 'react';

// Define the navigation types for type safety
export type RootStackParamList = {
  Auth: undefined;
  Root: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  HomeTabs: undefined;
  Profile: { user: string };
  Settings: undefined;
  NotFound: undefined;
  CheckIn: undefined;
};

// Create the tab navigator
const Tab = createBottomTabNavigator();

// Create the stack navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNavigator = createNativeStackNavigator<RootStackParamList>();
const RootStackNavigator = createNativeStackNavigator<RootStackParamList>();

// HomeTabs component
function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Home" 
        component={Dashboard} 
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={newspaper}
              tintColor={color}
              style={{
                width: size,
                height: size,
              }}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Updates" 
        component={Updates} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Image
              source={bell}
              tintColor={color}
              style={{
                width: size,
                height: size,
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack for Login and Registration screens
function AuthStack() {
  return (
    <AuthStackNavigator.Navigator>
      <AuthStackNavigator.Screen 
        name="Login" 
        component={Login} 
        options={{ headerShown: false }}
      />
      <AuthStackNavigator.Screen 
        name="Register" 
        component={Register} 
        options={{ headerShown: false }}
      />
    </AuthStackNavigator.Navigator>
  );
}

// Main app stack for authenticated users
function RootStack() {
  return (
    <RootStackNavigator.Navigator>
      <RootStackNavigator.Screen 
        name="HomeTabs" 
        component={HomeTabs} 
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <RootStackNavigator.Screen 
        name="Profile" 
        component={Profile}
      />
      <RootStackNavigator.Screen 
        name="Settings" 
        component={Settings} 
        options={({ navigation }) => ({
          presentation: 'modal',
          headerRight: () => (
            <HeaderButton onPress={navigation.goBack}>
              <Text>Close</Text>
            </HeaderButton>
          ),
        })}
      />
      <RootStackNavigator.Screen 
        name="NotFound" 
        component={NotFound} 
        options={{
          title: '404',
        }}
      />
      <RootStackNavigator.Screen 
        name="CheckIn" 
        component={CheckIn} 
        options={{
          title: 'Check In/Out',
        }}
      />
    </RootStackNavigator.Navigator>
  );
}

// App navigator that conditionally renders either AuthStack or RootStack based on auth state
export function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Auth">
      <Stack.Screen 
        name="Auth" 
        component={AuthStack} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Root" 
        component={RootStack} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
