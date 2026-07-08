import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    FlatList,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../../theme';
import { Header } from '../../components/common';
import db from '../../services/database';
import { useAuth } from '../../services/AuthContext';
import AchievementService from '../../services/AchievementService';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

function AchievementCard({ achievement, index, onPress }) {
    const scaleAnim = new Animated.Value(0);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            delay: index * 100,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => onPress(achievement)}
            >
                <View style={styles.badgeContainer}>
                    <Image
                        source={achievement.icon}
                        style={[styles.badgeIcon, !achievement.unlocked && styles.lockedIcon]}
                    />
                    {!achievement.unlocked && (
                        <View style={styles.lockOverlay}>
                            <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                        </View>
                    )}
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{achievement.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{achievement.description}</Text>

                    <View style={styles.progressRow}>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${achievement.unlocked ? 100 : 0}%`,
                                        backgroundColor: achievement.unlocked ? achievement.color : COLORS.textMuted
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{achievement.unlocked ? 'Unlocked' : 'Locked'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function AchievementsScreen({ navigation }) {
    const { user } = useAuth();
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, unlocked: 0 });

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const foodLogs = await db.getFoodLogs(user.id);
            const activities = await db.getActivities(user.id);
            const moodLogs = await db.getMoodLogs(user.id);
            const journals = await db.getJournals(user.id);

            // Pass userId to checkAndNotify for persistence + notifications
            const earnedIds = await AchievementService.checkAndNotify({
                userId: user.id,
                foodLogs,
                activities,
                moodLogs,
                journals,
            });

            const processed = AchievementService.getAchievementStats(earnedIds);
            setAchievements(processed);
            setStats({
                total: processed.length,
                unlocked: earnedIds.length,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <View style={styles.container}>
            <Header
                title="Achievements"
                subtitle="Your journey to fitness mastery"
                onBack={() => navigation.goBack()}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <LinearGradient
                    colors={COLORS.gradientHero}
                    style={styles.statsHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{stats.unlocked}</Text>
                            <Text style={styles.statLab}>Earned</Text>
                        </View>
                        <View style={styles.statItemDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{Math.round((stats.unlocked / (stats.total || 1)) * 100)}%</Text>
                            <Text style={styles.statLab}>Complete</Text>
                        </View>
                        <View style={styles.statItemDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{stats.total}</Text>
                            <Text style={styles.statLab}>Total</Text>
                        </View>
                    </View>
                </LinearGradient>

                <Text style={styles.sectionHeader}>Campus Titan Milestone Badges</Text>

                <View style={styles.grid}>
                    {achievements.map((ach, idx) => (
                        <AchievementCard
                            key={ach.id}
                            achievement={ach}
                            index={idx}
                            onPress={() => { }}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        paddingBottom: SPACING.huge,
    },
    statsHeader: {
        margin: SPACING.lg,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xxl,
        ...SHADOWS.medium,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statVal: {
        color: COLORS.textInverse,
        fontSize: FONT_SIZES.xxxl,
        ...FONTS.bold,
        fontWeight: '800',
    },
    statLab: {
        color: COLORS.textInverse,
        opacity: 0.8,
        fontSize: FONT_SIZES.sm,
        marginTop: 4,
    },
    statItemDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    sectionHeader: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.text,
        ...FONTS.bold,
        fontWeight: '700',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    grid: {
        paddingHorizontal: SPACING.lg,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cardContainer: {
        width: (width - SPACING.lg * 2 - SPACING.md) / 2,
        marginBottom: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    badgeContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badgeIcon: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    lockedIcon: {
        opacity: 0.2,
        tintColor: '#000',
    },
    lockOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 99,
        padding: 6,
    },
    cardContent: {
        padding: SPACING.md,
    },
    cardTitle: {
        fontSize: FONT_SIZES.md,
        ...FONTS.bold,
        fontWeight: '700',
        color: COLORS.text,
    },
    cardDesc: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 4,
        lineHeight: 16,
        height: 32,
    },
    progressRow: {
        marginTop: SPACING.md,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 4,
        textAlign: 'right',
    },
});
