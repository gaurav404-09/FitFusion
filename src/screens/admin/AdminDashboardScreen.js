// Admin Dashboard — All data sourced from Supabase RPCs (no hardcoded values)
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS } from "../../theme";
import {
  Header,
  GradientCard,
  SectionHeader,
  StatCard,
  Avatar,
  AnimatedButton,
  ProgressBar,
  StyledInput,
} from "../../components/common";
import { useAuth } from "../../services/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../services/database";
import AICampusAlerts from "../../components/AICampusAlerts";

export default function AdminDashboardScreen({ navigation }) {
  const { user, isAdmin, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [envTemp, setEnvTemp] = useState("");
  const [envAqi, setEnvAqi] = useState("");
  const [envHumidity, setEnvHumidity] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Fetch users via the admin RPC (bypasses RLS)
      const adminUsers = await db.getAdminUsers();
      setUsers(adminUsers);

      // Load real analytics via RPCs
      const { data: campusOverview, error: errOverview } = await db.supabase.rpc('get_campus_overview');
      const { data: weeklyTrends, error: errTrends } = await db.supabase.rpc('get_weekly_trends');

      if (errOverview) console.error('Campus overview error:', errOverview);
      if (errTrends) console.error('Weekly trends error:', errTrends);

      setAnalytics({
        collegeStats: campusOverview || [],
        weeklyTrends: weeklyTrends || [],
      });
    } catch (error) {
      console.error('Admin dashboard load error:', error);
      setAnalytics({ collegeStats: [], weeklyTrends: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // ── Derived stats from get_campus_overview (real DB aggregates) ──
  const campusStats = useMemo(() => {
    const stats = analytics?.collegeStats || [];
    const totalUsers = stats.reduce((sum, r) => sum + (Number(r.total_users) || 0), 0);
    const totalActivities = stats.reduce((sum, r) => sum + (Number(r.total_activities) || 0), 0);
    const totalFoodLogs = stats.reduce((sum, r) => sum + (Number(r.total_food_logs) || 0), 0);
    const totalMoodLogs = stats.reduce((sum, r) => sum + (Number(r.total_mood_logs) || 0), 0);
    return { totalUsers, totalActivities, totalFoodLogs, totalMoodLogs };
  }, [analytics]);

  // ── Campus signals derived from real data ──
  const campusSignals = useMemo(() => {
    const stats = analytics?.collegeStats || [];
    if (stats.length === 0) return [];

    const signals = [];

    // Signal 1: College with lowest average mood
    const withMood = stats.filter((s) => s.avg_mood_per_user != null && Number(s.avg_mood_per_user) > 0);
    if (withMood.length > 0) {
      const lowest = withMood.reduce((min, s) =>
        Number(s.avg_mood_per_user) < Number(min.avg_mood_per_user) ? s : min
      );
      const moodVal = Number(lowest.avg_mood_per_user);
      signals.push({
        title: `${lowest.college} — Low Mood Alert`,
        progress: Math.round(((5 - moodVal) / 5) * 100), // invert: lower mood = higher bar
        color: moodVal < 2.5 ? COLORS.error : COLORS.warning,
        subtitle: `Average mood score is ${moodVal.toFixed(1)}/5 — consider wellness interventions.`,
      });
    }

    // Signal 2: College with lowest avg nutrition (calories)
    const withCalories = stats.filter((s) => s.avg_calories_per_user != null && Number(s.avg_calories_per_user) > 0);
    if (withCalories.length > 0) {
      const lowest = withCalories.reduce((min, s) =>
        Number(s.avg_calories_per_user) < Number(min.avg_calories_per_user) ? s : min
      );
      const cal = Math.round(Number(lowest.avg_calories_per_user));
      signals.push({
        title: `${lowest.college} — Nutrition Warning`,
        progress: Math.min(Math.round((cal / 2000) * 100), 100),
        color: cal < 1500 ? COLORS.error : COLORS.accent,
        subtitle: `Average calorie intake is ${cal} kcal/day — may be below recommended levels.`,
      });
    }

    // Signal 3: College with highest activity load
    const withActivity = stats.filter((s) => s.avg_duration_per_user != null && Number(s.avg_duration_per_user) > 0);
    if (withActivity.length > 0) {
      const highest = withActivity.reduce((max, s) =>
        Number(s.avg_duration_per_user) > Number(max.avg_duration_per_user) ? s : max
      );
      const dur = Math.round(Number(highest.avg_duration_per_user));
      signals.push({
        title: `${highest.college} — High Activity`,
        progress: Math.min(Math.round((dur / 120) * 100), 100),
        color: COLORS.primary,
        subtitle: `Avg ${dur} min/day — ensure facility capacity can handle peak usage.`,
      });
    }

    return signals;
  }, [analytics]);

  // ── Hostel participation rates from real data ──
  const hostelParticipation = useMemo(() => {
    const stats = analytics?.collegeStats || [];
    return stats.map((s) => {
      const totalUsers = Number(s.total_users) || 0;
      const totalActivities = Number(s.total_activities) || 0;
      // Participation = users with at least 1 activity / total users
      // Approximation: (totalActivities / totalUsers) capped at 100
      const rate = totalUsers > 0 ? Math.min(Math.round((totalActivities / totalUsers) * 100), 100) : 0;
      return {
        college: String(s.college || "Unknown"),
        participationRate: rate,
      };
    });
  }, [analytics]);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Access Denied" onBack={() => navigation.goBack()} />
        <View style={styles.denied}>
          <Text style={styles.deniedEmoji}>🔒</Text>
          <Text style={styles.deniedText}>Admin access required</Text>
        </View>
      </View>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  async function handleAddEnvData() {
    if (!envTemp && !envAqi) {
      Alert.alert("Error", "Please enter at least temperature or AQI");
      return;
    }
    try {
      const { format } = require("date-fns");
      await db.addEnvData({
        date: format(new Date(), "yyyy-MM-dd"),
        temperature: parseInt(envTemp) || 30,
        aqi: parseInt(envAqi) || 80,
        humidity: parseInt(envHumidity) || 50,
        noiseLevel: 55,
        crowdDensity: 45,
        rainfall: 0,
        windSpeed: 10,
        uvIndex: 5,
      });
      Alert.alert("Success!", "Environmental data added");
      setEnvTemp("");
      setEnvAqi("");
      setEnvHumidity("");
    } catch (e) {
      Alert.alert("Error", "Failed to add data");
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <View style={styles.container}>
      <Header
        title="Admin Dashboard"
        subtitle="Campus Overview"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : null}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                "Logout",
                "Are you sure you want to logout from Admin?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                      await logout();
                    },
                  },
                ]
              );
            }}
            style={styles.logoutButton}
          >
            <Ionicons name="power" size={24} color={COLORS.error} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Admin welcome */}
        <GradientCard
          gradient={COLORS.gradientSunset}
          style={styles.welcomeCard}
        >
          <Text style={styles.welcomeEmoji}>🛡️</Text>
          <Text style={styles.welcomeTitle}>Welcome, {user?.name}</Text>
          <Text style={styles.welcomeText}>
            You have full admin access to FitFusion
          </Text>
        </GradientCard>

        {/* AI Campus Alerts */}
        <AICampusAlerts analytics={analytics} />

        {/* Campus Stats — all from get_campus_overview aggregates */}
        <SectionHeader title="Campus Overview" />
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={campusStats.totalUsers}
                icon="👥"
                color={COLORS.primary}
              />
              <StatCard
                title="Activities"
                value={campusStats.totalActivities}
                icon="🏃"
                color={COLORS.accent}
              />
            </View>
            <View style={[styles.statsGrid, { marginTop: SPACING.md }]}>
              <StatCard
                title="Food Logs"
                value={campusStats.totalFoodLogs}
                icon="🍽️"
                color={COLORS.coral}
              />
              <StatCard
                title="Mood Logs"
                value={campusStats.totalMoodLogs}
                icon="😊"
                color={COLORS.violet}
              />
            </View>
          </>
        )}

        {/* User Management */}
        <SectionHeader title="User Management" />
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {filteredUsers.length === 0 && !loading && (
          <View style={styles.emptyUsers}>
            <Text style={styles.emptyUsersText}>
              No users found. Run the admin_list_users migration in Supabase SQL Editor.
            </Text>
          </View>
        )}
        {filteredUsers.map((u, i) => (
          <View key={u.id || i} style={styles.userCard}>
            <Avatar
              name={u.name}
              color={u.avatarColor || u.avatar_color || COLORS.primary}
              size={40}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name}</Text>
              <Text style={styles.userMeta}>
                {u.email} · {u.college || u.hostel} · {u.year}
              </Text>
            </View>
            <View
              style={[
                styles.levelBadge,
                {
                  backgroundColor:
                    (u.activityLevel || u.activity_level || "moderate") === "moderate"
                      ? COLORS.primary + "22"
                      : COLORS.accent + "22",
                },
              ]}
            >
              <Text
                style={[
                  styles.levelText,
                  {
                    color:
                      (u.activityLevel || u.activity_level || "moderate") === "moderate"
                        ? COLORS.primary
                        : COLORS.accent,
                  },
                ]}
              >
                {u.activityLevel || u.activity_level || "—"}
              </Text>
            </View>
          </View>
        ))}

        {/* Critical Campus Signals — derived from real analytics */}
        <SectionHeader title="Critical Campus Signals" />
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : campusSignals.length === 0 ? (
          <View style={styles.participationCard}>
            <Text style={styles.signalSubtitle}>
              No campus signals yet — data will appear as users log activities, food, and mood.
            </Text>
          </View>
        ) : (
          campusSignals.map((signal, i) => (
            <View key={i} style={[styles.participationCard, i > 0 && { marginTop: SPACING.md }]}>
              <Text style={styles.signalTitle}>{signal.title}</Text>
              <ProgressBar
                progress={signal.progress}
                color={signal.color}
                style={{ marginTop: SPACING.sm }}
              />
              <Text style={styles.signalSubtitle}>{signal.subtitle}</Text>
            </View>
          ))
        )}

        {/* Add Environmental Data */}
        <SectionHeader title="Add Environmental Data" />
        <View style={styles.envForm}>
          <StyledInput
            label="Temperature (°C)"
            value={envTemp}
            onChangeText={setEnvTemp}
            keyboardType="numeric"
            placeholder="30"
          />
          <StyledInput
            label="AQI"
            value={envAqi}
            onChangeText={setEnvAqi}
            keyboardType="numeric"
            placeholder="80"
          />
          <StyledInput
            label="Humidity (%)"
            value={envHumidity}
            onChangeText={setEnvHumidity}
            keyboardType="numeric"
            placeholder="50"
          />
          <AnimatedButton
            title="Add Environment Data"
            onPress={handleAddEnvData}
            gradient={COLORS.gradientAccent}
          />
        </View>

        {/* Campus Participation — computed from real data */}
        <SectionHeader title="College Participation Rates" />
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : hostelParticipation.length === 0 ? (
          <View style={styles.participationCard}>
            <Text style={styles.signalSubtitle}>
              No participation data yet.
            </Text>
          </View>
        ) : (
          <View style={styles.participationCard}>
            {hostelParticipation.map((h, i) => (
              <View key={i} style={styles.participationRow}>
                <Text style={styles.participationLabel} numberOfLines={1}>
                  {h.college}
                </Text>
                <ProgressBar
                  progress={h.participationRate}
                  color={COLORS.chartColors[i % COLORS.chartColors.length]}
                  style={{ flex: 1, marginHorizontal: SPACING.md }}
                />
                <Text style={styles.participationValue}>
                  {h.participationRate}%
                </Text>
              </View>
            ))}
          </View>
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
  logoutButton: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  denied: { flex: 1, alignItems: "center", justifyContent: "center" },
  deniedEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  deniedText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.lg },
  welcomeCard: {
    marginHorizontal: SPACING.lg,
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  welcomeEmoji: { fontSize: 40, marginBottom: SPACING.md },
  welcomeTitle: { color: COLORS.text, fontSize: FONT_SIZES.xxl, ...FONTS.bold },
  welcomeText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    opacity: 0.8,
    marginTop: SPACING.xs,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  searchIcon: { fontSize: 16, marginRight: SPACING.sm },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.md,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  userInfo: { flex: 1, marginLeft: SPACING.md },
  userName: { color: COLORS.text, fontSize: FONT_SIZES.md, ...FONTS.medium },
  userMeta: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  levelBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  levelText: { fontSize: FONT_SIZES.xs, ...FONTS.medium },
  envForm: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  participationCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  participationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  participationLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    minWidth: 70,
    maxWidth: 100,
  },
  participationValue: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    minWidth: 35,
  },
  signalTitle: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.text,
  },
  signalSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    marginTop: SPACING.sm,
  },
  emptyUsers: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyUsersText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    textAlign: "center",
  },
});
