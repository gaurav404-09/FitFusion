// Environment Screen
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS } from '../../theme';
import { Header, GradientCard, SectionHeader, ProgressBar } from '../../components/common';
import { useFocusEffect } from '@react-navigation/native';
import db from '../../services/database';
import { CAMPUS_ZONES } from '../../data/seedData';
import environmentService from '../../services/EnvironmentService';

const { width } = Dimensions.get('window');

// OpenWeather air_pollution uses a 1-5 index
function getAQIColorIndex(aqiIndex) {
    if (aqiIndex === 1) return '#34D399';
    if (aqiIndex === 2) return '#A3E635';
    if (aqiIndex === 3) return '#F59E0B';
    if (aqiIndex === 4) return '#EF4444';
    if (aqiIndex === 5) return '#B91C1C';
    return COLORS.textMuted;
}

function getActivitySuggestions({ aqiIndex, temp, weatherCondition }) {
    const suggestions = [];

    const condition = (weatherCondition || '').toLowerCase();
    const isRainy = condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunder');
    const isVeryHot = typeof temp === 'number' && temp >= 35;
    const isHot = typeof temp === 'number' && temp >= 30;

    const aqiBad = aqiIndex === 4 || aqiIndex === 5;
    const aqiOkay = aqiIndex === 1 || aqiIndex === 2;

    if (aqiBad) {
        suggestions.push('Indoor workout (gym / room circuit)');
        suggestions.push('Yoga / mobility session');
        if (isHot || isVeryHot) suggestions.push('Stay hydrated and avoid peak sun');
        return suggestions.slice(0, 3);
    }

    if (isRainy) {
        suggestions.push('Indoor cardio (treadmill / skipping)');
        suggestions.push('Strength training indoors');
        return suggestions.slice(0, 3);
    }

    if (isVeryHot) {
        suggestions.push('Outdoor walk before 8 AM / after 6 PM');
        suggestions.push('Indoor workout during midday');
        suggestions.push('Extra hydration + electrolytes');
        return suggestions.slice(0, 3);
    }

    if (aqiOkay) {
        suggestions.push('Outdoor run / brisk walk');
        suggestions.push('Sports (football / basketball)');
        suggestions.push('Outdoor stretching / cooldown');
        return suggestions.slice(0, 3);
    }

    suggestions.push('Light outdoor walk');
    suggestions.push('Gym workout');
    suggestions.push('Stretching / mobility');
    return suggestions.slice(0, 3);
}

function getAQIColor(aqi) {
    if (aqi <= 50) return '#34D399';
    if (aqi <= 100) return '#F59E0B';
    if (aqi <= 150) return '#F87171';
    if (aqi <= 200) return '#EF4444';
    return '#B91C1C';
}

function getAQILabel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (Sensitive)';
    if (aqi <= 200) return 'Unhealthy';
    return 'Very Unhealthy';
}

function getExerciseRecommendation(envData, liveEnv) {
    // Prefer live data if available, otherwise use historical data
    const data = liveEnv || envData;
    if (!data) return { text: 'Loading environment data...', emoji: '⏳', safe: true };
    
    // Use live AQI index (1-5 scale) or historical AQI value
    const aqi = liveEnv?.aqi?.aqiIndex ? (liveEnv.aqi.aqiIndex * 50) : data.aqi;
    const temperature = data.temperature || liveEnv?.weather?.temperature;
    const humidity = data.humidity;
    
    if (aqi > 150) return { text: 'Avoid outdoor exercise. High pollution levels.', emoji: '🏠', safe: false };
    if (temperature > 38) return { text: 'Too hot for outdoor exercise. Stay hydrated indoors.', emoji: '🥵', safe: false };
    if (aqi > 100) return { text: 'Limit prolonged outdoor activity. Consider indoor workouts.', emoji: '⚠️', safe: false };
    if (temperature > 33 && humidity > 70) return { text: 'Hot and humid. Exercise early morning or evening.', emoji: '🌅', safe: true };
    return { text: 'Great conditions for outdoor exercise! Get moving!', emoji: '🏃', safe: true };
}

