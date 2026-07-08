const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude expo-notifications in Expo Go to prevent native module errors
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check if we're trying to resolve expo-notifications
  if (moduleName === 'expo-notifications' || moduleName.startsWith('expo-notifications/')) {
    // In Expo Go, we want to prevent this from being loaded
    // Return a mock module that does nothing
    return {
      filePath: __dirname + '/src/services/NotificationMock.js',
      type: 'sourceFile',
    };
  }
  
  // For all other modules, use default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
