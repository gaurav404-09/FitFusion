import { requireNativeModule } from 'expo-modules-core';

interface ExpoScreenTimeModuleType {
  hasUsagePermission(): boolean;
  requestUsagePermission(): void;
  getDailyUsageStats(): Record<string, number>;
}

export default requireNativeModule<ExpoScreenTimeModuleType>('ExpoScreenTime');
