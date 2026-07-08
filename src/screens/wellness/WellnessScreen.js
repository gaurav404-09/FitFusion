// Wellness Screen - Premium Redesigned UI
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONTS,
  BORDER_RADIUS,
  SHADOWS,
  MOOD_EMOJIS,
} from "../../theme";
import {
  GradientCard,
  StatCard,
  SectionHeader,
  AnimatedButton,
} from "../../components/common";
import { useAuth } from "../../services/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../services/database";
import { format, subDays } from "date-fns";
import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

const DetailItem = ({ label, value, color, big }) => (
  <View style={styles.detailItem}>
    <Text
      style={[
        styles.detailValue,
        big && { fontSize: 24, color: color || COLORS.text },
      ]}
    >
      {value}
    </Text>
    <Text style={styles.detailLabel}>{label}</Text>
  </View>
);

export default function WellnessScreen({ navigation }) {
  const { user } = useAuth();
  const [moodLogs, setMoodLogs] = useState([]);
  const [journals, setJournals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // New State for Wellness History
  const [wellnessHistory, setWellnessHistory] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    console.log('🧠 [WellnessScreen] Loading data for user:', user.id);
    console.log('🧠 [WellnessScreen] User email:', user.email);

    const moods = await db.getMoodLogs(user.id);
    console.log('🧠 [WellnessScreen] Mood logs found:', moods.length);
    console.log('🧠 [WellnessScreen] Mood data:', moods.map(m => ({ date: m.date, mood: m.mood })));

    setMoodLogs(moods.sort((a, b) => b.date.localeCompare(a.date)));
    const j = await db.getJournals(user.id);
    console.log('🧠 [WellnessScreen] Journals found:', j.length);
    setJournals(j.sort((a, b) => b.date.localeCompare(a.date)));

    // Load Wellness History
    const history = await db.getWellnessHistory(7, user.id);
    const historyWithScore = (history || []).map((h) => {
      // Guard against undefined/null/NaN field values before computing scores
      const sleepHrs = Number.isFinite(Number(h.sleepHrs))
        ? Number(h.sleepHrs)
        : 0;
      const walkedKm = Number.isFinite(Number(h.walkedKm))
        ? Number(h.walkedKm)
        : 0;
      const stressLvl = Number.isFinite(Number(h.stressLevel))
        ? Number(h.stressLevel)
        : 5;
      const productivity = Number.isFinite(Number(h.productivity))
        ? Number(h.productivity)
        : 50;

      // Simple score calculation (0-100)
      // Normalize:
      // Sleep: 8hrs = 100%
      const sleepScore = Math.min(100, (sleepHrs / 8) * 100);
      // Walk: 5km = 100%
      const walkScore = Math.min(100, (walkedKm / 5) * 100);
      // Stress: 1 is best (100%), 10 is worst (0%)
      const stressScore = (11 - stressLvl) * 10;
      // Productivity: 0-100
      const prodScore = productivity;

      const rawScore =
        sleepScore * 0.25 +
        walkScore * 0.15 +
        stressScore * 0.35 +
        prodScore * 0.25;
      const score = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
      return { ...h, score };
    });
    // Sort oldest to newest for chart
    setWellnessHistory(
      historyWithScore.sort((a, b) => new Date(a.date) - new Date(b.date)),
    );
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const todayMood = moodLogs.find((m) => m.date === today);

  // Weekly mood data
  const weekMoods = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const log = moodLogs.find((m) => m.date === date);
    return {
      day: format(subDays(new Date(), 6 - i), "EEE"),
      mood: log?.mood || 0,
      date,
    };
  });

  const avgMood =
    moodLogs.length > 0
      ? (
        moodLogs.slice(0, 7).reduce((s, m) => s + m.mood, 0) /
        Math.min(moodLogs.length, 7)
      ).toFixed(1)
      : "—";

  // Mood streak
  let moodStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (moodLogs.some((m) => m.date === d)) moodStreak++;
    else break;
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <View style={styles.container}>
      {/* Premium Modal */}
      <Modal
        visible={!!selectedLog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedLog(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedLog(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <LinearGradient
                  colors={COLORS.gradientHero}
                  style={styles.modalHeader}
                >
                  <Text style={styles.modalTitle}>Daily Snapshot</Text>
                  <Text style={styles.modalDate}>
                    {selectedLog &&
                      format(new Date(selectedLog.date), "EEEE, MMMM do")}
                  </Text>
                </LinearGradient>

                <ScrollView
                  style={{ maxHeight: 380 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalGrid}>
                    <DetailItem
                      label="Score"
                      value={selectedLog?.score ?? "—"}
                      color={COLORS.primary}
                      big
                    />
                    <DetailItem
                      label="Occupation"
                      value={selectedLog?.occupation || "—"}
                    />
                    <DetailItem
                      label="Work Mode"
                      value={selectedLog?.workMode || "—"}
                    />
                    <DetailItem
                      label="Exercise"
                      value={`${selectedLog?.exerciseMins ?? 0}m`}
                    />
                    <DetailItem
                      label="Steps"
                      value={`${selectedLog?.steps ?? 0}`}
                    />
                    <DetailItem
                      label="Walked"
                      value={`${selectedLog?.walkedKm ?? 0}km`}
                    />
                    <DetailItem
                      label="Sleep"
                      value={`${selectedLog?.sleepHrs ?? 0}h`}
                    />
                    <DetailItem
                      label="Screen"
                      value={`${selectedLog?.screenTimeHrs ?? 0}h`}
                    />
                    <DetailItem
                      label="Work Screen"
                      value={`${selectedLog?.workScreenHrs ?? 0}h`}
                    />
                    <DetailItem
                      label="Leisure Screen"
                      value={`${selectedLog?.leisureScreenHrs ?? 0}h`}
                    />
                    <DetailItem
                      label="Social"
                      value={`${selectedLog?.socialHrs ?? 0}h`}
                    />
                    <DetailItem
                      label="Sleep Quality"
                      value={`${selectedLog?.sleepQuality ?? "—"}/5`}
                    />
                    <DetailItem
                      label="Stress"
                      value={`${selectedLog?.stressLevel ?? "—"}/10`}
                    />
                    <DetailItem
                      label="Productivity"
                      value={`${selectedLog?.productivity ?? "—"}/100`}
                    />
                    <DetailItem
                      label="Time"
                      value={
                        selectedLog?.timestamp
                          ? format(new Date(selectedLog.timestamp), "p")
                          : "—"
                      }
                    />
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelectedLog(null)}
                >
                  <LinearGradient
                    colors={COLORS.gradientPrimary}
                    style={styles.closeBtnGradient}
                  >
                    <Text style={styles.closeBtnText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <Text style={styles.headerTitle}>Mental Wellness</Text>

        {/* Today's Mood - Premium Card */}
        <GradientCard
          gradient={todayMood ? COLORS.gradientHero : COLORS.gradientCard}
          style={styles.moodCard}
        >
          {todayMood ? (
            <View style={styles.todayMood}>
              <View style={styles.todayMoodEmojiWrap}>
                <Text style={styles.todayMoodEmoji}>
                  {MOOD_EMOJIS[5 - todayMood.mood]?.emoji}
                </Text>
              </View>
              <View style={styles.todayMoodContent}>
                <Text style={styles.todayMoodLabel}>Today's Mood</Text>
                <Text style={styles.todayMoodText}>
                  {MOOD_EMOJIS[5 - todayMood.mood]?.label}
                </Text>
                {todayMood.note && (
                  <Text style={styles.todayMoodNote}>{todayMood.note}</Text>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.logMoodPrompt}
              onPress={() => navigation.navigate("MoodLog")}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.logMoodGradient}
              >
                <Text style={styles.logMoodEmoji}>😊</Text>
                <Text style={styles.logMoodText}>How are you feeling today?</Text>
                <Text style={styles.logMoodCta}>Tap to log your mood →</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </GradientCard>

        {/* Mental Wellness Score Trend */}
        <SectionHeader title="Wellness Score Trend" />
        {wellnessHistory.length > 0 ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: wellnessHistory.map((h) =>
                  format(new Date(h.date), "dd/MM"),
                ),
                datasets: [{ data: wellnessHistory.map((h) => h.score) }],
              }}
              width={width - SPACING.lg * 2}
              height={220}
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: (opacity = 1) => COLORS.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: COLORS.primary,
                },
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
              onDataPointClick={({ index }) =>
                setSelectedLog(wellnessHistory[index])
              }
            />
            <Text style={styles.chartHint}>Tap a point to view details</Text>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.emptyIconGradient}>
              <Text style={styles.emptyIcon}>📊</Text>
            </LinearGradient>
            <Text style={styles.emptyText}>
              No wellness data yet. Complete a check-in!
            </Text>
            <AnimatedButton
              title="Start Check-in"
              onPress={() => navigation.navigate("DailyWellnessCheckIn")}
              variant="primary"
              style={{ marginTop: SPACING.md }}
            />
          </View>
        )}

        {/* Quick Actions - Premium Grid */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("MoodLog")}
          >
            <LinearGradient
              colors={COLORS.gradientSunset}
              style={styles.actionGradient}
            >
              <Text style={styles.actionEmoji}>😊</Text>
              <Text style={styles.actionLabel}>Log Mood</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("Journal")}
          >
            <LinearGradient
              colors={COLORS.gradientOcean}
              style={styles.actionGradient}
            >
              <Text style={styles.actionEmoji}>📝</Text>
              <Text style={styles.actionLabel}>Journal</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("WellnessCircle")}
          >
            <LinearGradient
              colors={COLORS.gradientViolet}
              style={styles.actionGradient}
            >
              <Text style={styles.actionEmoji}>🤝</Text>
              <Text style={styles.actionLabel}>Circles</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats - Premium Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Avg Mood"
            value={avgMood}
            icon="📊"
            color={COLORS.primary}
            subtitle="Last 7 days"
          />
          <StatCard
            title="Log Streak"
            value={moodStreak}
            unit="days"
            icon="🔥"
            color={COLORS.accent}
          />
        </View>

        {/* Weekly Mood Trend */}
        <SectionHeader title="Weekly Mood Trend" />
        <View style={styles.moodChart}>
          {weekMoods.map((d, i) => {
            const moodInfo = d.mood > 0 ? MOOD_EMOJIS[5 - d.mood] : null;
            return (
              <View key={i} style={styles.moodChartItem}>
                <View
                  style={[
                    styles.moodChartDot,
                    {
                      backgroundColor:
                        moodInfo?.color || COLORS.surfaceElevated,
                      bottom: d.mood > 0 ? (d.mood / 5) * 50 : 0,
                    },
                  ]}
                >
                  <Text style={{ fontSize: d.mood > 0 ? 16 : 12 }}>
                    {moodInfo?.emoji || "—"}
                  </Text>
                </View>
                <Text style={styles.moodChartDay}>{d.day}</Text>
              </View>
            );
          })}
        </View>

        {/* Recent Mood Logs */}
        <SectionHeader title="Recent Mood Logs" />
        {moodLogs.slice(0, 7).map((log, i) => {
          const moodInfo = MOOD_EMOJIS[5 - log.mood];
          return (
            <View key={i} style={styles.moodLogItem}>
              <LinearGradient
                colors={[moodInfo?.color + '15', moodInfo?.color + '08']}
                style={styles.moodLogEmojiWrap}
              >
                <Text style={styles.moodLogEmoji}>{moodInfo?.emoji}</Text>
              </LinearGradient>
              <View style={styles.moodLogInfo}>
                <Text style={styles.moodLogDate}>
                  {log.date} • {log.time}
                </Text>
                {log.note && <Text style={styles.moodLogNote}>{log.note}</Text>}
              </View>
              <View
                style={[
                  styles.moodBadge,
                  { backgroundColor: moodInfo?.color + '18' },
                ]}
              >
                <Text
                  style={[styles.moodBadgeText, { color: moodInfo?.color }]}
                >
                  {moodInfo?.label}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Recent Journals */}
        <SectionHeader
          title="Journal Entries"
          action={() => navigation.navigate("Journal")}
          actionLabel="View All"
        />
        {journals.slice(0, 3).map((j, i) => (
          <TouchableOpacity
            key={i}
            style={styles.journalItem}
            onPress={() => navigation.navigate("JournalEntry", { journal: j })}
          >
            <View style={styles.journalHeader}>
              <Text style={styles.journalTitle}>{j.title}</Text>
              <View style={styles.journalDateBadge}>
                <Text style={styles.journalDate}>{j.date}</Text>
              </View>
            </View>
            <Text style={styles.journalPreview} numberOfLines={2}>
              {j.body}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 140 },
  headerTitle: {
    fontSize: FONT_SIZES.xxxl,
    ...FONTS.extraBold,
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  // Mood Card - Premium
  moodCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  todayMood: { flexDirection: "row", alignItems: "center" },
  todayMoodEmojiWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  todayMoodEmoji: { fontSize: 40 },
  todayMoodLabel: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.sm,
    opacity: 0.85,
  },
  todayMoodText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.xxl,
    ...FONTS.bold,
  },
  todayMoodNote: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.sm,
    opacity: 0.9,
    marginTop: SPACING.xs,
  },
  logMoodPrompt: { alignItems: "center", paddingVertical: SPACING.md },
  logMoodGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logMoodEmoji: { fontSize: 40, marginBottom: SPACING.sm },
  logMoodText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    ...FONTS.semiBold,
  },
  logMoodCta: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },

  // Actions - Premium Grid
  actions: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionBtn: { flex: 1 },
  actionGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: "center",
    minHeight: 90,
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  actionEmoji: { fontSize: 28, marginBottom: SPACING.xs },
  actionLabel: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.xs,
    ...FONTS.semiBold,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },

  // Mood Chart
  moodChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    height: 150,
    alignItems: "flex-end",
    paddingBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.lg,
    ...SHADOWS.small,
  },
  moodChartItem: { alignItems: "center", width: 30 },
  moodChartDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  moodChartDay: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    ...FONTS.medium,
  },

  // Mood Log Items - Premium
  moodLogItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorderLight,
  },
  moodLogEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  moodLogEmoji: { fontSize: 24 },
  moodLogInfo: { flex: 1 },
  moodLogDate: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    ...FONTS.medium,
  },
  moodLogNote: { color: COLORS.text, fontSize: FONT_SIZES.sm, marginTop: 2 },
  moodBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  moodBadgeText: { fontSize: 10, ...FONTS.bold },

  // Journal Items - Premium
  journalItem: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    ...SHADOWS.small,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  journalTitle: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
    flex: 1,
  },
  journalDateBadge: {
    backgroundColor: COLORS.primarySubtle,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  journalDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    ...FONTS.medium,
  },
  journalPreview: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  // Chart & Modal
  chartContainer: { alignItems: "center", marginHorizontal: SPACING.lg },
  chartHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  emptyChart: {
    padding: SPACING.xl,
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.small,
  },
  emptyIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyIcon: { fontSize: 28 },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },

  // Modal - Premium
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  modalHeader: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textInverse,
    textAlign: "center",
  },
  modalDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.85,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: SPACING.lg,
  },
  detailItem: {
    width: "45%",
    marginBottom: SPACING.md,
    alignItems: "center",
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
  },
  detailValue: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text
  },
  detailLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    margin: SPACING.lg,
    marginTop: 0,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  closeBtnGradient: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.textInverse,
    ...FONTS.bold,
    fontSize: FONT_SIZES.md,
  },
});

