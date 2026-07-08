// College Health Leaderboard Screen — Premium Podium Design
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, RefreshControl, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../../theme';
import { Avatar } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import db from '../../services/database';

const { width } = Dimensions.get('window');

const RANK_COLORS = [COLORS.primary, '#C0C0C0', '#CD7F32'];

// Custom Header Component without the back arrow for main tab screens (optional, but good for style)
function LeaderboardHeader() {
    return (
        <View style={s.header}>
            <Text style={s.headerTitle}>Campus Leaderboard</Text>
        </View>
    );
}

// Podium Component for Top 3
function Podium({ top3, currentUser }) {
    if (!top3 || top3.length === 0) return null;

    // We want order: 2, 1, 3
    const first = top3[0];
    const second = top3.length > 1 ? top3[1] : null;
    const third = top3.length > 2 ? top3[2] : null;

    const renderPodiumItem = (user, rank, heightMultiplier) => {
        if (!user) return <View style={s.podiumCol} />;
        const isMe = user.id === currentUser?.id;
        const color = RANK_COLORS[rank - 1];

        return (
            <View style={s.podiumCol}>
                <View style={s.podiumAvatarWrap}>
                    <Avatar name={user.name} size={rank === 1 ? 64 : 52} color={color} />
                    <View style={[s.podiumBadge, { backgroundColor: color }]}>
                        <Text style={s.podiumBadgeText}>{rank}</Text>
                    </View>
                </View>

                <Text style={[s.podiumName, isMe && { color: COLORS.primary }]} numberOfLines={1}>
                    {user.name.split(' ')[0]}
                </Text>
                <Text style={s.podiumScore}>{user.healthScore} pts</Text>

                <LinearGradient
                    colors={[color + '80', color + '10']}
                    style={[s.podiumBar, { height: 60 * heightMultiplier }]}
                />
            </View>
        );
    };

    return (
        <View style={s.podiumContainer}>
            {renderPodiumItem(second, 2, 1.2)}
            {renderPodiumItem(first, 1, 1.6)}
            {renderPodiumItem(third, 3, 0.9)}
        </View>
    );
}

