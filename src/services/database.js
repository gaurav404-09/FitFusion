import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

class Database {
    get supabase() {
        return supabase;
    }

    subscribeToFoodLogs(userId, onChange) {
        if (!userId) throw new Error('userId is required');
        const channel = supabase
            .channel(`food_logs:user:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'food_logs',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (typeof onChange === 'function') onChange(payload);
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    subscribeToActivities(userId, onChange) {
        if (!userId) throw new Error('userId is required');
        const channel = supabase
            .channel(`activities:user:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'activities',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (typeof onChange === 'function') onChange(payload);
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    // User-specific
    async getUsers() {
        const { data, error } = await supabase.from('users').select('*');
        if (error) { console.error(error); return []; }
        return data;
    }

    // Admin: list all non-admin users via SECURITY DEFINER RPC (bypasses RLS)
    async getAdminUsers() {
        const { data, error } = await supabase.rpc('admin_list_users');
        if (error) {
            console.error('admin_list_users RPC error:', error);
            return [];
        }
        return (data || []).map(u => ({
            ...u,
            activityLevel: u.activity_level,
            fitnessGoal: u.fitness_goal,
        }));
    }
    async addUser(user) { return null; } // Handled by auth.js register
    async getUserByEmail(email) {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error) return null;
        return data;
    }

    // Food logs
    async getFoodLogs(userId) {
        // userId parameter might not be strictly needed if using RLS, but passing it for query
        const { data, error } = await supabase
            .from('food_logs')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return (data || []).map((row) => ({
            ...row,
            mealType: row.mealType ?? row.meal_type,
            foodName: row.foodName ?? row.food_name,
            isVeg: row.isVeg ?? row.is_veg,
        }));
    }

    async addFoodLog(log) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const insertLog = { ...log };
        if (insertLog.userId && !insertLog.user_id) insertLog.user_id = insertLog.userId;
        if (insertLog.mealType && !insertLog.meal_type) insertLog.meal_type = insertLog.mealType;
        if (insertLog.foodName && !insertLog.food_name) insertLog.food_name = insertLog.foodName;
        if (typeof insertLog.isVeg !== 'undefined' && typeof insertLog.is_veg === 'undefined') insertLog.is_veg = insertLog.isVeg;

        insertLog.user_id = user.id;

        delete insertLog.userId;
        delete insertLog.mealType;
        delete insertLog.foodName;
        delete insertLog.isVeg;
        delete insertLog.id;

        // Check if entry exists - if so, update instead of insert
        const { data: existing } = await supabase
            .from('food_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', insertLog.date)
            .eq('meal_type', insertLog.meal_type)
            .eq('food_name', insertLog.food_name)
            .single();

        if (existing) {
            // Update existing entry
            const { data, error } = await supabase
                .from('food_logs')
                .update(insertLog)
                .eq('id', existing.id)
                .select('*')
                .single();
            if (error) { console.error(error); throw error; }
            return {
                ...data,
                mealType: data.mealType ?? data.meal_type,
                foodName: data.foodName ?? data.food_name,
                isVeg: data.isVeg ?? data.is_veg,
            };
        }

        // Insert new entry
        const { data, error } = await supabase
            .from('food_logs')
            .insert([insertLog])
            .select('*')
            .single();
        if (error) { console.error(error); throw error; }
        return {
            ...data,
            mealType: data.mealType ?? data.meal_type,
            foodName: data.foodName ?? data.food_name,
            isVeg: data.isVeg ?? data.is_veg,
        };
    }
    async deleteFoodLog(id) {
        const { error } = await supabase.from('food_logs').delete().eq('id', id);
        if (error) { console.error(error); throw error; }
        return { message: 'Deleted' };
    }
    async getAllFoodLogs() {
        const { data: { user } } = await supabase.auth.getUser();
        return this.getFoodLogs(user?.id);
    }

    async getAllFoodLogsAdmin() {
        const { data, error } = await supabase
            .from('food_logs')
            .select('*')
            .order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return (data || []).map((row) => ({
            ...row,
            mealType: row.mealType ?? row.meal_type,
            foodName: row.foodName ?? row.food_name,
            isVeg: row.isVeg ?? row.is_veg,
        }));
    }

