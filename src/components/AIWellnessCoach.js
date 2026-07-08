// AI Wellness Coach - Premium Light Theme Design with Wow Factor
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from "../theme";
import aiService from "../services/aiService";
import { getCurrentCampusEnvironment } from "../utils/campusEnvironment";

const { width } = Dimensions.get("window");

// Fallback data
const FALLBACK_DATA = {
    briefing: "Rest well tonight - your wellness journey continues tomorrow!",
    routing: "The Library is currently quiet and ideal for focused study.",
    socialPush: "Log your activities to help your department climb the leaderboard!",
};

// Animated AI Glow Ring Component - Premium Effect
function AIGlowRing({ size = 70, primaryColor = COLORS.primary }) {
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        // Rotation animation for the outer ring
        const rotate = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 8000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        rotate.start();

        return () => {
            pulse.stop();
            rotate.stop();
        };
    }, []);

    const scale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.3],
    });

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0],
    });

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={[styles.glowRingContainer, { width: size * 1.8, height: size * 1.8 }]}>
            {/* Outer rotating ring */}
            <Animated.View
                style={[
                    styles.outerRing,
                    {
                        width: size * 1.6,
                        height: size * 1.6,
                        borderRadius: size * 0.8,
                        borderColor: primaryColor + '40',
                        transform: [{ rotate: rotation }],
                    },
                ]}
            />
            {/* Pulsing glow */}
            <Animated.View
                style={[
                    styles.pulseGlow,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: primaryColor + '15',
                        transform: [{ scale }],
                        opacity,
                    },
                ]}
            />
        </View>
    );
}

// Skeleton Loading Component - Premium Style
function LoadingSkeleton() {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.2, 0.5, 0.2],
    });

    return (
        <View style={styles.skeletonContainer}>
            <View style={styles.skeletonHeader}>
                <Animated.View style={[styles.skeletonCircle, { opacity }]} />
                <View style={styles.skeletonTextContainer}>
                    <Animated.View style={[styles.skeletonLine, { width: "70%", opacity }]} />
                    <Animated.View style={[styles.skeletonLineShort, { width: "50%", opacity }]} />
                </View>
            </View>
            {[1, 2, 3].map((i) => (
                <Animated.View key={i} style={[styles.skeletonCard, { opacity }]} />
            ))}
        </View>
    );
}

