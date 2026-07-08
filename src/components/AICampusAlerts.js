import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONTS,
  BORDER_RADIUS,
  SHADOWS,
} from "../theme";
import aiService from "../services/aiService";

export default function AICampusAlerts({ analytics }) {
  const [loading, setLoading] = useState(true);
  const [alertText, setAlertText] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadAlert() {
      setLoading(true);
      try {
        const suggestion = await aiService.generateAdminInterventions(analytics);
        if (mounted) {
          setAlertText(suggestion);
          setError(null);
        }
      } catch (e) {
        console.warn("AICampusAlerts error:", e);
        if (mounted) {
          setError(
            "AI campus alerts will appear here once analytics and connectivity are available.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAlert();
    return () => {
      mounted = false;
    };
  }, [analytics]);

  return (
    <LinearGradient
      colors={COLORS.gradientAccent}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>AI Campus Alert</Text>
        <Text style={styles.badge}>Admin insight</Text>
      </View>
      {loading && !alertText ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.textInverse} />
          <Text style={styles.loadingText}>Generating campus-wide intervention…</Text>
        </View>
      ) : (
        <Text style={styles.bodyText}>
          {alertText ||
            error ||
            "Once campus analytics are available, an AI-generated operational intervention will appear here."}
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.textInverse,
  },
  badge: {
    fontSize: FONT_SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.textInverse,
    opacity: 0.85,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    opacity: 0.85,
  },
  bodyText: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textInverse,
    lineHeight: 19,
  },
});