    async getAllActivitiesAdmin() {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return (data || []).map(act => ({ ...act, caloriesBurned: act.calories_burned }));
    }

    async getAllMoodLogsAdmin() {
        const { data, error } = await supabase
            .from('mood_logs')
            .select('*')
            .order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return data || [];
    }

    // Activities
    async getActivities(userId) {
        const { data, error } = await supabase.from('activities').select('*').eq('user_id', userId).order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return data.map(act => ({ ...act, caloriesBurned: act.calories_burned }));
    }
    async addActivity(log) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const insertLog = { ...log, user_id: user.id };
        // Map camelCase to snake_case for DB columns
        if (insertLog.caloriesBurned !== undefined && insertLog.calories_burned === undefined) {
            insertLog.calories_burned = insertLog.caloriesBurned;
        }
        delete insertLog.userId;
        delete insertLog.caloriesBurned;
        delete insertLog.id;
        const { data, error } = await supabase.from('activities').insert([insertLog]).select().single();
        if (error) { console.error(error); throw error; }
        return { ...data, caloriesBurned: data.calories_burned };
    }
    async deleteActivity(id) {
        const { error } = await supabase.from('activities').delete().eq('id', id);
        if (error) { console.error(error); throw error; }
        return { message: 'Deleted' };
    }
    async getAllActivities() {
        const { data: { user } } = await supabase.auth.getUser();
        return this.getActivities(user?.id);
    }

    // Mood logs
    async getMoodLogs(userId) {
        const { data, error } = await supabase.from('mood_logs').select('*').eq('user_id', userId).order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return data;
    }
    async addMoodLog(log) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const insertLog = { ...log, user_id: user.id };
        delete insertLog.userId;
        delete insertLog.id;
        const { data, error } = await supabase.from('mood_logs').insert([insertLog]).select().single();
        if (error) { console.error(error); throw error; }
        return data;
    }
    async deleteMoodLog(id) {
        const { error } = await supabase.from('mood_logs').delete().eq('id', id);
        if (error) { console.error(error); throw error; }
        return { message: 'Deleted' };
    }
    async getAllMoodLogs() {
        const { data: { user } } = await supabase.auth.getUser();
        return this.getMoodLogs(user?.id);
    }

    // Journals
    async getJournals(userId) {
        const { data, error } = await supabase.from('journals').select('*').eq('user_id', userId).order('date', { ascending: false });
        if (error) { console.error(error); return []; }
        return data;
    }
    async addJournal(log) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const insertLog = { ...log, user_id: user.id };
        delete insertLog.userId;
        delete insertLog.id;
        const { data, error } = await supabase.from('journals').insert([insertLog]).select().single();
        if (error) { console.error(error); throw error; }
        return data;
    }
    async deleteJournal(id) {
        const { error } = await supabase.from('journals').delete().eq('id', id);
        if (error) { console.error(error); throw error; }
        return { message: 'Deleted' };
    }
    async getAllJournals() {
        const { data: { user } } = await supabase.auth.getUser();
        return this.getJournals(user?.id);
    }

    // Environmental data
    async getEnvData() {
        // Will rely on old seeded logic as Supabase mapping for env might be overkill
        // If needed in the future, can create table
        return [];
    }

    async addEnvData(log) {
        const insertLog = { ...log };
        delete insertLog.userId;
        delete insertLog.id;
        const { data, error } = await supabase.from('environmental_data').insert([insertLog]).select().single();
        if (error) { console.error(error); throw error; }
        return data;
    }

    // Wellness circles
    async getWellnessCircles() {
        const { data, error } = await supabase.from('wellness_circles').select('*');
        if (error) { console.error(error); return []; }
        return data.map(wc => ({ ...wc, maxParticipants: wc.max_participants }));
    }
    async addWellnessCircle(log) {
        const { data, error } = await supabase.from('wellness_circles').insert([log]).select().single();
        if (error) { console.error(error); throw error; }
        return data;
    }
    async deleteWellnessCircle(id) {
        const { error } = await supabase.from('wellness_circles').delete().eq('id', id);
        if (error) { console.error(error); throw error; }
        return { message: 'Deleted' };
    }

    async clearAll() { }

    // Campus Analytics
    async getCampusAnalytics() {
        return null;
    }

    // College Leaderboard
    async getLeaderboard(college) {
        if (!college) return [];
        console.log('🏆 DEBUG: Getting leaderboard for college:', `"${college}"`);
        try {
            // First try exact match
            let { data: users, error } = await supabase
                .from('users')
                .select('id, name, college, height, weight, age, gender')
                .eq('college', college);

            // If no users found, try case-insensitive search
            if (!users || users.length === 0) {
                console.log('🏆 DEBUG: No exact match, trying case-insensitive search');
                console.log('🏆 DEBUG: Original query error:', error);
                const { data: allUsers, error: allUsersError } = await supabase
                    .from('users')
                    .select('id, name, college, height, weight, age, gender');

                console.log('🏆 DEBUG: All users query error:', allUsersError);
                console.log('🏆 DEBUG: ALL users in database:', allUsers?.length || 0);
                console.log('🏆 DEBUG: ALL college names in database:', allUsers?.map(u => `"${u.college}"`));

                if (allUsers) {
                    users = allUsers.filter(u =>
                        u.college && u.college.toLowerCase().trim() === college.toLowerCase().trim()
                    );
                    console.log('🏆 DEBUG: Filtered users from all users:', users?.length || 0);
                    console.log('🏆 DEBUG: Matching users:', users?.map(u => ({ name: u.name, college: `"${u.college}"` })));
                }
            }

            console.log('🏆 DEBUG: Final users found:', users?.length || 0);
            console.log('🏆 DEBUG: User colleges:', users?.map(u => `"${u.college}"`));

            if (error) {
                console.error('Leaderboard fetch error:', error);
                return [];
            }

            // For each user, compute a health score
            const scored = await Promise.all(users.map(async (u) => {
                let score = 0;

                // 1. Activity score (up to 40 pts)
                try {
                    const acts = await this.getActivities(u.id);
                    const totalMinutes = acts.reduce((sum, a) => sum + (a.duration || 0), 0);
                    const activeDays = new Set(acts.map(a => a.date)).size;
                    score += Math.min(totalMinutes / 10, 25); // up to 25 pts for total minutes
                    score += Math.min(activeDays * 3, 15); // up to 15 pts for consistency
                    u.activeDays = activeDays;
                } catch (e) {
                    u.activeDays = 0;
                }

                // 2. Food logging score (up to 25 pts)
                try {
                    const foods = await this.getFoodLogs(u.id);
                    const loggedDays = new Set(foods.map(f => f.date)).size;
                    score += Math.min(loggedDays * 2, 25);
                } catch (e) { }

                // 3. Mood tracking score (up to 15 pts)
                try {
                    const moods = await this.getMoodLogs(u.id);
                    const moodDays = new Set(moods.map(m => m.date)).size;
                    score += Math.min(moodDays * 2, 15);
                } catch (e) { }

                // 4. BMI score (up to 20 pts) - closer to healthy range = more points
                if (u.weight && u.height) {
                    const bmi = u.weight / ((u.height / 100) ** 2);
                    u.bmi = bmi.toFixed(1);
                    if (bmi >= 18.5 && bmi < 25) score += 20; // Normal
                    else if (bmi >= 16 && bmi < 18.5) score += 12; // Underweight
                    else if (bmi >= 25 && bmi < 30) score += 10; // Overweight
                    else score += 5; // Obese or severely underweight
                } else {
                    u.bmi = null;
                }

                return { ...u, healthScore: Math.round(score) };
            }));

            // Sort by health score descending
            scored.sort((a, b) => b.healthScore - a.healthScore);
            return scored;
        } catch (e) {
            console.error('Leaderboard error:', e);
            return [];
        }
    }

    // Daily Wellness Logs (Database)
    async getDailyWellnessLog(date) {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('🧠 [Wellness] No user found for daily wellness log');
                return null;
            }

            // Get wellness logs from database
            const { data, error } = await supabase
                .from('user_wellness_data')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', date);

            if (error) {
                console.error('getDailyWellnessLog error:', error);
                return null;
            }

            return data.length > 0 ? data[0] : null;
        } catch (e) {
            console.error('getDailyWellnessLog error:', e);
            return null;
        }
    }

    async saveDailyWellnessLog(log) {
        try {
            console.log('🧠 [DEBUG] saveDailyWellnessLog called with:', JSON.stringify(log, null, 2));

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Validate log object exists
            if (!log || typeof log !== 'object') {
                console.error('🧠 [ERROR] Invalid log object:', log);
                throw new Error('Invalid log object provided');
            }

            // Save to database with proper date constraint (one entry per day)
            const date = (log.date || new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
            console.log('🧠 [DEBUG] Wellness date:', date);

            // First check if entry exists for today
            const { data: existingRecords, error: checkError } = await supabase
                .from('user_wellness_data')
                .select('id')
                .eq('user_id', user.id)
                .eq('date', date);

            if (checkError) {
                console.error('🧠 [ERROR] Check existing records error:', checkError);
                throw checkError;
            }

            console.log('🧠 [DEBUG] Existing records:', existingRecords);

            const payload = {
                user_id: user.id,
                date,
                sleep_hrs: typeof log.sleepHrs !== 'undefined' ? log.sleepHrs : log.sleep_hrs,
                walked_km: typeof log.walkedKm !== 'undefined' ? log.walkedKm : log.walked_km,
                stress_level: typeof log.stressLevel !== 'undefined' ? log.stressLevel : log.stress_level,
                productivity: typeof log.productivity !== 'undefined' ? log.productivity : null,
                created_at: new Date().toISOString(),
            };

            console.log('🧠 [DEBUG] Wellness payload:', payload);

            let result;
            if (existingRecords && existingRecords.length > 0) {
                console.log('🧠 [DEBUG] Updating existing record:', existingRecords[0].id);
                const { data: updateData, error: updateError } = await supabase
                    .from('user_wellness_data')
                    .update(payload)
                    .eq('id', existingRecords[0].id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (updateError) {
                    console.error('saveDailyWellnessLog update error:', updateError);
                    throw updateError;
                }
                result = updateData;
            } else {
                console.log('🧠 [DEBUG] Inserting new record');
                const { data: insertedData, error: insertError } = await supabase
                    .from('user_wellness_data')
                    .insert([payload])
                    .select()
                    .single();
                if (insertError) {
                    console.error('saveDailyWellnessLog insert error:', insertError);
                    throw insertError;
                }
                result = insertedData;
            }

            console.log(`🧠 [Wellness] Saved wellness log for user ${user.id}`);
            return result;
        } catch (e) {
            console.error('saveDailyWellnessLog error:', e);
            console.error('🧠 [ERROR] Stack trace:', e.stack);
            throw e;
        }
    }

    async getWellnessHistory(days = 7, userId = null) {
        try {
            // Get current user if userId not provided
            if (!userId) {
                const { data: authData } = await supabase.auth.getUser();
                userId = authData?.user?.id;
            }

            // If still no userId (e.g. mock admin or background service without session)
            if (!userId) {
                console.warn('🧠 [Wellness] No userId available for getWellnessHistory');
                return [];
            }

            // Get wellness logs from database filtered by user with flexible column selection
            const { data, error } = await supabase
                .from('user_wellness_data')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(days);

            if (error) {
                console.error('getWellnessHistory error:', error);
                return [];
            }

            if (!data || data.length === 0) return [];

            // Get activities for the user to calculate steps
            const { data: activities } = await supabase
                .from('activities')
                .select('steps, duration, date, created_at')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(50); // Small sanity limit

            // Get mood logs for screen time estimates
            const { data: moodLogs } = await supabase
                .from('mood_logs')
                .select('productivity, screen_time, date, created_at')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(50);

            // Create a map of activities by date
            const activitiesByDate = {};
            (activities || []).forEach(act => {
                const dateKey = act.date || act.created_at?.split('T')[0];
                if (dateKey) {
                    if (!activitiesByDate[dateKey]) activitiesByDate[dateKey] = { steps: 0, duration: 0 };
                    activitiesByDate[dateKey].steps += (act.steps || 0);
                    activitiesByDate[dateKey].duration += (act.duration || 0);
                }
            });

            // Create a map of mood by date (for screen time estimates)
            const moodByDate = {};
            (moodLogs || []).forEach(mood => {
                const dateKey = mood.date || mood.created_at?.split('T')[0];
                if (dateKey) {
                    moodByDate[dateKey] = mood;
                }
            });

            // Normalize data for frontend consumption and AI service
            const normalizedData = data.map(record => {
                const dateKey = record.date || record.created_at?.split('T')[0];
                const dayActivities = activitiesByDate[dateKey] || {};
                const dayMood = moodByDate[dateKey] || {};

                return {
                    ...record,
                    // Map possible column variations to standard names
                    date: dateKey,
                    sleepHrs: record.sleepHrs ?? record.sleep_hrs ?? 0,
                    walkedKm: record.walkedKm ?? record.walked_km ?? 0,
                    stressLevel: record.stressLevel ?? record.stress_level ?? 5,
                    productivity: record.productivity ?? dayMood.productivity ?? 50,
                    // Convert walked_km to approximate steps (1 km ≈ 1250 steps)
                    steps: Math.round(dayActivities.steps || (record.walkedKm ?? record.walked_km ?? 0) * 1250 || 0),
                    // Estimate screen time from mood if not available
                    screenTimeHrs: record.screenTimeHrs ?? record.screen_time_hours ?? dayMood.screen_time ?? 6,
                };
            });

            console.log(`🧠 [Wellness] Found ${normalizedData.length} wellness records for user ${userId}`);
            console.log(`🧠 [Wellness] Sample record:`, normalizedData[0]);

            // Sort by date and limit
            return normalizedData.slice(0, days);
        } catch (e) {
            console.error('getWellnessHistory error:', e);
            return [];
        }
    }

    // ========================
    // User Badges (Persistent)
    // ========================
    
    // Get all badges for a user
    async getUserBadges(userId) {
        try {
            const { data, error } = await supabase
                .from('user_badges')
                .select('*')
                .eq('user_id', userId)
                .order('unlocked_at', { ascending: false });
            
            if (error) {
                console.error('getUserBadges error:', error);
                return [];
            }
            
            return data || [];
        } catch (e) {
            console.error('getUserBadges error:', e);
            return [];
        }
    }

    // Get badge IDs for a user (returns array of badge_id strings)
    async getUserBadgeIds(userId) {
        try {
            const badges = await this.getUserBadges(userId);
            return badges.map(b => b.badge_id);
        } catch (e) {
            console.error('getUserBadgeIds error:', e);
            return [];
        }
    }

    // Save a single badge for a user
    async saveUserBadge(userId, badge) {
        try {
            const payload = {
                user_id: userId,
                badge_id: badge.id,
                badge_title: badge.title,
                badge_description: badge.description || '',
                unlocked_at: new Date().toISOString(),
            };
            
            // First try to insert, if exists then do nothing (idempotent)
            const { data, error } = await supabase
                .from('user_badges')
                .upsert(payload, { onConflict: 'user_id, badge_id' })
                .select()
                .single();
            
            if (error) {
                console.error('saveUserBadge error:', error);
                return null;
            }
            
            return data;
        } catch (e) {
            console.error('saveUserBadge error:', e);
            return null;
        }
    }

    // Save multiple badges for a user (bulk)
    async saveUserBadges(userId, badges) {
        try {
            const payload = badges.map(badge => ({
                user_id: userId,
                badge_id: badge.id,
                badge_title: badge.title,
                badge_description: badge.description || '',
                unlocked_at: new Date().toISOString(),
            }));
            
            const { data, error } = await supabase
                .from('user_badges')
                .upsert(payload, { onConflict: 'user_id, badge_id' });
            
            if (error) {
                console.error('saveUserBadges error:', error);
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('saveUserBadges error:', e);
            return false;
        }
    }
}

export const db = new Database();
export default db;
