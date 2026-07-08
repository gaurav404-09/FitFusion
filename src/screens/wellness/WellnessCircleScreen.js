// Wellness Circle Screen
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../../theme';
import { Header, Chip } from '../../components/common';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import db from '../../services/database';

const DEMO_CIRCLES = [
    {
        id: 'demo-1',
        name: 'Morning Meditation',
        description: 'Start your campus day with 15 mins of mindfulness. Great for focus and stress.',
        category: 'Meditation',
        schedule: 'Daily, 7:30 AM',
        location: 'Central Lawn',
    },
    {
        id: 'demo-2',
        name: 'Yoga for Beginners',
        description: 'Relaxing yoga flows to improve flexibility and mental clarity.',
        category: 'Yoga',
        schedule: 'Mon/Wed/Fri, 5:30 PM',
        location: 'Activity Center',
    },
    {
        id: 'demo-3',
        name: 'Campus Runners',
        description: 'Morning group runs around the campus perimeter. All levels welcome!',
        category: 'Running',
        schedule: 'Tue/Thu, 6:30 AM',
        location: 'Main Gate',
    },
    {
        id: 'demo-4',
        name: 'Library Focus Hub',
        description: 'Productive study sessions with pomodoro technique and focus music.',
        category: 'Study',
        schedule: 'Daily, 4:00 PM',
        location: 'Library Floor 3',
    },
    {
        id: 'demo-5',
        name: 'Healthy Eaters Titan',
        description: 'Share healthy meal options available on campus and nutrition tips.',
        category: 'Nutrition',
        schedule: 'Saturdays, 11:00 AM',
        location: 'Main Canteen',
    }
];

export default function WellnessCircleScreen({ navigation }) {
    const [circles, setCircles] = useState(DEMO_CIRCLES);
    const [selectedCategory, setSelectedCategory] = useState('All');

    const loadData = useCallback(async () => {
        try {
            const dbCircles = await db.getWellnessCircles();
            if (dbCircles && dbCircles.length > 0) {
                // Combine demo with DB, or just use DB
                setCircles([...DEMO_CIRCLES, ...dbCircles]);
            }
        } catch (error) {
            console.warn('WellnessCircle fetch error:', error);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const categories = ['All', 'Meditation', 'Yoga', 'Running', 'Study', 'Nutrition', 'Finance'];
    const filtered = (circles || []).filter(c =>
        selectedCategory === 'All' ? true : c.category === selectedCategory
    );

    const handleJoin = (circle) => {
        const cat = (circle.category || 'general').toLowerCase();
        const whatsappLink = `https://chat.whatsapp.com/demo-${cat}`;
        Linking.openURL(whatsappLink).catch(() => {
            Alert.alert('Error', 'Could not open WhatsApp link');
        });
    };

    const gradients = [COLORS.gradientPrimary, COLORS.gradientAccent, COLORS.gradientSunset, COLORS.gradientOcean, COLORS.gradientCoral];

    return (
        <View style={styles.container}>
            <Header title="Wellness Circles" subtitle="Join a community" onBack={() => navigation.goBack()} />

            <View style={styles.catWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                    {categories.map(cat => (
                        <Chip key={cat} label={cat} selected={selectedCategory === cat} onPress={() => setSelectedCategory(cat)} color={COLORS.primary} />
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{filtered.length}</Text>
                        <Text style={styles.statLabel}>Active Communities</Text>
                    </View>
                </View>

                {filtered.map((circle, i) => (
                    <View key={circle.id} style={styles.circleCard}>
                        <LinearGradient
                            colors={gradients[i % gradients.length]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.circleGradient}
                        >
                            <Text style={styles.circleCategory}>{circle.category}</Text>
                        </LinearGradient>

                        <View style={styles.circleBody}>
                            <Text style={styles.circleName}>{circle.name}</Text>
                            <Text style={styles.circleDesc}>{circle.description}</Text>

                            <View style={styles.detailList}>
                                <View style={styles.circleDetail}>
                                    <Text style={styles.circleIcon}>📅</Text>
                                    <Text style={styles.circleDetailText}>{circle.schedule}</Text>
                                </View>
                                <View style={styles.circleDetail}>
                                    <Text style={styles.circleIcon}>📍</Text>
                                    <Text style={styles.circleDetailText}>{circle.location}</Text>
                                </View>
                                <View style={styles.circleDetail}>
                                    <View style={styles.waIconBox}>
                                        <Ionicons name="logo-whatsapp" size={12} color="#FFF" />
                                    </View>
                                    <Text style={styles.waLinkText}>
                                        https://chat.whatsapp.com/demo-{circle.category?.toLowerCase() || 'group'}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.joinBtn}
                                activeOpacity={0.8}
                                onPress={() => handleJoin(circle)}
                            >
                                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                                <Text style={styles.joinBtnText}>Join WhatsApp Group</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {filtered.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No communities found for this category.</Text>
                    </View>
                )}

                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    content: { paddingBottom: 100 },
    catWrapper: { marginVertical: SPACING.lg },
    catScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
    statsRow: {
        flexDirection: 'row', justifyContent: 'center', marginHorizontal: SPACING.lg,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.glassBorder, marginBottom: SPACING.lg,
        ...SHADOWS.small
    },
    statItem: { alignItems: 'center' },
    statValue: { color: COLORS.text, fontSize: FONT_SIZES.xxl, ...FONTS.bold },
    statLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
    circleCard: {
        marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden',
        ...SHADOWS.small
    },
    circleGradient: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.lg },
    circleCategory: { color: COLORS.text, fontSize: 10, ...FONTS.bold, textTransform: 'uppercase' },
    circleBody: { padding: SPACING.lg },
    circleName: { color: COLORS.text, fontSize: FONT_SIZES.lg, ...FONTS.bold },
    circleDesc: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginTop: 4, lineHeight: 18, marginBottom: SPACING.md },
    detailList: { gap: 8 },
    circleDetail: { flexDirection: 'row', alignItems: 'center' },
    circleIcon: { fontSize: 14, marginRight: SPACING.sm },
    circleDetailText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
    waIconBox: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
    waLinkText: { color: '#128C7E', fontSize: 12, ...FONTS.medium },
    joinBtn: {
        marginTop: SPACING.lg, paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: '#25D366',
        backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10
    },
    joinBtnText: { color: '#25D366', fontSize: FONT_SIZES.md, ...FONTS.bold },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZES.md },
});
