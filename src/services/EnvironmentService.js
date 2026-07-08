// Environment Service - Real Weather and AQI Data
import * as Location from 'expo-location';
import axios from 'axios';
import Constants from 'expo-constants';

class EnvironmentService {
  constructor() {
    // DEBUG: Log all possible sources of API key
    console.log('[EnvironmentService] Checking API key sources:');
    console.log('  - app.json extra:', Constants.expoConfig?.extra?.weatherApiKey ? 'FOUND' : 'NOT FOUND');
    console.log('  - .env EXPO_PUBLIC_WEATHER_API_KEY:', process.env.EXPO_PUBLIC_WEATHER_API_KEY ? 'FOUND' : 'NOT FOUND');
    console.log('  - manifest extra:', Constants.manifest?.extra?.weatherApiKey ? 'FOUND' : 'NOT FOUND');

    // Priority: .env file first (most reliable), then app.json
    this.apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY ||
      Constants.expoConfig?.extra?.weatherApiKey ||
      Constants.manifest?.extra?.weatherApiKey;

    // DEBUG: Log the actual key being used (first few chars for security)
    if (this.apiKey) {
      console.log('[EnvironmentService] Using API key:', this.apiKey.substring(0, 8) + '...');
      console.log('[EnvironmentService] API key length:', this.apiKey.length);
    } else {
      console.warn('[EnvironmentService] No API key found!');
    }

    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  getAQICategory(aqiIndex) {
    if (aqiIndex === 1) return 'Good';
    if (aqiIndex === 2) return 'Fair';
    if (aqiIndex === 3) return 'Moderate';
    if (aqiIndex === 4) return 'Poor';
    if (aqiIndex === 5) return 'Very Poor';
    return 'Unknown';
  }

  getHealthRecommendation(aqiIndex) {
    if (aqiIndex === 1) return 'Air quality is good. Great day for outdoor activities.';
    if (aqiIndex === 2) return 'Air quality is fair. Most people can stay active outdoors.';
    if (aqiIndex === 3) return 'Air quality is moderate. Sensitive individuals should limit long outdoor exertion.';
    if (aqiIndex === 4) return 'Air quality is poor. Reduce outdoor activity; consider indoor workouts.';
    if (aqiIndex === 5) return 'Air quality is very poor. Avoid outdoor activity; stay indoors if possible.';
    return 'Air quality information is unavailable.';
  }

  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[EnvironmentService] Permission request failed:', error);
      return false;
    }
  }

  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('[EnvironmentService] Location fetch failed:', error);
      throw error;
    }
  }

  async getWeatherData() {
    try {
      if (!this.apiKey) {
        console.warn('[EnvironmentService] Weather API key not configured. Using fallback data.');
        return this.getFallbackWeatherData();
      }

      const location = await this.getCurrentLocation();

      return await this.getWeatherDataForCoords(location.latitude, location.longitude);
    } catch (error) {
      // DEBUG: Log detailed error info
      console.error('[EnvironmentService] Weather fetch error details:');
      console.error('  - Message:', error.message);
      console.error('  - Code:', error.code);
      console.error('  - Response status:', error.response?.status);
      console.error('  - Response data:', error.response?.data);
      console.error('  - Request URL:', error.config?.url);

      // Handle 401 Unauthorized - API key is invalid
      if (error.response?.status === 401) {
        console.error('[EnvironmentService] Weather API key is invalid (401)');
        console.error('[EnvironmentService] The key being used was:', this.apiKey);
        return this.getFallbackWeatherData();
      }

      console.error('[EnvironmentService] Weather fetch failed:', error.message);
      return this.getFallbackWeatherData();
    }
  }

  async getWeatherDataForCoords(lat, lon) {
    // DEBUG: Construct and log the full URL
    const requestUrl = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey?.substring(0, 8)}...&units=metric`;
    console.log('[EnvironmentService] Making request to:', requestUrl);
    console.log('[EnvironmentService] Full API key being sent:', this.apiKey);

    const response = await axios.get(
      `${this.baseUrl}/weather`,
      {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
        },
        timeout: 10000,
        validateStatus: (status) => status < 500,
      }
    );

    console.log('[EnvironmentService] Response status:', response.status);

    if (response.status !== 200) {
      console.error('[EnvironmentService] API returned error:', response.status, response.data);
      if (response.status === 401) {
        console.error('[EnvironmentService] 401 - API key is invalid!');
        console.error('[EnvironmentService] Key being used:', this.apiKey);
      }
      return this.getFallbackWeatherData();
    }

    const data = response.data;

    // Extract rain data if available
    let rain = null;
    if (data.rain && typeof data.rain['1h'] === 'number') {
      rain = data.rain['1h'];
    } else if (data.rain && typeof data.rain['3h'] === 'number') {
      rain = data.rain['3h'];
    }

    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      aqi: null,
      aqiCategory: 'Unknown',
      location: data.name,
      description: data.weather[0].description,
      windSpeed: data.wind?.speed || 0,
      rain: data.rain ? data.rain['1h'] || 0 : 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback data when API fails
  getFallbackWeatherData() {
    return {
      temperature: 24,
      humidity: 65,
      aqi: null,
      aqiCategory: 'Unknown',
      location: 'Campus',
      description: 'Clear',
      windSpeed: 5,
      rain: 0,
      timestamp: new Date().toISOString(),
      isFallback: true,
    };
  }

  async getAirQualityData(lat, lon) {
    try {
      if (!this.apiKey) {
        return this.getFallbackAQIData();
      }

      const response = await axios.get(
        `${this.baseUrl}/air_pollution`,
        {
          params: {
            lat,
            lon,
            appid: this.apiKey,
          },
          timeout: 10000,
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status !== 200) {
        console.error('[EnvironmentService] AQI API returned error:', response.status, response.data);
        return this.getFallbackAQIData();
      }

      const item = response.data?.list?.[0];
      const aqiIndex = item?.main?.aqi;
      const components = item?.components ?? {};

      const pm25 = components.pm2_5 ?? null;
      const pm10 = components.pm10 ?? null;
      const no2 = components.no2 ?? null;
      const o3 = components.o3 ?? null;

      return {
        aqiIndex: typeof aqiIndex === 'number' ? aqiIndex : null,
        aqiCategory: this.getAQICategory(aqiIndex),
        healthRecommendation: this.getHealthRecommendation(aqiIndex),
        pm25,
        pm10,
        no2,
        o3,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[EnvironmentService] AQI fetch failed:', error.message);
      return this.getFallbackAQIData();
    }
  }

  async getAQIData() {
    try {
      if (!this.apiKey) {
        return this.getFallbackAQIData();
      }

      const location = await this.getCurrentLocation();
      return await this.getAirQualityData(location.latitude, location.longitude);
    } catch (error) {
      console.error('[EnvironmentService] AQI fetch failed:', error.message);
      return this.getFallbackAQIData();
    }
  }

  getFallbackAQIData() {
    return {
      aqiIndex: null,
      aqiCategory: 'Unknown',
      healthRecommendation: 'Air quality information is unavailable.',
      pm25: null,
      pm10: null,
      no2: null,
      o3: null,
      timestamp: new Date().toISOString(),
      isFallback: true,
    };
  }

  async getEnvironmentData() {
    try {
      const location = await this.getCurrentLocation();

      const [weather, aqi] = await Promise.allSettled([
        this.getWeatherDataForCoords(location.latitude, location.longitude),
        this.getAirQualityData(location.latitude, location.longitude),
      ]);

      const result = {
        weather: weather.status === 'fulfilled' ? weather.value : null,
        aqi: aqi.status === 'fulfilled' ? aqi.value : null,
        error: null,
      };

      if (weather.reason) {
        result.error = weather.reason.message;
      } else if (aqi.reason) {
        result.error = aqi.reason.message;
      }

      return result;
    } catch (error) {
      console.error('[EnvironmentService] Environment data fetch failed:', error);
      return {
        weather: this.getFallbackWeatherData(),
        aqi: this.getFallbackAQIData(),
        error: error.message,
      };
    }
  }
}

export const environmentService = new EnvironmentService();
export default environmentService;
