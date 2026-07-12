/**
 * NudgeBanner — Proactive AI Nudge Component
 *
 * Displayed on the Home screen on every app open.
 * The agent autonomously checks the last 7 days of data and surfaces
 * personalised health insights WITHOUT the user asking — this is what
 * separates an agent from a simple chatbot.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../theme';
import { fetchNudges } from '../services/AgentService';

export default function NudgeBanner({ userId, onChatOpen }) {
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchNudges(userId);
        if (mounted && result.length > 0) {
          setNudges(result);
          // Animate in
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]).start();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [userId]);

  // Cycle through nudges every 5 seconds
  useEffect(() => {
    if (nudges.length < 2) return;
    const interval = setInterval(() => {
      setActiveIndex(i => (i + 1) % nudges.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [nudges]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Titan AI is checking your stats...</Text>
      </View>
    );
  }

  if (dismissed || nudges.length === 0) return null;

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={12} color={COLORS.primary} />
            <Text style={styles.badgeText}>Titan AI · Proactive Insight</Text>
          </View>
          <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Nudge text */}
        <Text style={styles.nudgeText}>{nudges[activeIndex]}</Text>

        {/* Pagination dots */}
        {nudges.length > 1 && (
          <View style={styles.dots}>
            {nudges.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        {/* Action */}
        <TouchableOpacity style={styles.actionButton} onPress={onChatOpen} activeOpacity={0.8}>
          <Text style={styles.actionText}>Ask Titan AI →</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.medium,
  },
  container: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  nudgeText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    marginBottom: SPACING.md,
    ...FONTS.medium,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: SPACING.md,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 14,
  },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
  },
  actionText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
  },
});
