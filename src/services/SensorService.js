import { Pedometer } from 'expo-sensors';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_STEPS_KEY = '@today_steps';
const LAST_STEP_DATE_KEY = '@last_step_date';
const STRIDE_KM_PER_STEP = 0.00076; // 0.76 meters per step avg
const CALORIES_PER_STEP = 0.04;    // ~0.04 calories burned per step

class SensorService {
  constructor() {
    this.subscription = null;
    this.stepCount = 0;
    this.isAvailable = false;
    this.listeners = [];
    this.permissionStatus = null;
    this.isTracking = false;
  }

  async checkAvailability() {
    try {
      const result = await Pedometer.isAvailableAsync();
      console.log('[SensorService] Pedometer Availability:', result);
      this.isAvailable = result;
      return result;
    } catch (error) {
      console.error('[SensorService] Availability Error:', error);
      this.isAvailable = false;
      return false;
    }
  }

  async requestPermissions() {
    try {
      console.log('[SensorService] Requesting Physical Activity Permission...');
      const { granted, status, canAskAgain } = await Pedometer.requestPermissionsAsync();
      console.log('[SensorService] Pedometer Permission Result:', { granted, status });

      this.permissionStatus = status;

      if (!granted) {
        // If permission is denied and the OS won't show the prompt again,
        // guide the user to Settings.
        if (canAskAgain === false) {
          Alert.alert(
            'Permission required',
            'To track steps, allow Physical Activity permission in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  try {
                    Linking.openSettings();
                  } catch (e) {
                    console.error('[SensorService] openSettings Error:', e);
                  }
                },
              },
            ]
          );
        }
      }

      return granted;
    } catch (error) {
      console.error('[SensorService] requestPermissions Error:', error);
      return false;
    }
  }

  async startTracking(callback) {
    const available = await this.checkAvailability();
    if (!available) {
      console.error('[SensorService] Pedometer not available on device');
      return;
    }

    // If already tracking, do nothing
    if (this.isTracking) {
      console.log('[SensorService] Already tracking, ignoring startTracking');
      return;
    }

    try {
      const { granted, status, canAskAgain } = await Pedometer.getPermissionsAsync();
      console.log('[SensorService] Current permission status:', { status, granted, canAskAgain });

      // If already granted, proceed. Otherwise request once to trigger the native prompt.
      const isGranted = granted ? true : await this.requestPermissions();

      if (!isGranted) {
        console.log('[SensorService] Tracking aborted: Permission not granted');
        return;
      }

      // Mark as tracking
      this.isTracking = true;

      console.log('[SensorService] Starting watchStepCount...');
      this.subscription = Pedometer.watchStepCount(result => {
        console.log('[SensorService] Steps Received:', result.steps);
        this.stepCount = result.steps;
        if (callback) callback(this.stepCount);
        this.notifyListeners(this.stepCount);
      });
    } catch (error) {
      console.error('[SensorService] startTracking Error:', error);
    }
  }

  stopTracking() {
    if (this.subscription) {
      console.log('[SensorService] Stopping tracking...');
      this.subscription.remove();
      this.subscription = null;
    }
    this.isTracking = false;
  }

  addListener(callback) {
    if (!this.listeners.includes(callback)) {
      this.listeners.push(callback);
    }
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(steps) {
    this.listeners.forEach((callback) => callback(steps));
  }

  async loadPersistedSteps() {
    try {
      const lastDate = await AsyncStorage.getItem(LAST_STEP_DATE_KEY);
      const today = new Date().toDateString();
      if (lastDate === today) {
        const saved = await AsyncStorage.getItem(DAILY_STEPS_KEY);
        if (saved) {
          this.stepCount = parseInt(saved, 10);
          this.lastStepDate = today;
        }
      } else {
        // New day: reset and clear old value
        await AsyncStorage.removeItem(DAILY_STEPS_KEY);
        await AsyncStorage.setItem(LAST_STEP_DATE_KEY, today);
        this.stepCount = 0;
        this.lastStepDate = today;
      }
    } catch (error) {
      console.error("[SensorService] Load Persisted Error:", error);
      this.stepCount = 0;
    }
  }

  async persistSteps() {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(DAILY_STEPS_KEY, String(this.stepCount || 0));
      await AsyncStorage.setItem(LAST_STEP_DATE_KEY, today);
      this.lastStepDate = today;
    } catch (error) {
      console.error("[SensorService] Persist Steps Error:", error);
    }
  }

  getSteps() {
    return this.stepCount;
  }

  // Alias used by HomeScreen
  getTodaySteps() {
    return this.stepCount;
  }

  getKm() {
    return (this.stepCount || 0) * STRIDE_KM_PER_STEP;
  }

  getCalories() {
    return (this.stepCount || 0) * CALORIES_PER_STEP;
  }

  async incrementStep(callback) {
    if (!this.permissionStatus || this.permissionStatus !== 'granted') {
      const granted = await this.requestPermissions();
      if (!granted) return;
    }
    this.stepCount += 1;
    console.log('[SensorService] Incremented step count to:', this.stepCount);
    if (callback) callback(this.stepCount);
    this.notifyListeners(this.stepCount);
  }
}

export const sensorService = new SensorService();
export default sensorService;
