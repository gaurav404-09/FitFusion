// EnvironmentWidget.js - Real Environmental Data
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONTS,
  BORDER_RADIUS,
  SHADOWS,
} from "../theme";
import environmentService from "../services/EnvironmentService";
import notificationService from "../services/NotificationService";

// AQI colour scale (OpenWeather air_pollution uses a 1-5 index)
function getAQIColor(aqiIndex) {
  if (aqiIndex === 1) return "#34D399"; // Good
  if (aqiIndex === 2) return "#A3E635"; // Fair
  if (aqiIndex === 3) return "#F59E0B"; // Moderate
  if (aqiIndex === 4) return "#EF4444"; // Poor
  if (aqiIndex === 5) return "#B91C1C"; // Very Poor
  return COLORS.textMuted;
}

function getActivitySuggestions({ aqiIndex, temp, weatherCondition }) {
  const suggestions = [];

  const condition = (weatherCondition || "").toLowerCase();
  const isRainy = condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunder");
  const isVeryHot = typeof temp === "number" && temp >= 35;
  const isHot = typeof temp === "number" && temp >= 30;

  const aqiBad = aqiIndex === 4 || aqiIndex === 5;
  const aqiOkay = aqiIndex === 1 || aqiIndex === 2;

  if (aqiBad) {
    suggestions.push("Indoor workout (gym / room circuit)");
    suggestions.push("Yoga / mobility session");
    if (isHot || isVeryHot) suggestions.push("Stay hydrated and avoid peak sun");
    return suggestions.slice(0, 3);
  }

  if (isRainy) {
    suggestions.push("Indoor cardio (treadmill / skipping)");
    suggestions.push("Strength training indoors");
    return suggestions.slice(0, 3);
  }

  if (isVeryHot) {
    suggestions.push("Outdoor walk before 8 AM / after 6 PM");
    suggestions.push("Indoor workout during midday");
    suggestions.push("Extra hydration + electrolytes");
    return suggestions.slice(0, 3);
  }

  if (aqiOkay) {
    suggestions.push("Outdoor run / brisk walk");
    suggestions.push("Sports (football / basketball)");
    suggestions.push("Outdoor stretching / cooldown");
    return suggestions.slice(0, 3);
  }

  suggestions.push("Light outdoor walk");
  suggestions.push("Gym workout");
  suggestions.push("Stretching / mobility");
  return suggestions.slice(0, 3);
}

// ─── Crowd colour scale ────────────────────────────────────────────────────────
function getCrowdColor(pct) {
  if (pct < 40) return COLORS.success;
  if (pct < 70) return COLORS.orange;
  return COLORS.error;
}

function getCrowdLabel(pct) {
  if (pct < 40) return "Quiet";
  if (pct < 70) return "Moderate";
  return "Crowded";
}

