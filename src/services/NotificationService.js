import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
    constructor() {
        this._handlerConfigured = false;
    }

    async _getNotifications() {
        try {
            // In Expo Go, expo-notifications may not be fully available
            // Check if we're in Expo Go by trying to detect the environment
            const Constants = await import('expo-constants');
            const constants = Constants?.default?.expoConfig ?? Constants?.expoConfig;
            const isExpoGo = constants?.runtimeVersion === undefined;
            
            if (isExpoGo) {
                console.log('[NotificationService] Expo Go detected, skipping notifications');
                return null;
            }
            
            const mod = await import('expo-notifications');
            const Notifications = mod?.default ?? mod;
            if (!Notifications) return null;

            if (!this._handlerConfigured) {
                try {
                    Notifications.setNotificationHandler({
                        handleNotification: async () => ({
                            shouldShowAlert: true,
                            shouldPlaySound: true,
                            shouldSetBadge: true,
                        }),
                    });
                } catch (e) {
                    console.log('[NotificationService] Failed to set notification handler:', e);
                    return null;
                }
                this._handlerConfigured = true;
            }

            return Notifications;
        } catch (e) {
            console.log('[NotificationService] Notifications module not available:', e.message);
            return null;
        }
    }

    async register() {
        const Notifications = await this._getNotifications();
        if (!Notifications) return false;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            return false;
        }

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6366F1',
            });
        }

        return true;
    }

    async shouldSendRainNotification() {
        try {
            const key = 'last_rain_notification_ts';
            const lastTsRaw = await AsyncStorage.getItem(key);
            const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
            const now = Date.now();
            const sixHoursMs = 6 * 60 * 60 * 1000;
            if (Number.isFinite(lastTs) && now - lastTs < sixHoursMs) {
                return false;
            }
            await AsyncStorage.setItem(key, String(now));
            return true;
        } catch {
            return true;
        }
    }

    async sendRainSuggestionNotification({ condition, suggestions }) {
        const canNotify = await this.register();
        if (!canNotify) return;

        const Notifications = await this._getNotifications();
        if (!Notifications) return;

        const shouldSend = await this.shouldSendRainNotification();
        if (!shouldSend) return;

        const suggestionText = Array.isArray(suggestions) && suggestions.length
            ? suggestions.slice(0, 2).join(' • ')
            : 'Try an indoor workout or yoga today.';

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🌧️ Rain alert',
                body: `It looks like ${condition || 'it’s raining'} right now. Indoor idea: ${suggestionText}`,
                data: { type: 'rain_suggestion' },
                sound: true,
            },
            trigger: null,
        });
    }

    async sendBadgeNotification(badge) {
        const Notifications = await this._getNotifications();
        if (!Notifications) return;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🏅 New Achievement Unlocked!',
                body: `You've earned the ${badge.title} badge! ${badge.description}`,
                data: { badgeId: badge.id },
                sound: true,
            },
            trigger: null, // show immediately
        });
    }
}

export default new NotificationService();
