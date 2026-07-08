import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS } from "../../theme";
import {
  Header,
  GradientCard,
  SectionHeader,
  Chip,
  ProgressBar,
} from "../../components/common";
import { useFocusEffect } from "@react-navigation/native";
import analyticsService from "../../services/AnalyticsService";

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ navigation }) {
  const [selectedView, setSelectedView] = useState("hostel");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadAnalytics = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await analyticsService.getCampusAnalytics();
          if (isMounted) {
            setAnalytics(data);
          }
        } catch (err) {
          if (isMounted) {
            setError(err.message);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      loadAnalytics();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Moved ABOVE early returns so hooks are always called in the same order
  const processedData = useMemo(() => {
    if (!analytics) return null;
    const hostelStats = (analytics.collegeStats || []).map((c) => ({
      hostel: c.college,
      avgActivityMinutes: c.avgActivityMinutes || 0,
      avgCaloriesConsumed: c.avgCaloriesConsumed || 0,
      avgMoodScore: c.avgMoodScore || "0.0",
      participationRate: c.participationRate || 0,
      activeUsers: c.activeUsers || 0,
      topActivity: c.topActivity || "None",
    }));

    const departmentStats = (analytics.collegeStats || []).map((c) => {
      const collegeName = String(c?.college ?? "");
      return {
        department:
          collegeName.length > 22 ? collegeName.slice(0, 22) + "…" : collegeName,
        avgActivityMinutes: c.avgActivityMinutes || 0,
        participationRate: c.participationRate || 0,
        topActivity: c.topActivity || "None",
      };
    });

    return {
      hostelStats,
      departmentStats,
      weeklyTrends: analytics.weeklyTrends || []
    };
  }, [analytics]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Campus Analytics" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (error || !analytics) {
    return (
      <View style={styles.container}>
        <Header title="Campus Analytics" onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Analytics unavailable</Text>
          <Text style={styles.errorSubtext}>Please check your connection</Text>
        </View>
      </View>
    );
  }


  if (!processedData) {
    return (
      <View style={styles.container}>
        <Header title="Campus Analytics" onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data available yet</Text>
          <Text style={styles.emptySubtext}>
            Start logging activities to see analytics
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Campus Analytics"
        subtitle="Anonymized insights"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : null}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Privacy Notice */}
        <GradientCard gradient={COLORS.gradientCard} style={styles.privacyCard}>
          <Text style={styles.privacyEmoji}>🔒</Text>
          <Text style={styles.privacyText}>All analytics are anonymized. No personal data is shared.</Text>
        </GradientCard>

        {/* View Toggle */}
        <View style={styles.toggleRow}>
          {['hostel', 'department', 'trends'].map(v => (
            <Chip key={v} label={v.charAt(0).toUpperCase() + v.slice(1)} selected={selectedView === v} onPress={() => setSelectedView(v)} color={COLORS.primary} />
          ))}
        </View>

        {/* ── College Comparison ── */}
        {selectedView === "hostel" && (
          <>
            <SectionHeader title="Students Tracked by College 🏛️" />
            <View style={styles.barChart}>
              {processedData.hostelStats.map((h, i) => {
                const maxVal = Math.max(
                  ...processedData.hostelStats.map((s) => s.activeUsers),
                  1
                );
                const barH = Math.max((h.activeUsers / maxVal) * 100, 4);
                return (
                  <View key={i} style={styles.barItem}>
                    <Text style={styles.barValue}>{h.activeUsers}</Text>
                    <LinearGradient
                      colors={
                        COLORS.chartColors && COLORS.chartColors[i]
                          ? [
                            COLORS.chartColors[i],
                            COLORS.chartColors[i] + "88",
                          ]
                          : COLORS.gradientPrimary
                      }
                      style={[styles.bar, { height: barH }]}
                    />
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {String(h?.hostel ?? "").split(" ")[0]}
                    </Text>
                  </View>
                );
              })}
            </View>

            <SectionHeader title="College Details" />
            {processedData.hostelStats.map((h, i) => (
              <View key={i} style={styles.hostelCard}>
                <View style={styles.hostelHeader}>
                  <View
                    style={[
                      styles.hostelBadge,
                      {
                        backgroundColor:
                          ((COLORS.chartColors && COLORS.chartColors[i]) ||
                            COLORS.primary) + "22",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hostelBadgeText,
                        {
                          color:
                            (COLORS.chartColors && COLORS.chartColors[i]) ||
                            COLORS.primary,
                        },
                      ]}
                    >
                      {String(i + 1)}
                    </Text>
                  </View>
                  <Text style={styles.hostelName} numberOfLines={1}>
                    {h.hostel}
                  </Text>
                  <Text style={styles.hostelUsers}>{h.activeUsers} students</Text>
                </View>

                <View style={styles.hostelStats}>
                  <View style={styles.hostelStat}>
                    <Text style={styles.hostelStatValue}>
                      {h.avgActivityMinutes}
                    </Text>
                    <Text style={styles.hostelStatLabel}>Avg Min/Day</Text>
                  </View>

                  <View style={styles.hostelStat}>
                    <Text style={styles.hostelStatValue}>
                      {h.avgCaloriesConsumed}
                    </Text>
                    <Text style={styles.hostelStatLabel}>Avg kcal</Text>
                  </View>

                  <View style={styles.hostelStat}>
                    <Text style={styles.hostelStatValue}>
                      {h.avgMoodScore}
                    </Text>
                    <Text style={styles.hostelStatLabel}>Avg Mood</Text>
                  </View>

                  <View style={styles.hostelStat}>
                    <Text style={styles.hostelStatValue}>
                      {h.participationRate}%
                    </Text>
                    <Text style={styles.hostelStatLabel}>Participation</Text>
                  </View>
                </View>

                <View style={styles.participationBar}>
                  <Text style={styles.pbLabel}>Participation rate</Text>
                  <ProgressBar
                    progress={h.participationRate}
                    color={(COLORS.chartColors && COLORS.chartColors[i]) || COLORS.primary}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Department Comparison ── */}
        {selectedView === "department" && (
          <>
            <SectionHeader title="Department Activity" />
            {processedData.departmentStats.map((d, i) => (
              <View key={i} style={styles.deptCard}>
                <View style={styles.deptHeader}>
                  <Text style={styles.deptName} numberOfLines={1}>
                    {d.department}
                  </Text>
                  <View
                    style={[
                      styles.deptTopActivity,
                      {
                        backgroundColor:
                          ((COLORS.chartColors && COLORS.chartColors[i]) ||
                            COLORS.primary) + "22",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deptTopText,
                        {
                          color:
                            (COLORS.chartColors && COLORS.chartColors[i]) ||
                            COLORS.primary,
                        },
                      ]}
                    >
                      {d.topActivity === "gym"
                        ? "🏋️"
                        : d.topActivity === "running"
                          ? "🏃"
                          : d.topActivity === "sports"
                            ? "⚽"
                            : d.topActivity === "yoga"
                              ? "🧘"
                              : "🚴"}{" "}
                      {d.topActivity}
                    </Text>
                  </View>
                </View>

                <View style={styles.deptStats}>
                  <View>
                    <Text style={styles.deptStatValue}>
                      {d.avgActivityMinutes} min
                    </Text>
                    <Text style={styles.deptStatLabel}>Avg Activity/Day</Text>
                  </View>
                  <View>
                    <Text style={styles.deptStatValue}>
                      {d.participationRate}%
                    </Text>
                    <Text style={styles.deptStatLabel}>Participation</Text>
                  </View>
                </View>

                <ProgressBar
                  progress={d.participationRate}
                  color={(COLORS.chartColors && COLORS.chartColors[i]) || COLORS.primary}
                  style={{ marginTop: SPACING.md }}
                />
              </View>
            ))}
          </>
        )}

        {/* ── Weekly Trends ── */}
        {selectedView === "trends" && (
          <>
            <SectionHeader title="Campus-wide Weekly Trends" />
            <View style={styles.trendCards}>
              {processedData.weeklyTrends.map((d, i) => (
                <View key={i} style={styles.trendCard}>
                  <Text style={styles.trendDay}>{d.day}</Text>
                  <View style={styles.trendStats}>
                    <Text style={styles.trendStat}>🏃 {d.totalActivities}</Text>
                    <Text style={styles.trendStat}>😊 {d.avgMood}</Text>
                    <Text style={styles.trendStat}>🔥 {d.avgCalories}</Text>
                  </View>
                </View>
              ))}
            </View>

            <SectionHeader title="Activity Trend" />
            <View style={styles.trendChart}>
              {processedData.weeklyTrends.map((d, i) => {
                const maxAct = Math.max(
                  ...processedData.weeklyTrends.map((t) => t.totalActivities),
                  1
                );
                const barH = Math.max((d.totalActivities / maxAct) * 80, 4);
                return (
                  <View key={i} style={styles.trendBarItem}>
                    <Text style={styles.trendBarValue}>{d.totalActivities}</Text>
                    <LinearGradient
                      colors={COLORS.gradientPrimary}
                      style={[styles.trendBarFill, { height: barH }]}
                    />
                    <Text style={styles.trendBarDay}>{d.day}</Text>
                  </View>
                );
              })}
            </View>

            <SectionHeader title="Mood Trend" />
            <View style={styles.trendChart}>
              {processedData.weeklyTrends.map((d, i) => {
                const barH = Math.max((parseFloat(d.avgMood) / 5) * 80, 4);
                return (
                  <View key={i} style={styles.trendBarItem}>
                    <Text style={styles.trendBarValue}>{d.avgMood}</Text>
                    <LinearGradient
                      colors={COLORS.gradientAccent}
                      style={[styles.trendBarFill, { height: barH }]}
                    />
                    <Text style={styles.trendBarDay}>{d.day}</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  content: { paddingBottom: SPACING.huge },

  privacyCard: {
    marginHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  privacyEmoji: { fontSize: 20, marginRight: SPACING.md },
  privacyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },

  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
    gap: SPACING.sm,
  },

  // ── College bar chart ──
  barChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    height: 160,
  },
  barItem: { alignItems: "center", flex: 1 },
  barValue: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 4,
    ...FONTS.bold,
  },
  bar: { width: 28, borderRadius: BORDER_RADIUS.sm },
  barLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.sm,
    maxWidth: 52,
    textAlign: "center",
  },

  // ── College detail cards ──
  hostelCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  hostelHeader: { flexDirection: "row", alignItems: "center" },
  hostelBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  hostelBadgeText: { fontSize: FONT_SIZES.md, ...FONTS.bold },
  hostelName: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    ...FONTS.semiBold,
  },
  hostelUsers: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  hostelStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: SPACING.lg,
  },
  hostelStat: { alignItems: "center" },
  hostelStatValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
  },
  hostelStatLabel: { color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  participationBar: { marginTop: SPACING.md },
  pbLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },

  // ── Department cards ──
  deptCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  deptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deptName: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    ...FONTS.semiBold,
    flex: 1,
  },
  deptTopActivity: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    marginLeft: SPACING.sm,
  },
  deptTopText: { fontSize: FONT_SIZES.sm, ...FONTS.medium },
  deptStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  deptStatValue: { color: COLORS.text, fontSize: FONT_SIZES.md, ...FONTS.bold },
  deptStatLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },

  // ── Trend cards ──
  trendCards: { paddingHorizontal: SPACING.lg },
  trendCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  trendDay: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    minWidth: 40,
  },
  trendStats: { flexDirection: "row", gap: SPACING.lg },
  trendStat: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },

  trendChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    height: 130,
  },
  trendBarItem: { alignItems: "center" },
  trendBarValue: { color: COLORS.textMuted, fontSize: 9, marginBottom: 4 },
  trendBarFill: { width: 28, borderRadius: BORDER_RADIUS.sm },
  trendBarDay: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.sm,
  },

  // ── View States ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    ...FONTS.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    ...FONTS.semiBold,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    ...FONTS.medium,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    ...FONTS.semiBold,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    ...FONTS.medium,
    textAlign: "center",
  },
});