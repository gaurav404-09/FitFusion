// CampusPulseLeaderboardScreen.js — Campus Pulse: Hostel vs Branch Rankings
// PS #3 — All rankings are based strictly on per-student AVERAGES, never raw totals.
// This ensures fairness across groups of different sizes (e.g. a branch with 20 students
// is compared on the same footing as one with 200 students).

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONTS,
  BORDER_RADIUS,
  SHADOWS,
} from "../../theme";
import db from "../../services/database";
import { useAuth } from "../../services/AuthContext";
import analyticsService from "../../services/AnalyticsService";

const { width: W } = Dimensions.get("window");

// ─── CRITICAL LOGIC NOTE ──────────────────────────────────────────────────────
// All metric values stored here are PER-STUDENT AVERAGES (or medians).
// "avgActiveMins" = average active minutes PER DAY PER STUDENT in that group.
// "avgMentalScore" = average mental wellness score (out of 100) PER STUDENT.
// "avgNutrition" = composite nutrition grade (WIP — backend pending; shown as grade).
// Rankings are sorted by a composite score derived from these averages.
// ─────────────────────────────────────────────────────────────────────────────

// Helper to derive grade from nutrition score
function nutritionGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 82) return 'A-';
  if (score >= 78) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 68) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  return 'C-';
}

// Helper to get color for nutrition grade
function gradeColor(grade) {
  if (!grade) return COLORS.textMuted;
  if (grade.startsWith('A')) return COLORS.success;
  if (grade.startsWith('B')) return COLORS.primary;
  return COLORS.orange;
}

// Helper to compute trend (placeholder: static 'same' for now)
function computeTrend() {
  return 'same'; // TODO: compute from historical data if needed
}

// ─── Rank colours ─────────────────────────────────────────────────────────────
const MEDAL = {
  1: { bg: ["#F59E0B", "#D97706"], text: "#FFFFFF", icon: "🥇" },
  2: { bg: ["#94A3B8", "#64748B"], text: "#FFFFFF", icon: "🥈" },
  3: { bg: ["#CD7F32", "#A0522D"], text: "#FFFFFF", icon: "🥉" },
};

// ─── Trend arrow ──────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  if (trend === "up")
    return <Text style={[s.trend, { color: COLORS.success }]}>▲</Text>;
  if (trend === "down")
    return <Text style={[s.trend, { color: COLORS.error }]}>▼</Text>;
  return <Text style={[s.trend, { color: COLORS.textMuted }]}>—</Text>;
}

// ─── Top-3 Podium ─────────────────────────────────────────────────────────────
function Podium({ data }) {
  const top3 = data.slice(0, 3);
  if (top3.length < 3) return null;

  // Podium order: 2nd | 1st | 3rd
  const order = [top3[1], top3[0], top3[2]];
  const heights = [100, 130, 80];
  const avatarSizes = [48, 60, 44];

  return (
    <View style={s.podiumWrapper}>
      {order.map((item, idx) => {
        const realRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
        const medal = MEDAL[realRank];
        return (
          <View key={item.id} style={s.podiumCol}>
            {/* Avatar circle */}
            <LinearGradient
              colors={medal.bg}
              style={[
                s.podiumAvatar,
                {
                  width: avatarSizes[idx],
                  height: avatarSizes[idx],
                  borderRadius: avatarSizes[idx] / 2,
                },
              ]}
            >
              <Text style={{ fontSize: avatarSizes[idx] * 0.45 }}>
                {item.emoji}
              </Text>
            </LinearGradient>

            {/* Medal icon */}
            <Text style={s.podiumMedalIcon}>{medal.icon}</Text>

            {/* Name */}
            <Text style={s.podiumName} numberOfLines={2}>
              {item.shortName}
            </Text>

            {/* Score */}
            <Text style={s.podiumScore}>{item.avgActiveMins}m avg</Text>

            {/* Platform */}
            <LinearGradient
              colors={medal.bg}
              style={[s.podiumPlatform, { height: heights[idx] }]}
            >
              <Text style={[s.podiumRankNum, { color: medal.text }]}>
                {realRank}
              </Text>
            </LinearGradient>
          </View>
        );
      })}
    </View>
  );
}

