import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from "../theme";
import { getSimulatedEnvironment } from "../services/environmentMatrix";

export default function CampusZoneRecommender() {
  const env = useMemo(() => getSimulatedEnvironment(new Date()), []);

  if (!env) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Campus Zone Recommender</Text>
        <Text style={styles.subtitle}>
          We’ll suggest quieter spaces once environment data is available.
        </Text>
      </View>
    );
  }

  const noise = env.noise || "—";
  const crowding = env.crowding || "—";
  const zone = env.zone || "Central Library";

  const isCrowded = parseInt(crowding, 10) >= 80;
  const isQuiet = parseInt(crowding, 10) <= 30;

  let recommendation =
    "Conditions look balanced across campus. Pick any space that feels right for you today.";

  if (zone === "Hostel Mess" && isCrowded) {
    recommendation =
      "Hostel Mess is extremely crowded right now. If you need calm or focus, consider heading to Central Library or a quieter courtyard.";
  } else if (zone === "Main Gym" && isCrowded) {
    recommendation =
      "Main Gym is at peak load right now. To avoid the rush, try a walk around campus or a bodyweight workout in your room.";
  } else if (zone === "Central Library" && isQuiet) {
    recommendation =
      "Central Library is quiet and spacious right now. Great moment to catch up on focused study or reflective journaling.";
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Campus Zone Recommender</Text>
      <Text style={styles.zoneLine}>
        Now around <Text style={styles.zone}>{zone}</Text>
      </Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Noise</Text>
          <Text style={styles.badgeValue}>{noise}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Crowding</Text>
          <Text style={styles.badgeValue}>{crowding}</Text>
        </View>
      </View>
      <Text style={styles.recommendation}>{recommendation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  zoneLine: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  zone: {
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  badgeRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  badge: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  badgeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },
  badgeValue: {
    marginTop: 2,
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
  },
  recommendation: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

