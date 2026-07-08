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
        /* Fix root-level scroll trap from React Navigation on web */
        html {
          overflow: auto !important;
          height: 100% !important;
        }
        body {
          overflow: auto !important;
          height: 100% !important;
          margin: 0;
        }
        #root {
          overflow: auto !important;
          height: 100% !important;
          display: flex;
          flex-direction: column;
        }
        /*
         * React Navigation renders each screen as position:absolute.
         * On web this creates a scroll trap. We must allow overflow
         * on the innermost screen wrapper so the user can scroll.
         */
        #root > div,
        #root > div > div {
          flex: 1;
          overflow: auto !important;
          position: relative !important;
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
