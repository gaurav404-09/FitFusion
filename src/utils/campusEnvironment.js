/**
 * Campus Environment Matrix
 * Returns time-based simulated campus zone data for the AI Wellness Coach
 * Now uses real weather data from EnvironmentService when API key is configured
 */

import environmentService from '../services/EnvironmentService';

// Cache for weather data to avoid too many API calls
let cachedWeatherData = null;
let lastWeatherFetch = null;
const WEATHER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCurrentCampusEnvironment = async () => {
    const hour = new Date().getHours();

    let timePeriod;
    let zones;

    if (hour >= 6 && hour < 9) {
        // Morning (06:00 - 09:00)
        timePeriod = 'morning';
        zones = [
            { name: 'Main Gym', crowdLevel: 'Crowded', noiseLevel: '85dB', status: 'Open' },
            { name: 'Library', crowdLevel: 'Quiet', noiseLevel: '35dB', status: 'Open' },
            { name: 'Courtyard', crowdLevel: 'Moderate', noiseLevel: '50dB', status: 'Open' },
        ];
    } else if (hour >= 9 && hour < 17) {
        // Daytime (09:00 - 17:00)
        timePeriod = 'daytime';
        zones = [
            { name: 'Academic Blocks', crowdLevel: 'Crowded', noiseLevel: '75dB', status: 'Open' },
            { name: 'Main Gym', crowdLevel: 'Quiet', noiseLevel: '40dB', status: 'Open' },
            { name: 'SAC', crowdLevel: 'Moderate', noiseLevel: '60dB', status: 'Open' },
        ];
    } else if (hour >= 17 && hour < 21) {
        // Evening (17:00 - 21:00)
        timePeriod = 'evening';
        zones = [
            { name: 'Main Gym', crowdLevel: 'Packed', noiseLevel: '95dB', status: 'Open' },
            { name: 'SAC', crowdLevel: 'Loud', noiseLevel: '85dB', status: 'Open' },
            { name: 'Library', crowdLevel: 'Moderate', noiseLevel: '50dB', status: 'Open' },
        ];
    } else {
        // Night (21:00 - 06:00)
        timePeriod = 'night';
        zones = [
            { name: 'Library', crowdLevel: 'Crowded', noiseLevel: '65dB', status: 'Open' },
            { name: 'Courtyard', crowdLevel: 'Quiet', noiseLevel: '30dB', status: 'Open' },
            { name: 'Main Gym', crowdLevel: 'N/A', noiseLevel: 'N/A', status: 'Closed' },
        ];
    }

    // Get real weather data from EnvironmentService
    let weather;
    try {
        // Check if we have valid cached data
        const now = Date.now();
        if (cachedWeatherData && lastWeatherFetch && (now - lastWeatherFetch < WEATHER_CACHE_DURATION)) {
            weather = cachedWeatherData;
        } else {
            // Fetch fresh weather data
            const envData = await environmentService.getEnvironmentData();
            if (envData?.weather) {
                cachedWeatherData = {
                    aqi: envData.aqi?.aqi || null,
                    temperature: envData.weather.temperature,
                    humidity: envData.weather.humidity,
                    condition: envData.weather.description,
                    windSpeed: envData.weather.windSpeed,
                    rain: envData.weather.rain, // Add rain data
                };
                lastWeatherFetch = now;
                weather = cachedWeatherData;
            } else {
                // Fallback if API fails
                weather = {
                    aqi: 120,
                    temperature: 32,
                    humidity: 65,
                    windSpeed: 5,
                    rain: 0,
                    condition: 'Partly Cloudy',
                };
            }
        }
    } catch (error) {
        console.warn('[campusEnvironment] Failed to fetch weather:', error.message);
        // Fallback weather data
        weather = {
            aqi: 120,
            temperature: 32,
            humidity: 65,
            windSpeed: 5,
            rain: 0,
            condition: 'Partly Cloudy',
        };
    }

    return {
        timePeriod,
        hour,
        zones,
        weather,
        lastUpdated: new Date().toISOString(),
    };
};

// Helper to get just the zone recommendations
export const getZoneRecommendation = async (preference = 'quiet') => {
    const env = await getCurrentCampusEnvironment();
    const openZones = env.zones.filter(z => z.status === 'Open');

    if (preference === 'quiet') {
        return openZones.find(z => z.noiseLevel.includes('35') || z.noiseLevel.includes('30') || z.noiseLevel.includes('40')) || openZones[0];
    }
    if (preference === 'activity') {
        return openZones.find(z => z.crowdLevel === 'Packed' || z.crowdLevel === 'Crowded') || openZones[0];
    }
    return openZones[0];
};

export default getCurrentCampusEnvironment;