// Premium Section Card Component
function SectionCard({ icon, title, content, iconColor = COLORS.primary, onPress, index }) {
    const slideAnim = useRef(new Animated.Value(50)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay: index * 100,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.sectionCard,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.sectionCardInner}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[iconColor + '12', iconColor + '06']}
                    style={styles.iconBadgeGradient}
                >
                    <View style={[styles.iconBadge, { backgroundColor: iconColor + '20' }]}>
                        <Ionicons name={icon} size={18} color={iconColor} />
                    </View>
                </LinearGradient>
                <View style={styles.sectionContentContainer}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.sectionContentText}>{content}</Text>
                </View>
                {onPress && (
                    <View style={styles.chevronContainer}>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// Quick Stat Chip Component - Premium
function QuickStatChip({ icon, label, value, color }) {
    return (
        <LinearGradient
            colors={[color + '12', color + '06']}
            style={styles.quickStatChipGradient}
        >
            <View style={[styles.quickStatChip, { backgroundColor: color + '12' }]}>
                <Text style={styles.quickStatIcon}>{icon}</Text>
                <View style={styles.quickStatContent}>
                    <Text style={[styles.quickStatValue, { color }]}>{value}</Text>
                    <Text style={styles.quickStatLabel}>{label}</Text>
                </View>
            </View>
        </LinearGradient>
    );
}

export default function AIWellnessCoach({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [envData, setEnvData] = useState(null);

    // Animation for the AI avatar
    const avatarScale = useRef(new Animated.Value(1)).current;
    const avatarFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in animation on mount
        Animated.timing(avatarFade, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        let mounted = true;

        async function loadData() {
            setLoading(true);

            // Get campus environment for display
            if (mounted) {
                const env = await getCurrentCampusEnvironment();
                setEnvData(env);
            }

            try {
                // Generate proactive action plan from AI
                const result = await aiService.generateProactiveActionPlan();

                if (mounted) {
                    setData(result);
                    setError(null);

                    // Pulse animation on load
                    Animated.sequence([
                        Animated.timing(avatarScale, {
                            toValue: 1.15,
                            duration: 300,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(avatarScale, {
                            toValue: 1,
                            duration: 300,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            } catch (e) {
                console.warn("AIWellnessCoach error:", e);
                if (mounted) {
                    setData(FALLBACK_DATA);
                    setError("Using cached insights");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadData();

        // Refresh every 5 minutes
        const interval = setInterval(() => {
            if (mounted) loadData();
        }, 5 * 60 * 1000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const handleLogActivity = () => {
        if (navigation && navigation.navigate) {
            navigation.navigate("Fitness");
        }
    };

    // Determine icon based on time of day
    const getTimeIcon = () => {
        if (!envData) return "sunny";
        const { hour } = envData;
        if (hour >= 6 && hour < 12) return "sunny";
        if (hour >= 12 && hour < 17) return "partly-sunny";
        if (hour >= 17 && hour < 21) return "sunny-outline";
        return "moon";
    };

    // Get the appropriate icon name for Ionicons
    const getIconName = () => {
        return getTimeIcon();
    };

    // Get greeting based on time
    const getGreeting = () => {
        if (!envData) return "Hello";
        const { hour } = envData;
        if (hour >= 6 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 17) return "Good afternoon";
        if (hour >= 17 && hour < 21) return "Good evening";
        return "Hello";
    };

    return (
        <View style={styles.container}>
            {/* Premium Card Background with Gradient */}
            <LinearGradient
                colors={['#FFFFFF', '#F5F3FF', '#EEF2FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Decorative blurred circles for premium feel */}
                <View style={[styles.decorCircle1, { backgroundColor: COLORS.primary + '10' }]} />
                <View style={[styles.decorCircle2, { backgroundColor: COLORS.violet + '10' }]} />
                <View style={[styles.decorCircle3, { backgroundColor: COLORS.accent + '08' }]} />

                {/* AI Header */}
                <View style={styles.header}>
                    {/* AI Avatar with Glow */}
                    <View style={styles.aiAvatarWrapper}>
                        <AIGlowRing size={60} primaryColor={COLORS.primary} />
                        <Animated.View
                            style={[
                                styles.aiAvatar,
                                {
                                    transform: [
                                        { scale: avatarScale },
                                    ],
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={COLORS.gradientHero}
                                style={styles.avatarGradient}
                            >
                                <Ionicons 
                                    name={getIconName()} 
                                    size={28} 
                                    color={COLORS.textInverse} 
                                />
                            </LinearGradient>
                        </Animated.View>
                    </View>

                    {/* Header Text */}
                    <View style={styles.headerTextContainer}>
                        <View style={styles.titleRow}>
                            <Text style={styles.aiTitle}>Titan AI Coach</Text>
                            <View style={styles.statusBadge}>
                                <View style={[styles.statusDot, { backgroundColor: loading ? COLORS.warning : COLORS.success }]} />
                                <Text style={styles.statusText}>
                                    {loading ? "Analyzing" : "Live"}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.aiSubtitle}>
                            {loading
                                ? "Processing your wellness data..."
                                : envData
                                    ? `${getGreeting()} • ${envData.weather?.temperature || '--'}°C • ${envData.weather?.humidity ? `${envData.weather.humidity}% Humidity` : envData.timePeriod || 'Now'}${envData.weather?.rain ? ` • ${envData.weather.rain}mm Rain` : ''}`
                                    : "Your personal wellness companion"
                            }
                        </Text>
                    </View>
                </View>

                {/* Content Area */}
                {loading ? (
                    <LoadingSkeleton />
                ) : (
                    <View style={styles.contentContainer}>
                        {/* Quick Stats Row */}
                        {envData && (
                            <View style={styles.quickStatsRow}>
                                <QuickStatChip
                                    icon="📍"
                                    label="Campus"
                                    value={envData.zones?.[0]?.name?.slice(0, 8) || "Library"}
                                    color={COLORS.primary}
                                />
                                <QuickStatChip
                                    icon="👥"
                                    label="Crowd"
                                    value={envData.zones?.[0]?.crowdLevel || "Quiet"}
                                    color={COLORS.violet}
                                />
                                {envData.weather?.humidity && (
                                    <QuickStatChip
                                        icon="💧"
                                        label="Humidity"
                                        value={`${envData.weather.humidity}%`}
                                        color={COLORS.info}
                                    />
                                )}
                                {envData.weather?.rain && (
                                    <QuickStatChip
                                        icon="🌧️"
                                        label="Rain"
                                        value={`${envData.weather.rain}mm`}
                                        color={COLORS.primaryLight}
                                    />
                                )}
                            </View>
                        )}

                        {/* Section 1: The Briefing */}
                        <SectionCard
                            icon="sparkles"
                            iconColor="#8B5CF6"
                            title="Your Daily Briefing"
                            content={data?.briefing || FALLBACK_DATA.briefing}
                            index={0}
                        />

                        {/* Section 2: Live Campus Radar */}
                        <SectionCard
                            icon="navigate"
                            iconColor={COLORS.primary}
                            title="Campus Insights"
                            content={data?.routing || FALLBACK_DATA.routing}
                            index={1}
                        />

                        {/* Section 3: Campus Pulse with Action */}
                        <SectionCard
                            icon="trophy"
                            iconColor={COLORS.accent}
                            title="Join the Movement"
                            content={data?.socialPush || FALLBACK_DATA.socialPush}
                            onPress={handleLogActivity}
                            index={2}
                        />

                        {/* Action Button - Premium */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleLogActivity}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={COLORS.gradientHero}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.actionButtonGradient}
                            >
                                <Ionicons name="fitness" size={18} color={COLORS.textInverse} />
                                <Text style={styles.actionButtonText}>Log Activity Now</Text>
                                <Ionicons name="arrow-forward" size={16} color={COLORS.textInverse} />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Environment Quick View - Redesigned */}
                        {envData && Array.isArray(envData.zones) && (
                            <View style={styles.envQuickView}>
                                <View style={styles.envHeader}>
                                    <Text style={styles.envLabel}>🔥 Popular Campus Zones</Text>
                                    <Text style={styles.envSubLabel}>Live data</Text>
                                </View>
                                <View style={styles.zonesContainer}>
                                    {envData.zones.slice(0, 3).map((zone, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.zoneCard,
                                                index === 0 && styles.zoneCardActive,
                                            ]}
                                        >
                                            <View style={styles.zoneHeader}>
                                                <Text style={styles.zoneName} numberOfLines={1}>
                                                    {zone.name}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.crowdBadge,
                                                        {
                                                            backgroundColor:
                                                                zone.crowdLevel === 'Quiet' ? COLORS.success + '18' :
                                                                zone.crowdLevel === 'Packed' ? COLORS.error + '18' :
                                                                COLORS.warning + '18',
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.crowdText,
                                                            {
                                                                color:
                                                                    zone.crowdLevel === 'Quiet' ? COLORS.success :
                                                                    zone.crowdLevel === 'Packed' ? COLORS.error :
                                                                    COLORS.warning,
                                                            },
                                                        ]}
                                                    >
                                                        {zone.crowdLevel}
                                                    </Text>
                                                </View>
                                            </View>
                                            {zone.features && (
                                                <Text style={styles.zoneFeatures} numberOfLines={1}>
                                                    {zone.features.slice(0, 30)}...
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Premium Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerContent}>
                        <LinearGradient colors={COLORS.gradientPrimary} style={styles.footerIconGradient}>
                            <Ionicons name="shield-checkmark" size={12} color={COLORS.textInverse} />
                        </LinearGradient>
                        <Text style={styles.footerText}>
                            AI-powered wellness insights
                        </Text>
                    </View>
                    <Text style={styles.footerUpdate}>
                        Updates every 5 min
                    </Text>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.xl,
        borderRadius: BORDER_RADIUS.xxl,
        overflow: "hidden",
        ...SHADOWS.large,
    },
    cardGradient: {
        padding: SPACING.xl,
        minHeight: 300,
    },
    // Decorative circles
    decorCircle1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        top: -40,
        right: -40,
    },
    decorCircle2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        bottom: 30,
        left: -30,
    },
    decorCircle3: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        top: 80,
        left: -10,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: SPACING.lg,
        position: 'relative',
        zIndex: 1,
    },
    aiAvatarWrapper: {
        width: 80,
        height: 80,
        justifyContent: "center",
        alignItems: "center",
    },
    glowRingContainer: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    },
    outerRing: {
        position: "absolute",
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    pulseGlow: {
        position: "absolute",
    },
    aiAvatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        overflow: "hidden",
        ...SHADOWS.glow,
    },
    avatarGradient: {
        width: '100%',
        height: '100%',
        justifyContent: "center",
        alignItems: "center",
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    aiTitle: {
        fontSize: FONT_SIZES.xl,
        ...FONTS.bold,
        color: COLORS.text,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.round,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: FONT_SIZES.xs,
        ...FONTS.medium,
        color: COLORS.textSecondary,
    },
    aiSubtitle: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.medium,
        color: COLORS.textSecondary,
        marginTop: 4,
    },

    // Content
    contentContainer: {
        gap: SPACING.md,
        position: 'relative',
        zIndex: 1,
    },
    skeletonContainer: {
        gap: SPACING.sm,
    },
    skeletonHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: SPACING.md,
    },
    skeletonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceElevated,
    },
    skeletonTextContainer: {
        marginLeft: SPACING.md,
        gap: 8,
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.surfaceElevated,
    },
    skeletonLineShort: {
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.surfaceElevated,
    },
    skeletonCard: {
        height: 60,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceElevated,
    },

    // Quick Stats
    quickStatsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    quickStatChipGradient: {
        flex: 1,
        borderRadius: BORDER_RADIUS.lg,
    },
    quickStatChip: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
    },
    quickStatIcon: {
        fontSize: 18,
        marginRight: SPACING.xs,
    },
    quickStatContent: {
        flex: 1,
    },
    quickStatValue: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.bold,
    },
    quickStatLabel: {
        fontSize: FONT_SIZES.xs - 1,
        color: COLORS.textMuted,
        ...FONTS.medium,
    },

    // Section Cards - Premium
    sectionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
        ...SHADOWS.small,
        overflow: 'hidden',
    },
    sectionCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
    },
    iconBadgeGradient: {
        borderRadius: BORDER_RADIUS.lg,
        padding: 2,
    },
    iconBadge: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionContentContainer: {
        flex: 1,
        marginLeft: SPACING.sm,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        ...FONTS.bold,
        color: COLORS.text,
        marginBottom: 2,
    },
    sectionContentText: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    chevronContainer: {
        padding: SPACING.xs,
    },

    // Action Button - Premium
    actionButton: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: "hidden",
        ...SHADOWS.medium,
    },
    actionButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.md + 2,
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    actionButtonText: {
        fontSize: FONT_SIZES.md,
        ...FONTS.bold,
        color: COLORS.textInverse,
    },

    // Environment Quick View
    envQuickView: {
        marginTop: SPACING.xs,
    },
    envHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    envLabel: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.semiBold,
        color: COLORS.text,
    },
    envSubLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        ...FONTS.medium,
    },
    zonesContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    zoneCard: {
        flex: 1,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
    },
    zoneCardActive: {
        backgroundColor: COLORS.primary + '08',
        borderColor: COLORS.primary + '25',
    },
    zoneHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    zoneName: {
        fontSize: FONT_SIZES.xs,
        ...FONTS.semiBold,
        color: COLORS.text,
        flex: 1,
        marginRight: 4,
    },
    crowdBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
    },
    crowdText: {
        fontSize: FONT_SIZES.xs - 2,
        ...FONTS.bold,
    },
    zoneFeatures: {
        fontSize: FONT_SIZES.xs - 1,
        color: COLORS.textMuted,
        ...FONTS.regular,
    },

    // Footer
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.glassBorderLight,
        position: 'relative',
        zIndex: 1,
    },
    footerContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
    },
    footerIconGradient: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        ...FONTS.medium,
    },
    footerUpdate: {
        fontSize: FONT_SIZES.xs - 1,
        color: COLORS.textMuted,
        ...FONTS.regular,
    },
});

