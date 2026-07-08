import { format, subDays, isBefore, parseISO, isSameDay } from 'date-fns';
import { ACHIEVEMENTS } from '../constants/achievements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from './NotificationService';
import db from './database';

class AchievementService {
    // Get earned badges from database (persistent storage)
    async getPersistedBadges(userId) {
        try {
            const badgeIds = await db.getUserBadgeIds(userId);
            return badgeIds;
        } catch (err) {
            console.error('Error getting persisted badges:', err);
            return [];
        }
    }

    // Save earned badges to database (persistent storage)
    async saveBadgesToDatabase(userId, earnedIds) {
        try {
            // Get the badge objects for the earned IDs
            const earnedBadges = ACHIEVEMENTS.filter(ach => earnedIds.includes(ach.id));
            
            if (earnedBadges.length > 0) {
                await db.saveUserBadges(userId, earnedBadges);
                console.log('✅ Saved', earnedBadges.length, 'badges to database for user', userId);
            }
        } catch (err) {
            console.error('Error saving badges to database:', err);
        }
    }

    // Check achievements and handle notifications + persistence
    async checkAndNotify(userData) {
        const { userId, foodLogs = [], activities = [], moodLogs = [], journals = [] } = userData;
        
        // Get currently earned badges from data
        const currentEarned = this.checkAchievements({ foodLogs, activities, moodLogs, journals });

        // If userId is provided, handle persistence
        if (userId) {
            try {
                // Get previously persisted badges from database
                const persistedIds = await this.getPersistedBadges(userId);
                
                // Find newly earned badges (not in persisted)
                const newlyEarnedIds = currentEarned.filter(id => !persistedIds.includes(id));

                // Send notifications for NEW badges only
                if (newlyEarnedIds.length > 0) {
                    console.log('🎉 New badges earned:', newlyEarnedIds);
                    for (const id of newlyEarnedIds) {
                        const badge = ACHIEVEMENTS.find(a => a.id === id);
                        if (badge) {
                            await notificationService.sendBadgeNotification(badge);
                        }
                    }
                }

                // Save all current earned badges to database (syncs state)
                await this.saveBadgesToDatabase(userId, currentEarned);

                // Also update local AsyncStorage for quick access (fallback)
                await AsyncStorage.setItem(
                    `notified_achievements_${userId}`,
                    JSON.stringify([...new Set([...persistedIds, ...currentEarned])])
                );

                return currentEarned;
            } catch (err) {
                console.error('Error in checkAndNotify:', err);
                return currentEarned;
            }
        }

        // Fallback: Original behavior without userId
        try {
            const notifiedStr = await AsyncStorage.getItem(`notified_achievements_${userData.id || 'default'}`);
            const notified = notifiedStr ? JSON.parse(notifiedStr) : [];

            const newlyEarnedIds = currentEarned.filter(id => !notified.includes(id));

            if (newlyEarnedIds.length > 0) {
                for (const id of newlyEarnedIds) {
                    const badge = ACHIEVEMENTS.find(a => a.id === id);
                    if (badge) {
                        await notificationService.sendBadgeNotification(badge);
                    }
                }

                await AsyncStorage.setItem(
                    `notified_achievements_${userData.id || 'default'}`,
                    JSON.stringify([...new Set([...notified, ...currentEarned])])
                );
            }
        } catch (err) {
            console.error('Error in checkAndNotify:', err);
        }

        return currentEarned;
    }

    checkAchievements(userData) {
        const { foodLogs = [], activities = [], moodLogs = [], journals = [] } = userData;
        const earned = ['fitness_freak'];

        // 1. Step Smasher (10,000 steps)
        // Assuming activities have a 'steps' field or total calories/duration implies it.
        // For this mock, we'll check for 10k steps.
        const has10kSteps = activities.some(act => (act.steps || (act.duration * 100)) >= 10000);
        if (has10kSteps) earned.push('step_smasher');

        // 2. Calorie Crusader (7 consecutive days)
        if (this._hasConsecutiveDays(foodLogs, 7)) earned.push('calorie_crusader');

        // 3. Mindfulness Master (3 consecutive mood logs)
        if (this._hasConsecutiveDays(moodLogs, 3)) earned.push('mindfulness_master');

        // 4. Consistency King (5 activities in a week)
        const recentActivities = activities.filter(act => {
            const date = parseISO(act.date);
            return !isBefore(date, subDays(new Date(), 7));
        });
        if (recentActivities.length >= 5) earned.push('consistency_king');

        // 5. Burn Baby Burn (500+ cal in 1 session)
        const hasHighBurn = activities.some(act => (act.calories_burned || act.caloriesBurned) >= 500);
        if (hasHighBurn) earned.push('burn_baby_burn');

        // 6. Night Owl (Journal after 11 PM)
        const hasLateJournal = journals.some(j => {
            const date = new Date(j.created_at || j.date);
            return date.getHours() >= 23 || date.getHours() <= 3;
        });
        if (hasLateJournal) earned.push('night_owl');

        // 7. Early Bird (Activity before 8 AM)
        const hasEarlyActivity = activities.some(act => {
            // If activity has a timestamp or scheduled time
            const date = new Date(act.created_at || act.date);
            const hours = date.getHours();
            return hours >= 4 && hours < 8;
        });
        if (hasEarlyActivity) earned.push('early_bird');

        return earned;
    }

    _hasConsecutiveDays(logs, required) {
        if (logs.length < required) return false;

        // Sort by date descending
        const sortedDates = [...new Set(logs.map(l => l.date))].sort().reverse();
        if (sortedDates.length < required) return false;

        let streak = 1;
        for (let i = 0; i < sortedDates.length - 1; i++) {
            const d1 = parseISO(sortedDates[i]);
            const d2 = parseISO(sortedDates[i + 1]);

            // If d2 is exactly 1 day before d1
            if (isSameDay(d2, subDays(d1, 1))) {
                streak++;
                if (streak >= required) return true;
            } else {
                streak = 1;
            }
        }
        return streak >= required;
    }

    getAchievementStats(earnedIds) {
        return ACHIEVEMENTS.map(ach => ({
            ...ach,
            unlocked: earnedIds.includes(ach.id),
            progress: earnedIds.includes(ach.id) ? 100 : 0, // In real app, we would calculate % progress
        }));
    }
}

export default new AchievementService();