export default function LeaderboardScreen({ navigation }) {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadLeaderboard = useCallback(async () => {
        console.log('🏆 DEBUG: Current user college:', user?.college);
        console.log('🏆 DEBUG: User object:', user);
        if (!user?.college) {
            setLeaderboard([]);
            setLoading(false);
            return;
        }
        try {
            const data = await db.getLeaderboard(user.college);
            console.log('🏆 DEBUG: Leaderboard data received:', data?.length || 0, 'users');
            setLeaderboard(data);
        } catch (e) {
            console.error('Leaderboard error:', e);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLeaderboard();
        setRefreshing(false);
    };

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    const renderItem = ({ item, index }) => {
        const rank = index + 4; // Since we sliced first 3
        const isMe = item.id === user?.id;

        return (
            <View style={[s.rowCard, isMe && s.rowCardMe]}>
                <Text style={s.rowRank}>{rank}</Text>
                <Avatar name={item.name} size={40} color={isMe ? COLORS.primary : COLORS.surfaceElevated} />
                <View style={s.rowInfo}>
                    <Text style={[s.rowName, isMe && { color: COLORS.primary }]}>
                        {item.name} {isMe ? '(You)' : ''}
                    </Text>
                    <Text style={s.rowMeta}>{item.activeDays || 0} active days • BMI {item.bmi || '—'}</Text>
                </View>
                <View style={s.rowScoreBox}>
                    <Text style={s.rowScore}>{item.healthScore}</Text>
                    <Text style={s.rowScoreLabel}>pts</Text>
                </View>
            </View>
        );
    };

    const renderHeader = () => (
        <View style={s.listHeader}>
            <View style={s.pillHeader}>
                <Text style={s.pillIcon}>�️</Text>
                <Text style={s.pillText}>{user?.college || 'Your College'}</Text>
            </View>

            <Text style={s.heroTitle}>Who's the healthiest{'\n'}on campus?</Text>

            {leaderboard.length > 0 && (
                <Podium top3={top3} currentUser={user} />
            )}

            {leaderboard.length > 3 && (
                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>The Peloton</Text>
                    <Text style={s.sectionCount}>{rest.length} runners up</Text>
                </View>
            )}
        </View>
    );

    const renderEmpty = () => (
        <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🏫</Text>
            <Text style={s.emptyTitle}>Empty Campus</Text>
            <Text style={s.emptyMsg}>
                Be the first from {user?.college || 'your college'} to track health and claim the #1 spot!
            </Text>
        </View>
    );

    return (
        <View style={s.container}>
            <LeaderboardHeader />
            <FlatList
                data={rest}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={!loading ? renderEmpty : null}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    listContent: { paddingBottom: SPACING.huge + 60 },

    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.background,
    },
    headerTitle: { fontSize: FONT_SIZES.xl, ...FONTS.bold, color: COLORS.text, textAlign: 'center' },

    listHeader: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

    pillHeader: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
        backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.round, borderWidth: 1, borderColor: COLORS.glassBorder,
        marginBottom: SPACING.lg,
    },
    pillIcon: { fontSize: 16, marginRight: 6 },
    pillText: { color: COLORS.text, ...FONTS.semiBold, fontSize: FONT_SIZES.sm },

    heroTitle: {
        fontSize: 32, ...FONTS.extraBold, color: COLORS.text,
        textAlign: 'center', lineHeight: 38, letterSpacing: -1,
        marginBottom: SPACING.xxxl,
    },

    // ─── Podium ───
    podiumContainer: {
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
        height: 220, marginBottom: SPACING.xxxl, gap: SPACING.sm,
    },
    podiumCol: {
        flex: 1, alignItems: 'center', justifyContent: 'flex-end',
    },
    podiumAvatarWrap: { position: 'relative', marginBottom: SPACING.sm, ...SHADOWS.glow },
    podiumBadge: {
        position: 'absolute', bottom: -4, right: -4,
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: COLORS.background,
    },
    podiumBadgeText: { color: COLORS.background, fontSize: 10, ...FONTS.extraBold },
    podiumName: { color: COLORS.text, fontSize: FONT_SIZES.sm, ...FONTS.bold, marginBottom: 2 },
    podiumScore: { color: COLORS.textMuted, fontSize: 10, ...FONTS.semiBold, marginBottom: SPACING.sm },
    podiumBar: {
        width: '100%', borderTopLeftRadius: BORDER_RADIUS.md, borderTopRightRadius: BORDER_RADIUS.md,
        borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.glassBorder,
    },

    // ─── List ───
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: SPACING.md, paddingHorizontal: SPACING.xs,
    },
    sectionTitle: { color: COLORS.text, fontSize: FONT_SIZES.lg, ...FONTS.bold },
    sectionCount: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, ...FONTS.medium },

    rowCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    rowCardMe: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
    rowRank: {
        width: 30, color: COLORS.textMuted, fontSize: FONT_SIZES.md, ...FONTS.bold, textAlign: 'center',
    },
    rowInfo: { flex: 1, marginLeft: SPACING.md },
    rowName: { color: COLORS.text, fontSize: FONT_SIZES.md, ...FONTS.semiBold },
    rowMeta: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, ...FONTS.medium, marginTop: 2 },
    rowScoreBox: { alignItems: 'center', minWidth: 40 },
    rowScore: { color: COLORS.text, fontSize: FONT_SIZES.lg, ...FONTS.bold },
    rowScoreLabel: { color: COLORS.textMuted, fontSize: 10, ...FONTS.medium },

    emptyState: { alignItems: 'center', paddingTop: SPACING.huge },
    emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
    emptyTitle: { color: COLORS.text, fontSize: FONT_SIZES.xl, ...FONTS.bold, marginBottom: SPACING.sm },
    emptyMsg: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md, textAlign: 'center', paddingHorizontal: SPACING.xl },
});