// ─── Metric mini-pill ─────────────────────────────────────────────────────────
function MetricPill({ icon, label, value, valueColor }) {
  return (
    <View style={s.metricPill}>
      <Text style={s.metricIcon}>{icon}</Text>
      <Text style={[s.metricValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

// ─── Row Card (rank 4+) ───────────────────────────────────────────────────────
function RowCard({ item, isCurrentUserGroup }) {
  const medal = MEDAL[item.rank];

  return (
    <View style={[s.rowCard, isCurrentUserGroup && s.rowCardHighlight]}>
      {/* Rank + trend */}
      <View style={s.rowLeft}>
        {medal ? (
          <LinearGradient colors={medal.bg} style={s.rankBadge}>
            <Text style={s.rankBadgeText}>{item.rank}</Text>
          </LinearGradient>
        ) : (
          <View style={s.rankBadgePlain}>
            <Text style={s.rankBadgePlainText}>{item.rank}</Text>
          </View>
        )}
        <TrendBadge trend={item.trend} />
      </View>

      {/* Name + student count */}
      <View style={s.rowCenter}>
        <Text style={s.rowEmoji}>{item.emoji}</Text>
        <View style={s.rowNameBlock}>
          <Text style={s.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={s.rowMeta}>{item.studentCount} students tracked</Text>
        </View>
      </View>

      {/* 3 Metric pills */}
      <View style={s.rowMetrics}>
        <MetricPill
          icon="⚡"
          label="min/day"
          value={`${item.avgActiveMins}`}
          valueColor={
            item.avgActiveMins >= 45
              ? COLORS.success
              : item.avgActiveMins >= 35
                ? COLORS.primary
                : COLORS.orange
          }
        />
        <MetricPill
          icon="🧠"
          label="/100"
          value={`${item.avgMentalScore}`}
          valueColor={
            item.avgMentalScore >= 80
              ? COLORS.success
              : item.avgMentalScore >= 70
                ? COLORS.primary
                : COLORS.orange
          }
        />
        <MetricPill
          icon="🥗"
          label="nutrition"
          value={item.avgNutrition}
          valueColor={gradeColor(item.avgNutrition)}
        />
      </View>
    </View>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabButton({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.tabBtn, active && s.tabBtnActive]}
    >
      <Text style={s.tabBtnIcon}>{icon}</Text>
      <Text style={[s.tabBtnText, active && s.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Legend / disclaimer row ──────────────────────────────────────────────────
function Legend() {
  return (
    <View style={s.legendBox}>
      <Text style={s.legendTitle}>📐 How rankings work</Text>
      <Text style={s.legendBody}>
        All metrics are <Text style={s.legendBold}>per-student averages</Text>,
        never totals. This ensures a 50-person branch is judged on the same
        scale as a 200-person branch — making the comparison{" "}
        <Text style={s.legendBold}>fair & meaningful</Text>.
      </Text>
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <Text style={s.legendDot}>⚡</Text>
          <Text style={s.legendText}>Avg Active Min/Day</Text>
        </View>
        <View style={s.legendItem}>
          <Text style={s.legendDot}>🧠</Text>
          <Text style={s.legendText}>Avg Mental Score</Text>
        </View>
        <View style={s.legendItem}>
          <Text style={s.legendDot}>🥗</Text>
          <Text style={s.legendText}>Avg Nutrition (WIP)</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CampusPulseLeaderboardScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("hostel"); // 'hostel' | 'branch'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      try {
        const [leaderboardRes, counts] = await Promise.all([
          db.supabase.rpc('get_leaderboard', { college_param: user?.college || null }),
          user?.college ? analyticsService.getGroupCounts(user.college) : { hostels: {}, branches: {} }
        ]);

        const { data: rpcData, error } = leaderboardRes;
        if (error) throw error;

        // Transform RPC data to coherent UI rows (one row per group, not per metric)
        const filteredRows = (rpcData || []).filter(row => {
          const label = row.branch_or_hostel || '';
          return activeTab === 'hostel'
            ? /hostel/i.test(label)
            : !/hostel/i.test(label);
        });

        const grouped = filteredRows.reduce((acc, row) => {
          const key = row.branch_or_hostel || 'Unknown';
          if (!acc[key]) {
            acc[key] = {
              name: key,
              metrics: {},
              rankHints: [],
            };
          }
          acc[key].metrics[row.metric_type] = Number(row.value || 0);
          if (typeof row.rank === 'number') acc[key].rankHints.push(row.rank);
          return acc;
        }, {});

        const transformed = Object.values(grouped)
          .map((group) => {
            // RPC metric_type is now 'avg_active_mins' (was 'avg_steps')
            const avgActiveMins = Math.round(group.metrics.avg_active_mins || group.metrics.avg_steps || 0);
            const avgMood = Math.round(group.metrics.avg_mood || 0);
            const avgNutritionNum = Math.round(group.metrics.avg_nutrition || 0);

            // Composite ranking score from DB-backed metrics only
            const score = (avgActiveMins * 0.4) + (avgMood * 0.35) + (avgNutritionNum * 0.25);

            // Fetch actual count from the counts object we retrieved
            const studentCount = activeTab === 'hostel'
              ? (counts.hostels[group.name] || 0)
              : (counts.branches[group.name] || 0);

            return {
              id: `${activeTab}-${group.name}`,
              name: group.name,
              shortName: group.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3),
              emoji: activeTab === 'hostel' ? '🏠' : '🎓',
              avgActiveMins,
              avgMentalScore: avgMood,
              avgNutrition: nutritionGrade(avgNutritionNum),
              nutritionNum: avgNutritionNum,
              trend: computeTrend(),
              studentCount,
              _score: score,
            };
          })
          .sort((a, b) => b._score - a._score)
          .map((item, idx) => ({ ...item, rank: idx + 1 }));

        setData(transformed);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [activeTab, user?.college, activeTab]);

  const tabLabel = activeTab === "hostel" ? "Hostel Showdown 🏠" : "Branch Clash 🎓";

  const renderItem = ({ item }) => (
    <RowCard item={item} isCurrentUserGroup={item.rank === 1} />
  );

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  const ListHeader = () => (
    <View>
      {/* ── Screen header ── */}
      <LinearGradient
        colors={[COLORS.background, COLORS.background]}
        style={s.header}
      >
        {navigation && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            activeOpacity={0.7}
          >
            <Text style={s.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
        )}

        <View style={s.titleRow}>
          <Text style={s.screenTitle}>Campus Pulse</Text>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={s.screenSubtitle}>Who's crushing it on campus? 🔥</Text>
      </LinearGradient>

      {/* ── Tab Switcher ── */}
      <View style={s.tabRow}>
        <TabButton
          label="Hostel Showdown"
          icon="🏠"
          active={activeTab === "hostel"}
          onPress={() => setActiveTab("hostel")}
        />
        <TabButton
          label="Branch Clash"
          icon="🎓"
          active={activeTab === "branch"}
          onPress={() => setActiveTab("branch")}
        />
      </View>

      {/* ── Section label ── */}
      <Text style={s.sectionLabel}>{tabLabel}</Text>

      {/* ── Podium (Top 3) ── */}
      <Podium data={data} />

      {/* ── Legend / methodology note ── */}
      <Legend />

      {/* ── "The Rest" header ── */}
      <View style={s.restHeader}>
        <Text style={s.restTitle}>Full Rankings</Text>
        <Text style={s.restCount}>{data.length} groups</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 120,
  },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    marginBottom: SPACING.md,
    alignSelf: "flex-start",
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    ...FONTS.semiBold,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  screenTitle: {
    fontSize: 32,
    ...FONTS.extraBold,
    color: COLORS.text,
    letterSpacing: -1,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success + "22",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: 9,
    ...FONTS.extraBold,
    color: COLORS.success,
    letterSpacing: 0.8,
  },
  screenSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    ...FONTS.medium,
  },

  // ── Tabs ──
  tabRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: SPACING.xs,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary + "18",
    borderColor: COLORS.primary,
  },
  tabBtnIcon: {
    fontSize: 16,
  },
  tabBtnText: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },

  // ── Podium ──
  podiumWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    height: 250,
    gap: SPACING.sm,
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  podiumAvatar: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
    ...SHADOWS.glow,
  },
  podiumMedalIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  podiumName: {
    fontSize: FONT_SIZES.xs,
    ...FONTS.bold,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 14,
  },
  podiumScore: {
    fontSize: 9,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginBottom: SPACING.xs,
  },
  podiumPlatform: {
    width: "100%",
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: SPACING.sm,
  },
  podiumRankNum: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.extraBold,
  },

  // ── Legend ──
  legendBox: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  legendTitle: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  legendBody: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  legendBold: {
    ...FONTS.bold,
    color: COLORS.primary,
  },
  legendRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    fontSize: 12,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },

  // ── Rest header ──
  restHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  restTitle: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text,
  },
  restCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },

  // ── Row card ──
  rowCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.small,
  },
  rowCardHighlight: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "08",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.sm,
    ...FONTS.extraBold,
  },
  rankBadgePlain: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  rankBadgePlainText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
  },
  trend: {
    fontSize: 12,
    ...FONTS.bold,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rowEmoji: {
    fontSize: 22,
  },
  rowNameBlock: {
    flex: 1,
  },
  rowName: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
  },
  rowMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginTop: 1,
  },
  rowMetrics: {
    flexDirection: "row",
    gap: SPACING.xs,
  },

  // ── Metric Pill ──
  metricPill: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  metricIcon: {
    fontSize: 13,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: FONT_SIZES.md,
    ...FONTS.extraBold,
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginTop: 1,
    textAlign: "center",
  },
  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    ...FONTS.medium,
    color: COLORS.textSecondary,
  },
});
