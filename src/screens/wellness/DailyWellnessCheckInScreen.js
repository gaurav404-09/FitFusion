// Daily Wellness Check-in - Premium Redesigned UI with Wow Factor
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ToastAndroid,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONTS,
  BORDER_RADIUS,
  SHADOWS,
} from "../../theme";
import db from "../../services/database";
import sensorService from "../../services/SensorService";
import {
  Header,
  SectionHeader,
  StyledInput,
  Chip,
  AnimatedButton,
  GradientCard,
} from "../../components/common";
import { useAuth } from "../../services/AuthContext";
import SyncService from "../../services/SyncService";

function coerceNumber(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function formatHours(n) {
  const v = coerceNumber(n, 0);
  return Number.isFinite(v) ? v.toFixed(1) : "0.0";
}

// Premium Auto Tag Component
function AutoTag({ label, isAuto }) {
  return (
    <View style={[styles.autoTag, { backgroundColor: isAuto ? COLORS.successSubtle : COLORS.surfaceElevated }]}>
      <View style={[styles.autoDot, { backgroundColor: isAuto ? COLORS.success : COLORS.textMuted }]} />
      <Text style={[styles.autoTagText, { color: isAuto ? COLORS.success : COLORS.textMuted }]}>
        {isAuto ? 'Auto' : 'Manual'}
      </Text>
    </View>
  );
}

// Premium Metric Card with stunning gradient border
function MetricCard({ title, subtitle, isAuto, children, icon }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={styles.metricTitleRow}>
          {icon && (
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.metricIconGradient}>
              <Text style={styles.metricIcon}>{icon}</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.metricTitle}>{title}</Text>
            {!!subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {isAuto !== undefined && <AutoTag label="" isAuto={isAuto} />}
      </View>
      <View style={styles.metricContent}>
        {children}
      </View>
    </View>
  );
}

// Premium Slider for productivity with gradient
function PremiumSlider({ value, onValueChange, min = 0, max = 100, step = 5, color = COLORS.primary }) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderContainer}>
      <TouchableOpacity
        style={styles.sliderBtn}
        onPress={() => onValueChange(Math.max(min, value - step))}
      >
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.sliderBtnGradient}>
          <Text style={styles.sliderBtnText}>−</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.sliderTrack}>
        <LinearGradient
          colors={[color, color + '80']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sliderFill, { width: `${percentage}%` }]}
        />
        <View style={[styles.sliderThumb, { left: `${percentage}%`, backgroundColor: color }]} />
      </View>

      <TouchableOpacity
        style={styles.sliderBtn}
        onPress={() => onValueChange(Math.min(max, value + step))}
      >
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.sliderBtnGradient}>
          <Text style={styles.sliderBtnText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Premium Emoji Selector for mood/quality
function EmojiSelector({ value, onValueChange, options, color = COLORS.primary }) {
  return (
    <View style={styles.emojiSelector}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.emojiOption,
            value === opt.value && {
              backgroundColor: color + '15',
              borderColor: color,
            }
          ]}
          onPress={() => onValueChange(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={styles.emojiText}>{opt.emoji}</Text>
          <Text style={[
            styles.emojiLabel,
            value === opt.value && { color }
          ]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Number Circle Selector for stress - Premium
function NumberCircleSelector({ value, onValueChange, min = 1, max = 10, color = COLORS.accent }) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View style={styles.numberCircleContainer}>
      {numbers.map((num) => (
        <TouchableOpacity
          key={num}
          style={[
            styles.numberCircle,
            value === num && {
              backgroundColor: color,
              transform: [{ scale: 1.15 }],
            },
          ]}
          onPress={() => onValueChange(num)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.numberCircleText,
            value === num && { color: COLORS.textInverse },
          ]}>
            {num}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DailyWellnessCheckInScreen({ navigation }) {
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [profile, setProfile] = useState({ occupation: null, workMode: null });
  const [permissions, setPermissions] = useState({
    healthConnect: false,
    usageStats: false,
  });
  const [sources, setSources] = useState({
    steps: "manual",
    exerciseMins: "manual",
    walkedKm: "manual",
    sleepHrs: "manual",
  });

  // Dev mode bypass refs
  const headerPressTimer = useRef(null);
  const handleHeaderLongPress = () => {
    if (Platform.OS === "android") {
      ToastAndroid.show("Dev Mode: Check-in Unlocked", ToastAndroid.SHORT);
    }
    AsyncStorage.removeItem("@last_logged_date");
    AsyncStorage.removeItem("@last_checkin_date");
    setLocked(false);
  };

  const [form, setForm] = useState({
    steps: "",
    exerciseMins: "",
    walkedKm: "",
    sleepHrs: "",
    socialHrs: "",
    sleepQuality: 3,
    stressLevel: 5,
    productivity: 50,
    workScreenHrs: "",
    leisureScreenHrs: "",
    screenTimeHrs: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const last =
          (await AsyncStorage.getItem("@last_logged_date")) ||
          (await AsyncStorage.getItem("@last_checkin_date"));
        if (!mounted) return;
        setLocked(last === today);

        const profileRaw = await AsyncStorage.getItem("@wellness_profile");
        if (!mounted) return;
        if (profileRaw) {
          const p = JSON.parse(profileRaw);
          setProfile({
            occupation: p?.occupation || null,
            workMode: p?.workMode || null,
          });
        }

        const passive = await sensorService.fetchDailyMetrics();
        if (!mounted) return;
        setPermissions(passive.permissions);
        setSources(
          passive.sources || {
            steps: "manual",
            exerciseMins: "manual",
            walkedKm: "manual",
            sleepHrs: "manual",
          },
        );

        setForm((prev) => {
          const steps = coerceNumber(passive.data.steps, 0);
          const walkedKm = coerceNumber(passive.data.walkedKm, 0);
          const exerciseMins = coerceNumber(passive.data.exerciseMins, 0);
          const sleepHrs = coerceNumber(passive.data.sleepHrs, 0);
          const screenTimeHrs = coerceNumber(passive.data.screenTimeHrs, 0);
          const workScreenHrs = coerceNumber(passive.data.workScreenHrs, 0);
          const leisureScreenHrs = coerceNumber(
            passive.data.leisureScreenHrs,
            0,
          );

          return {
            ...prev,
            steps: steps > 0 ? String(steps) : prev.steps,
            exerciseMins:
              exerciseMins > 0 ? String(exerciseMins) : prev.exerciseMins,
            walkedKm: walkedKm > 0 ? String(walkedKm) : prev.walkedKm,
            sleepHrs: sleepHrs > 0 ? String(sleepHrs) : prev.sleepHrs,
            screenTimeHrs,
            workScreenHrs: passive.permissions.usageStats
              ? String(workScreenHrs)
              : prev.workScreenHrs,
            leisureScreenHrs: passive.permissions.usageStats
              ? String(leisureScreenHrs)
              : prev.leisureScreenHrs,
          };
        });
      } catch (e) {
        setPermissions({ healthConnect: false, usageStats: false });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [today]);

  const computedScreenTime = useMemo(() => {
    if (permissions.usageStats) return coerceNumber(form.screenTimeHrs, 0);
    const w = coerceNumber(form.workScreenHrs, 0);
    const l = coerceNumber(form.leisureScreenHrs, 0);
    return w + l;
  }, [
    form.leisureScreenHrs,
    form.screenTimeHrs,
    form.workScreenHrs,
    permissions.usageStats,
  ]);

  const canSubmit = useMemo(() => {
    if (locked) return false;
    const ex = clamp(coerceNumber(form.exerciseMins, 0), 0, 10000);
    const wk = clamp(coerceNumber(form.walkedKm, 0), 0, 200);
    const sl = clamp(coerceNumber(form.sleepHrs, 0), 0, 24);
    const sc = clamp(coerceNumber(form.socialHrs, 0), 0, 24);
    const ws = clamp(coerceNumber(form.workScreenHrs, 0), 0, 24);
    const ls = clamp(coerceNumber(form.leisureScreenHrs, 0), 0, 24);
    const sq = clamp(coerceNumber(form.sleepQuality, 3), 1, 5);
    const st = clamp(coerceNumber(form.stressLevel, 5), 1, 10);
    const pr = clamp(coerceNumber(form.productivity, 50), 0, 100);

    if (!permissions.usageStats && ws + ls > 24) return false;
    if (ex < 0 || wk < 0 || sl < 0 || sc < 0) return false;
    if (sq < 1 || sq > 5) return false;
    if (st < 1 || st > 10) return false;
    if (pr < 0 || pr > 100) return false;
    return true;
  }, [
    form.exerciseMins,
    form.leisureScreenHrs,
    form.productivity,
    form.sleepHrs,
    form.sleepQuality,
    form.socialHrs,
    form.stressLevel,
    form.walkedKm,
    form.workScreenHrs,
    locked,
    permissions.usageStats,
  ]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const last =
        (await AsyncStorage.getItem("@last_logged_date")) ||
        (await AsyncStorage.getItem("@last_checkin_date"));
      if (last === today) {
        setLocked(true);
        setSubmitting(false);
        return;
      }

      const log = {
        date: today,
        timestamp: new Date().toISOString(),
        userId: user?.id || null,
        occupation: profile.occupation,
        workMode: profile.workMode,
        steps: clamp(coerceNumber(form.steps, 0), 0, 300000),
        exerciseMins: clamp(coerceNumber(form.exerciseMins, 0), 0, 10000),
        walkedKm: clamp(coerceNumber(form.walkedKm, 0), 0, 200),
        sleepHrs: clamp(coerceNumber(form.sleepHrs, 0), 0, 24),
        screenTimeHrs: clamp(coerceNumber(computedScreenTime, 0), 0, 24),
        socialHrs: clamp(coerceNumber(form.socialHrs, 0), 0, 24),
        workScreenHrs: clamp(coerceNumber(form.workScreenHrs, 0), 0, 24),
        leisureScreenHrs: clamp(coerceNumber(form.leisureScreenHrs, 0), 0, 24),
        sleepQuality: clamp(coerceNumber(form.sleepQuality, 3), 1, 5),
        stressLevel: clamp(coerceNumber(form.stressLevel, 5), 1, 10),
        productivity: clamp(coerceNumber(form.productivity, 50), 0, 100),
        sources: {
          ...sources,
          usageStats: permissions.usageStats,
        },
      };

      await SyncService.submitWellnessCheckin(log, user?.id);
      await AsyncStorage.setItem("@last_logged_date", today);
      await AsyncStorage.setItem("@last_checkin_date", today);
      setLocked(true);
      navigation.navigate("WellnessMain");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color={COLORS.textInverse} />
        </LinearGradient>
        <Text style={styles.loadingText}>Loading your wellness data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAFBFC', '#F3F4F6', '#F9FAFB']}
        style={StyleSheet.absoluteFill}
      />
      <Header
        title="Daily Check-in"
        subtitle={format(new Date(), "EEEE, MMMM d")}
        onBack={() => navigation.goBack()}
        onLongPress={handleHeaderLongPress}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* PREMIUM HEADER CARD - Stunning Gradient! */}
          <GradientCard
            gradient={COLORS.gradientHero}
            style={styles.headerCard}
          >
            <View style={styles.headerCardContent}>
              <View style={styles.headerCardLeft}>
                <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']} style={styles.headerEmojiGradient}>
                  <Text style={styles.headerEmoji}>🧠</Text>
                </LinearGradient>
              </View>
              <View style={styles.headerCardRight}>
                <Text style={styles.headerTitle}>Train Your AI</Text>
                <Text style={styles.headerSubtitle}>
                  Log daily to help predict your wellness
                </Text>
              </View>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStat}>
                <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={styles.headerStatGradient}>
                  <Text style={styles.headerStatValue}>+10</Text>
                  <Text style={styles.headerStatLabel}>Points</Text>
                </LinearGradient>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStat}>
                <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={styles.headerStatGradient}>
                  <Text style={styles.headerStatValue}>100%</Text>
                  <Text style={styles.headerStatLabel}>Private</Text>
                </LinearGradient>
              </View>
            </View>
          </GradientCard>

          {/* Profile Tags */}
          {profile.occupation || profile.workMode ? (
            <View style={styles.profileRow}>
              {profile.occupation ? (
                <View style={styles.profileTag}>
                  <LinearGradient colors={COLORS.gradientPrimary} style={styles.profileTagGradient}>
                    <Text style={styles.profileTagText}>{profile.occupation}</Text>
                  </LinearGradient>
                </View>
              ) : null}
              {profile.workMode ? (
                <View style={[styles.profileTag, styles.profileTagSecondary]}>
                  <LinearGradient colors={COLORS.gradientViolet} style={styles.profileTagGradient}>
                    <Text style={[styles.profileTagText, styles.profileTagTextSecondary]}>{profile.workMode}</Text>
                  </LinearGradient>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Community", { screen: "Settings" })
                }
              >
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.profilePrompt}
              onPress={() =>
                navigation.navigate("Community", { screen: "Settings" })
              }
            >
              <LinearGradient colors={COLORS.gradientPrimary} style={styles.profilePromptIcon}>
                <Ionicons name="person-circle-outline" size={20} color={COLORS.textInverse} />
              </LinearGradient>
              <Text style={styles.profilePromptText}>
                Set your profile for personalized insights
              </Text>
            </TouchableOpacity>
          )}

          {/* Already Submitted State - Premium */}
          {locked ? (
            <GradientCard
              gradient={COLORS.gradientSuccess}
              style={styles.lockedCard}
            >
              <View style={styles.lockedContent}>
                <View style={styles.lockedEmojiWrap}>
                  <Text style={styles.lockedEmoji}>✅</Text>
                </View>
                <View style={styles.lockedTextContainer}>
                  <Text style={styles.lockedTitle}>
                    You're all set for today!
                  </Text>
                  <Text style={styles.lockedSubtitle}>
                    Come back tomorrow for your next check-in
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.lockedButton}
                onPress={() => navigation.navigate("WellnessMain")}
              >
                <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']} style={styles.lockedButtonGradient}>
                  <Text style={styles.lockedButtonText}>View Today's Insights</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GradientCard>
          ) : null}

          {/* Activity Metrics Section - Premium Header */}
          <SectionHeader title="📱 Activity & Movement" />

          <MetricCard
            title="Steps"
            subtitle={sources.steps === "sensor" ? "Tracked via sensor" : "Enter your steps"}
            isAuto={sources.steps !== "manual"}
            icon="👟"
          >
            {sources.steps === "manual" ? (
              <StyledInput
                value={form.steps}
                onChangeText={(t) =>
                  setForm((prev) => ({
                    ...prev,
                    steps: t.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="0"
                keyboardType="number-pad"
              />
            ) : (
              <View style={styles.autoValueDisplay}>
                <LinearGradient colors={COLORS.gradientPrimary} style={styles.autoValueGradient}>
                  <Text style={styles.autoValueText}>
                    {coerceNumber(form.steps, 0).toLocaleString()} steps
                  </Text>
                </LinearGradient>
              </View>
            )}
          </MetricCard>

          <MetricCard
            title="Exercise"
            subtitle={sources.exerciseMins === "sensor" ? "From device" : "Manual entry"}
            isAuto={sources.exerciseMins !== "manual"}
            icon="💪"
          >
            {sources.exerciseMins !== "manual" ? (
              <View style={styles.autoValueDisplay}>
                <LinearGradient colors={COLORS.gradientSuccess} style={styles.autoValueGradient}>
                  <Text style={styles.autoValueText}>
                    {coerceNumber(form.exerciseMins, 0)} minutes
                  </Text>
                </LinearGradient>
              </View>
            ) : (
              <StyledInput
                value={form.exerciseMins}
                onChangeText={(t) =>
                  setForm((prev) => ({
                    ...prev,
                    exerciseMins: t.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="0"
                keyboardType="number-pad"
              />
            )}
          </MetricCard>

          <MetricCard
            title="Distance Walked"
            subtitle={sources.walkedKm === "sensor" ? "Auto-tracked" : "Manual entry"}
            isAuto={sources.walkedKm !== "manual"}
            icon="📍"
          >
            {sources.walkedKm !== "manual" ? (
              <View style={styles.autoValueDisplay}>
                <LinearGradient colors={COLORS.gradientCalm} style={styles.autoValueGradient}>
                  <Text style={styles.autoValueText}>
                    {coerceNumber(form.walkedKm, 0)} km
                  </Text>
                </LinearGradient>
              </View>
            ) : (
              <StyledInput
                value={form.walkedKm}
                onChangeText={(t) =>
                  setForm((prev) => ({
                    ...prev,
                    walkedKm: t.replace(/[^0-9.]/g, ""),
                  }))
                }
                placeholder="0.0"
                keyboardType="decimal-pad"
              />
            )}
          </MetricCard>

          {/* Sleep Section */}
          <SectionHeader title="😴 Sleep" />

          <MetricCard
            title="Hours of Sleep"
            subtitle="Total sleep duration"
            icon="🌙"
          >
            <StyledInput
              value={form.sleepHrs}
              onChangeText={(t) =>
                setForm((prev) => ({
                  ...prev,
                  sleepHrs: t.replace(/[^0-9.]/g, ""),
                }))
              }
              placeholder="0.0"
              keyboardType="decimal-pad"
            />
          </MetricCard>

          <MetricCard
            title="Sleep Quality"
            subtitle="How restful was your sleep?"
            icon="⭐"
          >
            <EmojiSelector
              value={form.sleepQuality}
              onValueChange={(v) => setForm((prev) => ({ ...prev, sleepQuality: v }))}
              options={[
                { value: 1, emoji: '😫', label: 'Terrible' },
                { value: 2, emoji: '😔', label: 'Poor' },
                { value: 3, emoji: '😐', label: 'Okay' },
                { value: 4, emoji: '🙂', label: 'Good' },
                { value: 5, emoji: '😄', label: 'Great' },
              ]}
              color={COLORS.primary}
            />
          </MetricCard>

          {/* Screen Time Section */}
          <SectionHeader title="📱 Screen Time" />

          <MetricCard
            title="Screen Time"
            subtitle={
              permissions.usageStats
                ? `Total: ${formatHours(form.screenTimeHrs)}h`
                : "Manual entry"
            }
            isAuto={permissions.usageStats}
            icon="📱"
          >
            {permissions.usageStats ? (
              <View style={styles.screenTimeGrid}>
                <View style={styles.screenTimeItem}>
                  <LinearGradient colors={COLORS.gradientPrimary} style={styles.screenTimeItemGradient}>
                    <Text style={styles.screenTimeLabel}>Work</Text>
                  </LinearGradient>
                  <Text style={styles.screenTimeValue}>{formatHours(form.workScreenHrs)}h</Text>
                </View>
                <View style={styles.screenTimeItem}>
                  <LinearGradient colors={COLORS.gradientViolet} style={styles.screenTimeItemGradient}>
                    <Text style={styles.screenTimeLabel}>Leisure</Text>
                  </LinearGradient>
                  <Text style={styles.screenTimeValue}>{formatHours(form.leisureScreenHrs)}h</Text>
                </View>
                <View style={[styles.screenTimeItem, styles.screenTimeTotal]}>
                  <LinearGradient colors={COLORS.gradientSuccess} style={styles.screenTimeItemGradient}>
                    <Text style={styles.screenTimeLabel}>Total</Text>
                  </LinearGradient>
                  <Text style={[styles.screenTimeValue, { color: COLORS.primary }]}>
                    {formatHours(form.screenTimeHrs)}h
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.screenTimeManual}>
                <View style={styles.screenTimeInput}>
                  <Text style={styles.screenTimeInputLabel}>Work (hrs)</Text>
                  <StyledInput
                    value={form.workScreenHrs}
                    onChangeText={(t) =>
                      setForm((prev) => ({
                        ...prev,
                        workScreenHrs: t.replace(/[^0-9.]/g, ""),
                      }))
                    }
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.screenTimeInput}>
                  <Text style={styles.screenTimeInputLabel}>Leisure (hrs)</Text>
                  <StyledInput
                    value={form.leisureScreenHrs}
                    onChangeText={(t) =>
                      setForm((prev) => ({
                        ...prev,
                        leisureScreenHrs: t.replace(/[^0-9.]/g, ""),
                      }))
                    }
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
          </MetricCard>

          {/* Social Section */}
          <SectionHeader title="👥 Social" />

          <MetricCard
            title="Social Hours"
            subtitle="Time spent with friends/family"
            icon="🤝"
          >
            <StyledInput
              value={form.socialHrs}
              onChangeText={(t) =>
                setForm((prev) => ({
                  ...prev,
                  socialHrs: t.replace(/[^0-9.]/g, ""),
                }))
              }
              placeholder="0.0"
              keyboardType="decimal-pad"
            />
          </MetricCard>

          {/* Feelings Section */}
          <SectionHeader title="💭 How You Feel" />

          <MetricCard
            title="Stress Level"
            subtitle="How stressed did you feel?"
            icon="🔥"
          >
            <View style={styles.stressLabels}>
              <Text style={styles.stressLabelLow}>Relaxed</Text>
              <Text style={styles.stressLabelHigh}>Stressed</Text>
            </View>
            <NumberCircleSelector
              value={form.stressLevel}
              onValueChange={(v) => setForm((prev) => ({ ...prev, stressLevel: v }))}
              min={1}
              max={10}
              color={form.stressLevel > 6 ? COLORS.error : form.stressLevel > 3 ? COLORS.warning : COLORS.success}
            />
            <View style={styles.stressValueDisplay}>
              <Text style={styles.stressValueText}>Current: <Text style={styles.stressValue}>{form.stressLevel}/10</Text></Text>
            </View>
          </MetricCard>

          <MetricCard
            title="Productivity"
            subtitle="How productive was your day?"
            icon="⚡"
          >
            <View style={styles.productivityDisplay}>
              <Text style={styles.productivityValue}>{form.productivity}</Text>
              <Text style={styles.productivityMax}>/ 100</Text>
            </View>
            <PremiumSlider
              value={form.productivity}
              onValueChange={(v) => setForm((prev) => ({ ...prev, productivity: v }))}
              min={0}
              max={100}
              step={5}
              color={COLORS.primary}
            />
          </MetricCard>

          {/* Submit Button - Premium */}
          <AnimatedButton
            title={
              locked
                ? "✓ Already Submitted"
                : submitting
                  ? "Submitting..."
                  : "Complete Check-in"
            }
            onPress={submit}
            disabled={!canSubmit || submitting}
            style={styles.submitButton}
            icon={locked ? "✓" : "✨"}
            variant="primary"
          />

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  loadingGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },

  // Header Card - STUNNING PREMIUM!
  headerCard: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  headerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCardLeft: {
    marginRight: SPACING.md,
  },
  headerEmojiGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerCardRight: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textInverse,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.85,
    marginTop: 2,
  },
  headerStats: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatGradient: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textInverse,
  },
  headerStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    opacity: 0.8,
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Profile Row
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  profileTag: {
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
  },
  profileTagGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  profileTagSecondary: {
    backgroundColor: COLORS.violet,
  },
  profileTagText: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textInverse,
  },
  profileTagTextSecondary: {
    color: COLORS.textInverse,
  },
  editLink: {
    color: COLORS.primary,
    ...FONTS.semiBold,
    fontSize: FONT_SIZES.sm,
    marginLeft: 'auto',
  },
  profilePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  profilePromptIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePromptText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    flex: 1,
  },

  // Locked Card - Premium
  lockedCard: {
    marginBottom: SPACING.lg,
  },
  lockedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  lockedEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  lockedEmoji: {
    fontSize: 28,
  },
  lockedTextContainer: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textInverse,
  },
  lockedSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.85,
    marginTop: 2,
  },
  lockedButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  lockedButtonGradient: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  lockedButtonText: {
    color: COLORS.textInverse,
    ...FONTS.bold,
  },

  // Metric Card - Premium
  metricCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    ...SHADOWS.small,
    marginBottom: SPACING.md,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  metricIcon: {
    fontSize: 20,
  },
  metricTitle: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text
  },
  metricSubtitle: {
    marginTop: 2,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  metricContent: {
    marginTop: SPACING.xs,
  },

  // Auto Tag
  autoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  autoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  autoTagText: {
    fontSize: FONT_SIZES.xs - 1,
    ...FONTS.semiBold,
  },
  autoValueDisplay: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  autoValueGradient: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  autoValueText: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textInverse,
  },

  // Screen Time Grid
  screenTimeGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  screenTimeItem: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  screenTimeItemGradient: {
    padding: SPACING.xs,
    alignItems: 'center',
  },
  screenTimeLabel: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  screenTimeValue: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  screenTimeManual: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  screenTimeInput: {
    flex: 1,
  },
  screenTimeInputLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    marginBottom: 4,
  },

  // Emoji Selector - Premium
  emojiSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    marginHorizontal: 2,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    backgroundColor: COLORS.surface,
  },
  emojiText: {
    fontSize: 24,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: FONT_SIZES.xs - 2,
    ...FONTS.medium,
    color: COLORS.textMuted,
  },

  // Number Circle Selector - Premium
  numberCircleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  numberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
  },
  numberCircleText: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
    color: COLORS.text,
  },
  stressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  stressLabelLow: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    ...FONTS.medium,
  },
  stressLabelHigh: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    ...FONTS.medium,
  },
  stressValueDisplay: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  stressValueText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  stressValue: {
    ...FONTS.bold,
    color: COLORS.text,
  },

  // Productivity Slider - Premium
  productivityDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  productivityValue: {
    fontSize: 40,
    ...FONTS.extraBold,
    color: COLORS.primary,
  },
  productivityMax: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginLeft: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sliderBtn: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  sliderBtnGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBtnText: {
    fontSize: 20,
    ...FONTS.bold,
    color: COLORS.textInverse,
  },
  sliderTrack: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 5,
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    ...SHADOWS.small,
  },

  // Submit Button
  submitButton: {
    marginTop: SPACING.xl,
  },
});