export default function EnvironmentScreen({ navigation }) {
    const [envData, setEnvData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [liveEnv, setLiveEnv] = useState(null);

    const loadData = useCallback(async () => {
        const data = await db.getEnvData();
        setEnvData(data.sort((a, b) => b.date.localeCompare(a.date)));
    }, []);

    const loadLive = useCallback(async () => {
        try {
            const data = await environmentService.getEnvironmentData();
            setLiveEnv(data);
        } catch {
            setLiveEnv(null);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadData(); loadLive(); }, [loadData, loadLive]));

    const today = envData[0] || null;
    const recommendation = getExerciseRecommendation(today, liveEnv);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        await loadLive();
        setRefreshing(false);
    }, [loadData]);

    return (
        <View style={styles.container}>
            <Header title="Environment" subtitle="Campus conditions" onBack={navigation.canGoBack() ? () => navigation.goBack() : null} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Live Weather Section */}
                {liveEnv?.weather && (
                    <>
                        <SectionHeader title="Live Weather" />
                        <View style={styles.liveCard}>
                            <View style={styles.liveTopRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.liveTitle}>Weather</Text>
                                    <Text style={styles.liveSub}>{liveEnv.weather.location || 'Your location'}</Text>
                                </View>
                                <View style={styles.liveWeatherPill}>
                                    <Text style={styles.liveWeatherValue}>{liveEnv.weather.temperature}°C</Text>
                                    <Text style={styles.liveWeatherLabel}>{liveEnv.weather.description}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.weatherGrid}>
                                {[
                                    { emoji: '💧', label: 'Humidity', value: `${liveEnv.weather.humidity}%`, color: COLORS.info },
                                    { emoji: '💨', label: 'Wind Speed', value: `${liveEnv.weather.windSpeed} m/s`, color: COLORS.accentLight },
                                    ...(liveEnv.weather.rain ? [{ emoji: '🌧️', label: 'Rain', value: `${liveEnv.weather.rain}mm`, color: COLORS.primaryLight }] : []),
                                ].map((item, i) => (
                                    <View key={i} style={styles.weatherItem}>
                                        <Text style={styles.weatherEmoji}>{item.emoji}</Text>
                                        <Text style={[styles.weatherValue, { color: item.color }]}>{item.value}</Text>
                                        <Text style={styles.weatherLabel}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {/* Live AQI + Activity Suggestions */}
                {liveEnv?.weather && (
                    <>
                        <SectionHeader title="Live Recommendations" />
                        <View style={styles.liveCard}>
                            <View style={styles.liveTopRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.liveTitle}>Air Quality</Text>
                                    <Text style={styles.liveSub}>{liveEnv.weather.location || 'Your location'}</Text>
                                </View>
                                <View style={styles.liveAqiPill}>
                                    <Text style={[styles.liveAqiValue, { color: getAQIColorIndex(liveEnv.aqi?.aqiIndex) }]}>
                                        {liveEnv.aqi?.aqiIndex ? `${liveEnv.aqi.aqiIndex}/5` : '--'}
                                    </Text>
                                    <Text style={[styles.liveAqiLabel, { color: getAQIColorIndex(liveEnv.aqi?.aqiIndex) }]}>
                                        {liveEnv.aqi?.aqiCategory || 'Unknown'}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.liveRecoText}>
                                {liveEnv.aqi?.healthRecommendation || 'Air quality information is unavailable.'}
                            </Text>

                            <Text style={styles.liveTitle}>Suggested activities</Text>
                            {getActivitySuggestions({
                                aqiIndex: liveEnv.aqi?.aqiIndex ?? null,
                                temp: liveEnv.weather?.temperature,
                                weatherCondition: liveEnv.weather?.description,
                            }).map((s, i) => (
                                <Text key={`${i}-${s}`} style={styles.liveBullet}>- {s}</Text>
                            ))}
                        </View>
                    </>
                )}

                {/* Exercise Recommendation */}
                <GradientCard
                    gradient={recommendation.safe ? COLORS.gradientAccent : COLORS.gradientCoral}
                    style={styles.recoCard}
                >
                    <Text style={styles.recoEmoji}>{recommendation.emoji}</Text>
                    <Text style={styles.recoTitle}>Should I exercise outside?</Text>
                    <Text style={styles.recoText}>{recommendation.text}</Text>
                </GradientCard>

                {/* Historical Data Section */}
                {today && (
                    <>
                        {/* AQI Gauge */}
                        <SectionHeader title="Air Quality Index" />
                        <View style={styles.aqiCard}>
                            <View style={styles.aqiGauge}>
                                <Text style={[styles.aqiValue, { color: getAQIColor(today.aqi) }]}>{today.aqi}</Text>
                                <Text style={[styles.aqiLabel, { color: getAQIColor(today.aqi) }]}>{getAQILabel(today.aqi)}</Text>
                            </View>
                            <View style={styles.aqiScale}>
                                {[
                                    { range: '0-50', label: 'Good', color: '#34D399' },
                                    { range: '51-100', label: 'Moderate', color: '#F59E0B' },
                                    { range: '101-150', label: 'Unhealthy*', color: '#F87171' },
                                    { range: '151-200', label: 'Unhealthy', color: '#EF4444' },
                                    { range: '200+', label: 'V. Unhealthy', color: '#B91C1C' },
                                ].map((item, i) => (
                                    <View key={i} style={styles.aqiScaleItem}>
                                        <View style={[styles.aqiScaleDot, { backgroundColor: item.color }]} />
                                        <Text style={styles.aqiScaleText}>{item.range}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Weather */}
                        <SectionHeader title="Weather Conditions" />
                        <View style={styles.weatherGrid}>
                            {[
                                { emoji: '🌡️', label: 'Temperature', value: `${today.temperature}°C`, color: today.temperature > 35 ? COLORS.coral : COLORS.accent },
                                { emoji: '💧', label: 'Humidity', value: `${today.humidity}%`, color: COLORS.info },
                                { emoji: '🌧️', label: 'Rainfall', value: `${today.rainfall}mm`, color: COLORS.primaryLight },
                                { emoji: '💨', label: 'Wind Speed', value: `${today.windSpeed} km/h`, color: COLORS.accentLight },
                                { emoji: '☀️', label: 'UV Index', value: `${today.uvIndex}`, color: today.uvIndex > 7 ? COLORS.coral : COLORS.orange },
                                { emoji: '🔊', label: 'Noise Level', value: `${today.noiseLevel} dB`, color: today.noiseLevel > 70 ? COLORS.error : COLORS.success },
                            ].map((item, i) => (
                                <View key={i} style={styles.weatherItem}>
                                    <Text style={styles.weatherEmoji}>{item.emoji}</Text>
                                    <Text style={[styles.weatherValue, { color: item.color }]}>{item.value}</Text>
                                    <Text style={styles.weatherLabel}>{item.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Crowd Density */}
                        <SectionHeader title="Campus Crowd Density" />
                        <View style={styles.crowdCard}>
                            <View style={styles.crowdOverall}>
                                <Text style={styles.crowdEmoji}>👥</Text>
                                <Text style={styles.crowdValue}>{today.crowdDensity}%</Text>
                                <Text style={styles.crowdLabel}>Overall Campus</Text>
                            </View>
                            {today.zones && Object.entries(today.zones).map(([zone, data], i) => (
                                <View key={i} style={styles.zoneItem}>
                                    <Text style={styles.zoneName}>{zone}</Text>
                                    <View style={styles.zoneBarContainer}>
                                        <ProgressBar
                                            progress={data.crowdDensity}
                                            color={data.crowdDensity > 70 ? COLORS.error : data.crowdDensity > 40 ? COLORS.orange : COLORS.success}
                                            height={6}
                                            style={{ flex: 1 }}
                                        />
                                        <Text style={styles.zonePercent}>{data.crowdDensity}%</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Historical AQI Trend */}
                        <SectionHeader title="AQI Trend (Last 7 Days)" />
                        <View style={styles.trendChart}>
                            {envData.slice(0, 7).reverse().map((d, i) => {
                                const maxAqi = Math.max(...envData.slice(0, 7).map(e => e.aqi), 1);
                                const barH = Math.max((d.aqi / maxAqi) * 70, 4);
                                return (
                                    <View key={i} style={styles.trendBar}>
                                        <Text style={[styles.trendValue, { color: getAQIColor(d.aqi) }]}>{d.aqi}</Text>
                                        <View style={[styles.trendBarFill, { height: barH, backgroundColor: getAQIColor(d.aqi) }]} />
                                        <Text style={styles.trendDay}>{d.date.slice(-2)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    content: { paddingBottom: SPACING.huge },
    liveCard: {
        marginHorizontal: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        marginBottom: SPACING.lg,
    },
    liveTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    liveTitle: { color: COLORS.text, fontSize: FONT_SIZES.md, ...FONTS.bold, marginBottom: 4 },
    liveSub: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
    liveAqiPill: { alignItems: 'flex-end' },
    liveAqiValue: { fontSize: FONT_SIZES.xl, ...FONTS.extraBold },
    liveAqiLabel: { fontSize: FONT_SIZES.sm, ...FONTS.semiBold },
    liveWeatherPill: { alignItems: 'flex-end' },
    liveWeatherValue: { fontSize: FONT_SIZES.xl, ...FONTS.extraBold },
    liveWeatherLabel: { fontSize: FONT_SIZES.sm, ...FONTS.semiBold },
    liveRecoText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, lineHeight: 20, marginBottom: SPACING.md },
    liveBullet: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, lineHeight: 20 },
    recoCard: { marginHorizontal: SPACING.lg, alignItems: 'center', paddingVertical: SPACING.xxl },
    recoEmoji: { fontSize: 48, marginBottom: SPACING.md },
    recoTitle: { color: COLORS.text, fontSize: FONT_SIZES.lg, ...FONTS.bold, marginBottom: SPACING.sm },
    recoText: { color: COLORS.text, fontSize: FONT_SIZES.md, textAlign: 'center', opacity: 0.9, lineHeight: 22 },
    aqiCard: {
        marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    aqiGauge: { alignItems: 'center', marginBottom: SPACING.lg },
    aqiValue: { fontSize: FONT_SIZES.mega, ...FONTS.extraBold },
    aqiLabel: { fontSize: FONT_SIZES.lg, ...FONTS.semiBold, marginTop: SPACING.xs },
    aqiScale: { flexDirection: 'row', justifyContent: 'space-around' },
    aqiScaleItem: { alignItems: 'center' },
    aqiScaleDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 4 },
    aqiScaleText: { color: COLORS.textMuted, fontSize: 9 },
    weatherGrid: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: SPACING.md,
    },
    weatherItem: {
        width: (width - SPACING.lg * 2 - SPACING.md * 2) / 3,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md, alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    weatherEmoji: { fontSize: 24, marginBottom: SPACING.sm },
    weatherValue: { fontSize: FONT_SIZES.lg, ...FONTS.bold },
    weatherLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2, textAlign: 'center' },
    crowdCard: {
        marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    crowdOverall: { alignItems: 'center', marginBottom: SPACING.lg, paddingBottom: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder },
    crowdEmoji: { fontSize: 32, marginBottom: SPACING.sm },
    crowdValue: { color: COLORS.text, fontSize: FONT_SIZES.hero, ...FONTS.bold },
    crowdLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
    zoneItem: { marginBottom: SPACING.md },
    zoneName: { color: COLORS.text, fontSize: FONT_SIZES.sm, ...FONTS.medium, marginBottom: SPACING.xs },
    zoneBarContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    zonePercent: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, minWidth: 30 },
    trendChart: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
        marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
        padding: SPACING.lg, paddingBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder, height: 130,
    },
    trendBar: { alignItems: 'center' },
    trendValue: { fontSize: 9, marginBottom: 4, ...FONTS.bold },
    trendBarFill: { width: 24, borderRadius: BORDER_RADIUS.sm },
    trendDay: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
});
