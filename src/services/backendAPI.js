import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// For physical device testing, use your laptop's local IP address
// You can find this by running 'ipconfig getifaddr en0' on Mac
// Updated to use user's actual IP from earlier conversation
// For physical device testing, use your laptop's local IP address
// You can find this by running 'ipconfig getifaddr en0' on Mac
const LOCAL_IP = '10.67.66.163';

const getLanHost = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.hostUri;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host) return host;
  }
  return LOCAL_IP;
};

// For Android emulator: use 10.0.2.2 to access host localhost
// For iOS simulator: use localhost
// For physical device: use actual IP address
const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) return process.env.EXPO_PUBLIC_BACKEND_URL;
  if (process.env.EXPO_PUBLIC_NUTRITION_API_URL) return process.env.EXPO_PUBLIC_NUTRITION_API_URL;

  if (Platform.OS === 'web') return 'http://localhost:5001';

  // Android emulator accesses host via 10.0.2.2
  // Physical Android device uses the computer's IP
  if (Platform.OS === 'android') {
    const host = getLanHost();
    console.log('[BackendAPI] Using Android host:', host);
    return `http://${host}:5001`;
  }

  return `http://${getLanHost()}:5001`;
};

const BACKEND_URL = getBackendUrl();
console.log('[BackendAPI] Backend URL:', BACKEND_URL);

class BackendAPI {
  constructor() {
    this.baseURL = BACKEND_URL;
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // Increased from 30s to 120s for complex AI flows
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async analyzeFoodImage(imageUri, context = '') {
    try {
      console.log('[BackendAPI] Analyzing food image:', imageUri);

      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'food_image.jpg',
      });
      if (context) {
        formData.append('context', context);
      }

      const response = await this.axios.post('/api/nutrition/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[BackendAPI] Analysis result:', response.data);
      return response.data;
    } catch (error) {
      console.error('[BackendAPI] Error analyzing food:', error);
      if (error.response) {
        console.error('[BackendAPI] Server response:', error.response.data);
        throw new Error(error.response.data.error || 'Server error');
      } else if (error.request) {
        throw new Error('No response from server. Check if backend is running.');
      } else {
        throw new Error('Request setup error: ' + error.message);
      }
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/api/health`);
      return response.data;
    } catch (error) {
      console.error('[BackendAPI] Connection test failed:', error);
      throw error;
    }
  }

  async getHealthSummary(payload) {
    try {
      console.log('[BackendAPI] Requesting health insights...');
      const response = await this.axios.post('/api/health_summary', payload, {
        timeout: 180000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('[BackendAPI] Error getting health summary:', error);
      if (error.response) {
        throw new Error(error.response.data?.error || 'Health insights server error');
      }
      if (error.request) {
        throw new Error('No response from health insights server. Check if it is running.');
      }
      throw new Error('Request setup error: ' + error.message);
    }
  }

  // Analyze food from text (food name + serving info)
  async analyzeFoodText(foodName, servingInfo = '') {
    try {
      console.log('[BackendAPI] Analyzing food text:', foodName, servingInfo);
      console.log('[BackendAPI] Full URL:', this.baseURL + '/api/nutrition/analyze-text');

      const response = await this.axios.post('/api/nutrition/analyze-text', {
        food_name: foodName,
        serving_info: servingInfo,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout for AI calls
      });

      console.log('[BackendAPI] Text analysis result:', response.data);
      return response.data;
    } catch (error) {
      console.error('[BackendAPI] Error analyzing food text:', error.message);
      console.error('[BackendAPI] Error code:', error.code);
      console.error('[BackendAPI] Error response:', error.response?.data);
      if (error.response) {
        throw new Error(error.response.data?.error || 'Text analysis server error');
      }
      if (error.request) {
        throw new Error('No response from server. Check if backend is running at ' + this.baseURL);
      }
      throw new Error('Request setup error: ' + error.message);
    }
  }

  // Analyze mess menu image
  async analyzeMessMenu(imageUri) {
    try {
      console.log('[BackendAPI] Analyzing mess menu image...');

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'mess_menu.jpg',
      });

      const response = await this.axios.post('/api/nutrition/analyze-mess-menu', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[BackendAPI] Mess menu analysis result:', response.data);
      return response.data;
    } catch (error) {
      console.error('[BackendAPI] Error analyzing mess menu:', error);
      if (error.response) {
        throw new Error(error.response.data?.error || 'Mess menu analysis server error');
      }
      if (error.request) {
        throw new Error('No response from server. Check if backend is running.');
      }
      throw new Error('Request setup error: ' + error.message);
    }
  }
}

export default new BackendAPI();
