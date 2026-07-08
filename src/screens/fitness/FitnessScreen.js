// Fitness Tracking Screen
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, ACTIVITY_TYPES, SHADOWS } from '../../theme';
import { GradientCard, StatCard, SectionHeader, AnimatedButton, ProgressBar } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import db from '../../services/database';
import { format, subDays } from 'date-fns';

const { width } = Dimensions.get('window');

// Helper to get emoji for activity type
const getActivityEmoji = (typeId) => {
    switch (typeId) {
        case 'gym': return '🏋️';
        case 'running': return '🏃';
        case 'cycling': return '🚴';
        case 'sports': return '⚽';
        case 'yoga': return '🧘';
        case 'swimming': return '🏊';
        case 'walking': return '🚶';
        case 'pushups': return '💪';
        case 'pullups': return '🔝';
        case 'squats': return '🦵';
        case 'planks': return '⏱️';
        case 'situps': return '🪑';
        case 'lunges': return '🚶';
        case 'burpees': return '🔥';
        default: return '🏅';
    }
};

export default function FitnessScreen({ navigation }) {
    const { user } = useAuth();
    const [activities, setActivities] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('week');

    const loadData = useCallback(async () => {
        if (!user) return;
        const acts = await db.getActivities(user.id);
        setActivities(acts.sort((a, b) => b.date.localeCompare(a.date)));
    }, [user]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    useEffect(() => {
        if (!user?.id) return;
        const unsub = db.subscribeToActivities(user.id, () => {
            loadData();
        });
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [user?.id, loadData]);

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayActs = activities.filter(a => a.date === today);
    const todayMinutes = todayActs.reduce((s, a) => s + (a.duration || 0), 0);
    const todayCalories = todayActs.reduce((s, a) => s + (a.caloriesBurned || 0), 0);

    // Weekly stats
    const weekActs = activities.filter(a => {
        const d = new Date(a.date);
        const weekAgo = subDays(new Date(), 7);
        return d >= weekAgo;
    });
    const weekMinutes = weekActs.reduce((s, a) => s + (a.duration || 0), 0);
    const weekCalories = weekActs.reduce((s, a) => s + (a.caloriesBurned || 0), 0);
    const weekSessions = weekActs.length;
    const avgDuration = weekSessions > 0 ? Math.round(weekMinutes / weekSessions) : 0;

    // Activity type breakdown
    const typeBreakdown = {};
    weekActs.forEach(a => {
        if (!typeBreakdown[a.type]) typeBreakdown[a.type] = { count: 0, minutes: 0 };
        typeBreakdown[a.type].count++;
        typeBreakdown[a.type].minutes += a.duration || 0;
    });

    // Weekly chart data
    const weekChart = Array.from({ length: 7 }, (_, i) => {
        const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
        const dayActs = activities.filter(a => a.date === date);
        return {
            day: format(subDays(new Date(), 6 - i), 'EEE'),
            minutes: dayActs.reduce((s, a) => s + (a.duration || 0), 0),
            isToday: date === today,
        };
    });

    // Streak calculation
    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
        if (activities.some(a => a.date === d)) streak++;
        else break;
    }

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Fitness</Text>
                    <AnimatedButton
                        title="+ Log Activity"
                        onPress={() => navigation.navigate('LogActivity')}
                        style={styles.logButton}
                    />
                </View>

                {/* Today's Summary */}
                <GradientCard gradient={COLORS.gradientAccent} style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Today's Activity</Text>
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.summaryValue}>{todayMinutes}</Text>
                            <Text style={styles.summaryUnit}>minutes</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View>
                            <Text style={styles.summaryValue}>{todayCalories}</Text>
                            <Text style={styles.summaryUnit}>cal burned</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View>
                            <Text style={styles.summaryValue}>{todayActs.length}</Text>
                            <Text style={styles.summaryUnit}>sessions</Text>
                        </View>
                    </View>
                </GradientCard>

                {/* Badges and Milestones Entry */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('Achievements')}
                    style={styles.achievementsCard}
                >
                    <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.achievementsGradient}
                    >
                        <View style={styles.achievementsIconContainer}>
                            <Text style={{ fontSize: 28 }}>🏆</Text>
                        </View>
                        <View style={styles.achievementsTextContainer}>
                            <Text style={styles.achievementsTitle}>Milestone Badges</Text>
                            <Text style={styles.achievementsSubtitle}>View your earned and locked achievements</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={COLORS.textInverse} style={{ opacity: 0.7 }} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Stats Grid */}
                <SectionHeader title="This Week" />
                <View style={styles.statsGrid}>
                    <StatCard title="Total Time" value={weekMinutes} unit="min" icon="⏱️" color={COLORS.accent} />
                    <StatCard title="Sessions" value={weekSessions} icon="💪" color={COLORS.primary} />
                </View>
                <View style={[styles.statsGrid, { marginTop: SPACING.md }]}>
                    <StatCard title="Calories Burned" value={weekCalories} unit="kcal" icon="🔥" color={COLORS.coral} />
                    <StatCard title="Streak" value={streak} unit="days" icon="⚡" color={COLORS.orange} subtitle="Keep it up!" />
                </View>

                {/* Weekly Chart */}
                <SectionHeader title="Weekly Overview" />
                <View style={styles.chartContainer}>
                    {weekChart.map((d, i) => {
                        const maxMin = Math.max(...weekChart.map(w => w.minutes), 1);
                        const barH = Math.max((d.minutes / maxMin) * 80, 4);
                        return (
                            <View key={i} style={styles.chartBar}>
                                <Text style={styles.chartValue}>{d.minutes > 0 ? d.minutes : '-'}</Text>
                                <LinearGradient
                                    colors={d.isToday ? COLORS.gradientAccent : [COLORS.surfaceElevated, COLORS.surfaceElevated]}
                                    style={[styles.chartBarFill, { height: barH }]}
                                />
                                <Text style={[styles.chartDay, d.isToday && { color: COLORS.accent }]}>{d.day}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Activity Breakdown */}
                <SectionHeader title="Activity Breakdown" />
                <View style={styles.breakdownContainer}>
                    {Object.entries(typeBreakdown).map(([type, data], i) => {
                        const actType = ACTIVITY_TYPES.find(t => t.id === type);
                        const totalMin = weekMinutes || 1;
                        const percentage = Math.round((data.minutes / totalMin) * 100);
                        return (
                            <View key={i} style={styles.breakdownItem}>
                                <View style={styles.breakdownLeft}>
                                    <View style={[styles.breakdownDot, { backgroundColor: actType?.color || COLORS.primary }]} />
                                    <Text style={styles.breakdownLabel}>{actType?.label || type}</Text>
                                </View>
                                <View style={styles.breakdownRight}>
                                    <Text style={styles.breakdownMins}>{data.minutes}min</Text>
                                    <Text style={styles.breakdownPercent}>{percentage}%</Text>
                                </View>
                            </View>
                        );
                    })}
                    {Object.keys(typeBreakdown).length === 0 && (
                        <Text style={styles.noData}>No activities this week</Text>
                    )}
                </View>

                {/* Recent Activities */}
                <SectionHeader title="Recent Activities" />
                {activities.slice(0, 10).map((act, i) => {
                    const actType = ACTIVITY_TYPES.find(t => t.id === act.type);
                    const isRepBased = ['pushups', 'pullups', 'squats', 'situps', 'lunges', 'burpees'].includes(act.type);
                    const isTimeBased = act.type === 'planks';
                    const unitLabel = actType?.unit === 'reps' ? 'reps' : actType?.unit === 'sec' ? 'sec' : 'min';

                    return (
                        <View key={i} style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: (actType?.color || COLORS.primary) + '22' }]}>
                                <Text style={{ fontSize: 20 }}>
                                    {getActivityEmoji(act.type)}
                                </Text>
                            </View>
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityType}>{actType?.label || act.type}</Text>
                                <Text style={styles.activityMeta}>
                                    {act.date} · {act.zone || 'Campus'}
                                </Text>
                            </View>
                            <View style={styles.activityStats}>
                                <Text style={styles.activityDuration}>{act.duration}{unitLabel}</Text>
                                <Text style={styles.activityCals}>{act.caloriesBurned} kcal</Text>
                            </View>
                        </View>
                    );
                })}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 140 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
    },
    headerTitle: { fontSize: FONT_SIZES.xxl, ...FONTS.bold, color: COLORS.text },
    logButton: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
    summaryCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
    summaryLabel: { color: COLORS.text, fontSize: FONT_SIZES.sm, ...FONTS.medium, opacity: 0.8, marginBottom: SPACING.md },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    summaryValue: { color: COLORS.text, fontSize: FONT_SIZES.xxxl, ...FONTS.bold, textAlign: 'center' },
    summaryUnit: { color: COLORS.text, fontSize: FONT_SIZES.xs, textAlign: 'center', opacity: 0.7 },
    summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
    statsGrid: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md },
    chartContainer: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
        marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
        padding: SPACING.lg, paddingBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder, height: 140,
    },
    chartBar: { alignItems: 'center' },
    chartValue: { color: COLORS.textMuted, fontSize: 9, marginBottom: 4 },
    chartBarFill: { width: 28, borderRadius: BORDER_RADIUS.sm },
    chartDay: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
    breakdownContainer: {
        marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.lg,
    },
    breakdownItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    breakdownLeft: { flexDirection: 'row', alignItems: 'center' },
    breakdownDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.md },
    breakdownLabel: { color: COLORS.text, fontSize: FONT_SIZES.md, ...FONTS.medium },
    breakdownRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    breakdownMins: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
    breakdownPercent: { color: COLORS.accent, fontSize: FONT_SIZES.sm, ...FONTS.bold, minWidth: 36, textAlign: 'right' },
    activityItem: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg,
        paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    activityIcon: {
        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
    },
    activityInfo: { flex: 1 },
    activityType: { color: COLORS.text, fontSize: FONT_SIZES.md, ...FONTS.medium },
    activityMeta: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
    activityStats: { alignItems: 'flex-end' },
    activityDuration: { color: COLORS.accent, fontSize: FONT_SIZES.md, ...FONTS.bold },
    activityCals: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
    noData: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZES.md },
    achievementsCard: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    achievementsGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    achievementsIconContainer: {
        width: 50,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    achievementsTextContainer: {
        flex: 1,
    },
    achievementsTitle: {
        color: COLORS.textInverse,
        fontSize: FONT_SIZES.lg,
        ...FONTS.bold,
        fontWeight: '700',
    },
    achievementsSubtitle: {
        color: COLORS.textInverse,
        fontSize: FONT_SIZES.xs,
        opacity: 0.8,
        marginTop: 2,
    },
});
