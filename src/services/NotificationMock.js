// Mock expo-notifications module for Expo Go compatibility
// This prevents "Cannot find native module 'ExpoPushTokenManager'" errors

const mockNotifications = {
  setNotificationHandler: async () => {},
  getPermissionsAsync: async () => ({ status: 'granted' }),
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  setNotificationChannelAsync: async () => {},
  scheduleNotificationAsync: async () => 'mock-id',
  cancelScheduledNotificationAsync: async () => {},
  dismissNotificationAsync: async () => {},
  dismissAllNotificationsAsync: async () => {},
  getBadgeCountAsync: async () => 0,
  setBadgeCountAsync: async () => {},
  AndroidImportance: {
    DEFAULT: 3,
    MAX: 5,
  },
};

export default mockNotifications;