// ─── Dynamic Recommendation Engine ────────────────────────────────────────────
// Priority order: most-constrained condition wins.
// All comparisons are against thresholds; never raw totals.
function getDynamicInsight(env) {
  const { aqiIndex, temp, gymCrowdPercent } = env;

  const aqiHigh = aqiIndex === 4 || aqiIndex === 5;
  const aqiVeryHigh = aqiIndex === 5;
  const tempHot = temp > 35;
  const gymCrowded = gymCrowdPercent >= 75;
  const gymModerate = gymCrowdPercent >= 50 && gymCrowdPercent < 75;

  // ── Worst case: dangerous air + extreme heat ──
  if (aqiVeryHigh && tempHot) {
    return {
      emoji: "🚨",
      tone: "danger",
      text:
        "Insight: Air quality is very poor and it's extremely hot outside. Avoid all outdoor activity today. Do a short breathing-focused yoga or stretching session indoors to protect your Mental Wellness score.",
    };
  }

  // ── High AQI + crowded gym ─ the primary demo scenario ──
  if (aqiHigh && gymCrowded) {
    return {
      emoji: "🧘",
      tone: "warn",
      text:
        "Insight: Air quality is poor and the gym is crowded. Consider a light indoor room workout or yoga today to maintain your Mental Wellness score.",
    };
  }

  // ── High AQI but gym is free ──
  if (aqiHigh && !gymCrowded) {
    return {
      emoji: "🏋️",
      tone: "warn",
      text:
        "Insight: Air quality is elevated — skip the run and head to the gym instead. The gym is currently " +
        getCrowdLabel(gymCrowdPercent).toLowerCase() +
        ", so you'll have plenty of space.",
    };
  }

  // ── Hot weather + crowded gym ──
  if (tempHot && gymCrowded) {
    return {
      emoji: "💧",
      tone: "warn",
      text:
        "Insight: It's " +
        temp +
        "°C outside and the gym is busy. Try an early-morning outdoor walk (before 8 AM) or an in-room bodyweight circuit to stay active without the heat or crowd.",
    };
  }

  // ── Gym moderately busy, air OK ──
  if (gymModerate) {
    return {
      emoji: "⏰",
      tone: "info",
      text:
        "Insight: Air quality is good! The gym has moderate traffic right now — try heading there in the next 30 minutes for the best experience.",
    };
  }

  // ── All clear ──
  return {
    emoji: "🏃",
    tone: "good",
    text:
      "Insight: Great conditions today! Air quality is clean and the gym is quiet. Perfect time for a full workout session — go for it!",
  };
}

// ─── Insight tone → gradient mapping ──────────────────────────────────────────
const TONE_GRADIENTS = {
  danger: ["#B91C1C", "#7F1D1D"],
  warn: [COLORS.orange, "#D97706"],
  info: [COLORS.primary, COLORS.primaryDark],
  good: [COLORS.accent, COLORS.accentDark],
};

