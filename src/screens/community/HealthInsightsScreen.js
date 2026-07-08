import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../../theme';
import { Header } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import db from '../../services/database';
import backendAPI from '../../services/backendAPI';
import { format } from 'date-fns';

function PulseLoader() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={{ opacity: pulse }}>
        <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.loadingPulse} />
      </Animated.View>
      <Text style={styles.loadingText}>Coaching your AI...</Text>
      <Text style={styles.loadingSubtext}>Generating personalized health insights.</Text>
      <Text style={styles.loadingSubtext}>(This may take 1-3 minutes for deep analysis)</Text>
      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
    </View>
  );
}

function StatChip({ icon, label, value, color }) {
  return (
    <View style={[styles.statChip, { borderColor: color + '30' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InsightSection({ icon, title, content, gradient }) {
  return (
    <View style={styles.sectionCard}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sectionGradientBar} />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{content}</Text>
    </View>
  );
}

function parseAISections(summaryText) {
  const sections = { nutrition: '', activity: '', mental: '', overall: '' };
  if (!summaryText) return sections;

  const nutritionMatch = summaryText.match(
    /(?:1\.\s*)?NUTRITION\s*INSIGHT[:\s]*([\s\S]*?)(?=(?:2\.\s*)?ACTIVITY|$)/i,
  );
  const activityMatch = summaryText.match(
    /(?:2\.\s*)?ACTIVITY\s*REVIEW[:\s]*([\s\S]*?)(?=(?:3\.\s*)?MENTAL|$)/i,
  );
  const mentalMatch = summaryText.match(
    /(?:3\.\s*)?MENTAL\s*WELLNESS[:\s]*([\s\S]*?)(?=(?:4\.\s*)?OVERALL|$)/i,
  );
  const overallMatch = summaryText.match(/(?:4\.\s*)?OVERALL\s*SCORE[:\s]*([\s\S]*?)$/i);

  sections.nutrition = nutritionMatch ? nutritionMatch[1].trim() : '';
  sections.activity = activityMatch ? activityMatch[1].trim() : '';
  sections.mental = mentalMatch ? mentalMatch[1].trim() : '';
  sections.overall = overallMatch ? overallMatch[1].trim() : '';

  if (!sections.nutrition && !sections.activity && !sections.mental) {
    sections.overall = summaryText.trim();
  }

  return sections;
}

export default function HealthInsightsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [sections, setSections] = useState({ nutrition: '', activity: '', mental: '', overall: '' });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    setError(null);

    try {
      const allFoods = await db.getFoodLogs(user.id);
      const todayFoods = allFoods.filter((f) => f.date === today);

      const allActivities = await db.getActivities(user.id);
      const todayActivities = allActivities.filter((a) => a.date === today);

      const allMoods = await db.getMoodLogs(user.id);
      const todayMood = allMoods.find((m) => m.date === today);

      const payload = {
        user: {
          name: user.name,
          age: user.age,
          height: user.height,
          weight: user.weight,
          gender: user.gender,
        },
        foodLogs: todayFoods.map((f) => ({
          food_name: f.foodName || f.food_name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          meal_type: f.mealType || f.meal_type,
        })),
        activities:
          todayActivities.length > 0
            ? todayActivities.map((a) => ({
                type: a.type,
                duration: a.duration,
                calories_burned: a.caloriesBurned || a.calories_burned,
              }))
            : null,
        mood: todayMood
          ? {
              mood: ['Bad', 'Low', 'Okay', 'Good', 'Great'][todayMood.mood - 1] || 'Okay',
              stress_level: todayMood.stress || 'Moderate',
              sleep_hours: todayMood.sleep || 7,
              energy_level: todayMood.energy || 'Moderate',
            }
          : null,
      };

      const result = await backendAPI.getHealthSummary(payload);
      setSummaryData(result);
      setSections(parseAISections(result.summary));

      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (err) {
      console.error('Health insights fetch error:', err);
      setError(err.message || 'Failed to generate health insights');
    } finally {
      setLoading(false);
    }
  }, [fadeAnim, today, user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    fadeAnim.setValue(0);
    await fetchSummary();
    setRefreshing(false);
  }, [fadeAnim, fetchSummary]);

  const stats = summaryData?.stats || {};

  return (
    <View style={styles.container}>
      <Header title="AI Health Insights" subtitle="Powered by Campus Titan AI" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {loading ? (
          <PulseLoader />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.modelBadge}>
              <Text style={styles.modelIcon}>🤖</Text>
              <Text style={styles.modelText}>Model: {summaryData?.model || 'LLaMA (local)'}</Text>
            </View>

            <View style={styles.scoreRing}>
              <LinearGradient
                colors={
                  (stats.dailyScore || 0) >= 70
                    ? COLORS.gradientAccent
                    : (stats.dailyScore || 0) >= 40
                      ? COLORS.gradientPrimary
                      : COLORS.gradientCoral
                }
                style={styles.scoreCircle}
              >
                <Text style={styles.scoreNumber}>{Math.round(stats.dailyScore || 0)}</Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </LinearGradient>
              <Text style={styles.scoreTitle}>Daily Health Score</Text>
              <Text style={styles.scoreSubtitle}>EMA Trend: {stats.ema || '—'}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
              <StatChip icon="🔥" label="Calories" value={`${stats.calories || 0}`} color={COLORS.coral} />
              <StatChip icon="💪" label="Protein" value={`${stats.protein || 0}g`} color={COLORS.primary} />
              <StatChip icon="🏃" label="Active" value={`${stats.activeMinutes || 0}m`} color={COLORS.accent} />
              <StatChip icon="😊" label="Mood" value={stats.mood || '—'} color={COLORS.info} />
              <StatChip icon="😴" label="Sleep" value={`${stats.sleepHours || '—'}h`} color="#8B5CF6" />
              <StatChip icon="📊" label="Nutrition" value={`${stats.nutritionDensity || 0}`} color={COLORS.orange} />
            </ScrollView>

            {summaryData?.geminiContext ? (
              <InsightSection
                icon="✨"
                title="Trend Analysis"
                content={summaryData.geminiContext}
                gradient={COLORS.gradientSunset}
              />
            ) : null}

            <InsightSection
              icon="🧠"
              title="AI Health Coach"
              content={summaryData?.summary || 'No response generated.'}
              gradient={['#8B5CF6', '#6D28D9']}
            />

            {sections?.nutrition ? (
              <InsightSection
                icon="🥗"
                title="Nutrition Insight"
                content={sections.nutrition}
                gradient={['#22C55E', '#16A34A']}
              />
            ) : null}

            {sections?.activity ? (
              <InsightSection
                icon="🏃"
                title="Activity Review"
                content={sections.activity}
                gradient={['#06B6D4', '#0284C7']}
              />
            ) : null}

            {sections?.mental ? (
              <InsightSection
                icon="🧘"
                title="Mental Wellness"
                content={sections.mental}
                gradient={['#F59E0B', '#EF4444']}
              />
            ) : null}

            <Text style={styles.timestamp}>Last updated: {format(new Date(), 'hh:mm a, dd MMM yyyy')}</Text>

            <View style={{ height: 40 }} />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  scroll: { paddingBottom: SPACING.huge },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  loadingSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxl,
  },

  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.xxl,
  },
  errorEmoji: { fontSize: 48 },
  errorTitle: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  errorMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
  },
  retryText: { color: COLORS.textInverse, ...FONTS.bold, fontSize: FONT_SIZES.md },

  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  modelIcon: { fontSize: 14, marginRight: SPACING.sm },
  modelText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },

  scoreRing: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  scoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  scoreNumber: {
    fontSize: 36,
    ...FONTS.extraBold,
    color: '#FFF',
  },
  scoreLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    ...FONTS.medium,
    marginTop: -2,
  },
  scoreTitle: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  scoreSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginTop: 2,
  },

  statsScroll: {
    paddingLeft: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statChip: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginRight: SPACING.md,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
  },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: FONT_SIZES.lg, ...FONTS.extraBold, marginTop: 4 },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  sectionCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  sectionGradientBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionIcon: { fontSize: 20, marginRight: SPACING.sm },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
  },
  sectionContent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    ...FONTS.regular,
  },

  timestamp: {
    textAlign: 'center',
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    ...FONTS.medium,
  },
});
