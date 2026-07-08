// Onboarding Screen
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS } from '../../theme';
import { AnimatedButton } from '../../components/common';
import { useAuth } from '../../services/AuthContext';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        emoji: '💪',
        title: 'Track Your\nFitness Journey',
        subtitle: 'Log workouts, monitor progress, and stay motivated with personalized insights for campus life.',
        gradient: COLORS.gradientPrimary,
    },
    {
        id: '2',
        emoji: '🥗',
        title: 'Smart\nNutrition',
        subtitle: 'Log mess meals, track calories and macros, and make informed decisions about your campus diet.',
        gradient: COLORS.gradientAccent,
    },
    {
        id: '3',
        emoji: '🧘',
        title: 'Mental\nWellness',
        subtitle: 'Track your mood, journal your thoughts, and join wellness circles to thrive on campus.',
        gradient: COLORS.gradientCoral,
    },
];

export default function OnboardingScreen({ navigation }) {
    const { setIsOnboarded } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems[0]) setCurrentIndex(viewableItems[0].index);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    function renderSlide({ item }) {
        return (
            <View style={styles.slide}>
                <View style={styles.emojiContainer}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
        );
    }

    function handleNext() {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            setIsOnboarded(true);
        }
    }

    return (
        <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
            />

            {/* Dots */}
            <View style={styles.dotsContainer}>
                {slides.map((_, i) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: [8, 24, 8],
                        extrapolate: 'clamp',
                    });
                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });
                    return (
                        <Animated.View
                            key={i}
                            style={[styles.dot, { width: dotWidth, opacity, backgroundColor: COLORS.primary }]}
                        />
                    );
                })}
            </View>

            <View style={styles.buttonContainer}>
                <AnimatedButton
                    title={currentIndex === slides.length - 1 ? "Get Started" : "Next"}
                    onPress={handleNext}
                    style={{ width: width - SPACING.lg * 2 }}
                />
                {currentIndex < slides.length - 1 && (
                    <Text
                        style={styles.skipText}
                        onPress={() => setIsOnboarded(true)}
                    >
                        Skip
                    </Text>
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xxl,
        paddingTop: height * 0.15,
    },
    emojiContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xxxl,
    },
    emoji: {
        fontSize: 56,
    },
    title: {
        fontSize: FONT_SIZES.hero,
        ...FONTS.extraBold,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.lg,
        lineHeight: 44,
    },
    subtitle: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: SPACING.lg,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: SPACING.xxl,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    buttonContainer: {
        alignItems: 'center',
        paddingBottom: height * 0.08,
    },
    skipText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.md,
        marginTop: SPACING.lg,
        ...FONTS.medium,
    },
});