// ─── Stat Pill sub-component ───────────────────────────────────────────────────
function StatPill({ emoji, label, value, valueColor }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Main Widget - Real Environment Data
export default function EnvironmentWidget({ onPress }) {
  const [environmentData, setEnvironmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEnvironmentData = async () => {
      try {
        setLoading(true);
        const data = await environmentService.getEnvironmentData();
        setEnvironmentData(data);
        setError(data.error);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvironmentData();
  }, []);

  useEffect(() => {
    const maybeNotifyRain = async () => {
      try {
        const condition = environmentData?.weather?.description;
        const conditionLower = (condition || "").toLowerCase();
        const isRainy = conditionLower.includes("rain") || conditionLower.includes("drizzle") || conditionLower.includes("thunder");
        if (!isRainy) return;

        const env = {
          aqiIndex: environmentData?.aqi?.aqiIndex ?? null,
          temp: environmentData?.weather?.temperature,
          weatherCondition: condition,
        };
        const suggestions = getActivitySuggestions(env);
        await notificationService.sendRainSuggestionNotification({
          condition,
          suggestions,
        });
      } catch {
        // Ignore notification errors
      }
    };

    if (environmentData?.weather) {
      maybeNotifyRain();
    }
  }, [environmentData]);

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading environment data...</Text>
        </View>
      </View>
    );
  }

  if (error || !environmentData?.weather) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Environment data unavailable</Text>
          <Text style={styles.errorSubtext}>Try enabling location permissions</Text>
        </View>
      </View>
    );
  }

  const env = {
    aqiIndex: environmentData.aqi?.aqiIndex ?? null,
    aqiLabel: environmentData.aqi?.aqiCategory || 'Unknown',
    healthRecommendation: environmentData.aqi?.healthRecommendation || 'Air quality information is unavailable.',
    temp: environmentData.weather?.temperature || 25,
    weatherCondition: environmentData.weather?.description || 'Clear',
    weatherIcon: "☀️",
    gymCrowdPercent: 30, // Would need real campus data
    updatedAt: "Just now",
  };

  const insight = getDynamicInsight(env);
  const aqiColor = getAQIColor(env.aqiIndex);
  const crowdColor = getCrowdColor(env.gymCrowdPercent);
  const insightGradient = TONE_GRADIENTS[insight.tone] ?? TONE_GRADIENTS.info;
  const activitySuggestions = getActivitySuggestions(env);

  return (
    <View style={styles.wrapper}>
      {/* ── Card header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🌍 Campus Environment</Text>
          <Text style={styles.headerSub}>Updated: {env.updatedAt}</Text>
        </View>
        {/* Live badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* ── Three stat pills ── */}
      <View style={styles.pillRow}>
        {/* AQI */}
        <StatPill
          emoji="💨"
          label={env.aqiLabel}
          value={env.aqiIndex ? `${env.aqiIndex}/5` : "--"}
          valueColor={aqiColor}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Weather */}
        <StatPill
          emoji={env.weatherIcon}
          label={env.weatherCondition}
          value={`${env.temp}°C`}
          valueColor={env.temp > 35 ? COLORS.coral : COLORS.accent}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Gym Crowd */}
        <StatPill
          emoji="🏋️"
          label={getCrowdLabel(env.gymCrowdPercent)}
          value={`${env.gymCrowdPercent}%`}
          valueColor={crowdColor}
        />
      </View>

      {/* ── Crowd density mini-bar ── */}
      <View style={styles.crowdBarBg}>
        <View
          style={[
            styles.crowdBarFill,
            {
              width: `${env.gymCrowdPercent}%`,
              backgroundColor: crowdColor,
            },
          ]}
        />
      </View>
      <Text style={styles.crowdBarLabel}>Gym occupancy</Text>

      {/* ── Dynamic Insight card ── */}
      <LinearGradient
        colors={insightGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.insightCard}
      >
        <Text style={styles.insightEmoji}>{insight.emoji}</Text>
        <Text style={styles.insightText}>{insight.text}</Text>
      </LinearGradient>

      <View style={styles.aqiDetailsCard}>
        <Text style={styles.aqiDetailsTitle}>Air Quality</Text>
        <Text style={styles.aqiDetailsText}>{env.healthRecommendation}</Text>
        <Text style={styles.aqiDetailsTitle}>Suggested activities</Text>
        {activitySuggestions.map((s, idx) => (
          <Text key={`${idx}-${s}`} style={styles.aqiDetailsBullet}>
            {"- "}{s}
          </Text>
        ))}
      </View>

      {/* ── "See full report" tap target ── */}
      {onPress && (
        <TouchableOpacity style={styles.seeMoreRow} onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.seeMoreText}>Full Environment Dashboard →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
  },
  headerSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success + "22",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: 9,
    ...FONTS.extraBold,
    color: COLORS.success,
    letterSpacing: 0.8,
  },

  // Stat pills
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
  },
  statEmoji: { fontSize: 20, marginBottom: 2 },
  statValue: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.extraBold,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
    ...FONTS.medium,
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: COLORS.glassBorder,
  },

  // Crowd density bar
  crowdBarBg: {
    height: 5,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.round,
    overflow: "hidden",
    marginBottom: 4,
  },
  crowdBarFill: {
    height: 5,
    borderRadius: BORDER_RADIUS.round,
  },
  crowdBarLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },

  // Insight card
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  insightEmoji: {
    fontSize: 22,
    marginTop: 1,
  },
  insightText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    color: "#FFFFFF",
    lineHeight: 19,
  },

  aqiDetailsCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  aqiDetailsTitle: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
    color: COLORS.text,
    marginBottom: 6,
  },
  aqiDetailsText: {
    fontSize: FONT_SIZES.xs,
    ...FONTS.medium,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  aqiDetailsBullet: {
    fontSize: FONT_SIZES.xs,
    ...FONTS.medium,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // See more
  seeMoreRow: {
    alignItems: "flex-end",
    marginTop: SPACING.md,
  },
  seeMoreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
});
