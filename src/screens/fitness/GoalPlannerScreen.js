/**
 * GoalPlannerScreen — Personalised Weekly Goal Generator
 *
 * Exposes the compound multi-step agent task to the user.
 * The user provides a goal (e.g. "Lose 5kg in 2 months"), and the agent
 * fetches profile details + last 7 days metrics, designs a custom calorie/macro
 * target, and generates a week-by-week exercise and nutrition plan.
 *
 * Interview talking point:
 *   "I implemented a goal planning assistant that acts as a compound agentic task.
 *    Instead of simple single-turn chatbot answers, the assistant reads historical logs,
 *    correlates workout data with diet trends, and generates a full 4-week calendar."
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../../theme';
import { generateGoalPlan } from '../../services/AgentService';
import { useAuth } from '../../services/AuthContext';

export default function GoalPlannerScreen({ navigation }) {
  const { user } = useAuth();
  const [goalText, setGoalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const handleGenerate = async () => {
    if (!goalText.trim() || loading) return;
    setLoading(true);
    setPlanResult(null);

    try {
      const res = await generateGoalPlan(user?.id, goalText.trim(), {
        name: user?.name,
        dietType: user?.diet_type || 'any',
      });
      setPlanResult(res);
    } catch (err) {
      setPlanResult({
        success: false,
        answer: 'Failed to generate plan. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient colors={COLORS.gradientHero || COLORS.gradientPrimary} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Titan Goal Planner</Text>
          <Text style={styles.headerSubtitle}>Autonomous Multi-Week Plans</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What is your primary fitness goal?</Text>
            <Text style={styles.cardSubtitle}>
              Titan AI will inspect your weight, dietary preference, and active logs to prepare a custom plan.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lose 5kg in 2 months, run a 5k next month, or hit a 100g protein goal daily"
              placeholderTextColor={COLORS.textMuted}
              value={goalText}
              onChangeText={setGoalText}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.btn, (!goalText.trim() || loading) && styles.btnDisabled]}
              onPress={handleGenerate}
              disabled={!goalText.trim() || loading}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color={COLORS.textInverse} />
                  <Text style={styles.btnText}>Analyzing stats & generating plan...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Generate 4-Week Plan</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Reasoning steps trace */}
          {planResult?.reasoning_steps && planResult.reasoning_steps.length > 0 && (
            <View style={styles.reasoningCard}>
              <TouchableOpacity
                onPress={() => setReasoningExpanded(!reasoningExpanded)}
                style={styles.reasoningHeader}
              >
                <Ionicons
                  name={reasoningExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.reasoningTitle}>View AI Agent Chain-of-Thought</Text>
              </TouchableOpacity>
              {reasoningExpanded && (
                <View style={styles.reasoningSteps}>
                  {planResult.reasoning_steps.map((step, idx) => (
                    <View key={idx} style={styles.reasoningStep}>
                      <View style={styles.stepDot} />
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Output Card */}
          {planResult && (
            <View style={styles.planCard}>
              <View style={styles.planBadge}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={styles.planBadgeText}>Your AI Generated 4-Week Plan</Text>
              </View>
              <Text style={styles.planGoal}>Goal: {planResult.goal}</Text>

              {planResult.context && (
                <View style={styles.contextGrid}>
                  <View style={styles.contextItem}>
                    <Text style={styles.contextVal}>{planResult.context.current_weight} kg</Text>
                    <Text style={styles.contextLabel}>Current Weight</Text>
                  </View>
                  <View style={styles.contextItem}>
                    <Text style={styles.contextVal}>{planResult.context.avg_calories} kcal</Text>
                    <Text style={styles.contextLabel}>7-Day Avg Intake</Text>
                  </View>
                  <View style={styles.contextItem}>
                    <Text style={styles.contextVal}>{planResult.context.avg_active_minutes} min</Text>
                    <Text style={styles.contextLabel}>7-Day Avg Active</Text>
                  </View>
                </View>
              )}

              <Text style={styles.planBody}>{planResult.plan}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
  backButton: {
    padding: SPACING.sm, width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  headerText: { flex: 1, marginLeft: SPACING.md },
  headerTitle: { color: COLORS.textInverse, fontSize: FONT_SIZES.xl, fontWeight: 'bold' },
  headerSubtitle: { color: COLORS.textInverse, opacity: 0.8, fontSize: FONT_SIZES.xs },
  scrollContent: { padding: SPACING.lg, gap: SPACING.md },

  // Card
  card: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder, ...SHADOWS.small },
  cardTitle: { fontSize: FONT_SIZES.lg, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  cardSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  input: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    color: COLORS.text, fontSize: FONT_SIZES.md, minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: COLORS.glassBorder, marginBottom: SPACING.md,
  },
  btn: { backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.small },
  btnDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  btnText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, ...FONTS.bold },

  // Reasoning steps trace
  reasoningCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '30' },
  reasoningHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasoningTitle: { fontSize: FONT_SIZES.sm, color: COLORS.primary, ...FONTS.medium },
  reasoningSteps: { marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.glassBorder, paddingTop: SPACING.md, gap: SPACING.xs },
  reasoningStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  stepText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // Plan Card
  planCard: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder, ...SHADOWS.medium },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  planBadgeText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, ...FONTS.bold },
  planGoal: { fontSize: FONT_SIZES.md, ...FONTS.bold, color: COLORS.text, marginBottom: SPACING.md },
  contextGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.lg },
  contextItem: { alignItems: 'center' },
  contextVal: { fontSize: FONT_SIZES.md, ...FONTS.bold, color: COLORS.primary },
  contextLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  planBody: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 24, fontStyle: 'normal' },
});
