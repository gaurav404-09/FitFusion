import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/services/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import sensorService from './src/services/SensorService';
import SyncService from './src/services/SyncService';
import notificationService from './src/services/NotificationService';

export default function App() {
  useEffect(() => {
    // Inject web scrolling styles to force layout to allow scrolling
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        body, html, #root {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: 100% !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Start step tracking as early as possible
    sensorService.startTracking();

    // Register for notifications
    notificationService.register();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
