import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchCategorizedScreenTime,
  requestUsagePermissionSafely,
} from "../../services/screenTimeMapper";

const { width } = Dimensions.get("window");

const QUESTIONS = [
  {
    id: "occupation",
    title: "What do you do?",
    type: "options",
    options: ["Student", "Corporate", "Others", "Business", "Housewife"],
  },
  {
    id: "work_mode",
    title: "How do you work/study?",
    type: "options",
    options: ["Remote", "Onsite", "Hybrid"],
  },
  {
    id: "exercise_minutes_per_week",
    title: "Exercise today?",
    type: "number",
    suffix: "mins",
    sub: "Manual log (per day)",
  },
  {
    id: "social_hours_per_week",
    title: "Socializing today?",
    type: "number",
    suffix: "hours",
    sub: "(Optional) Skip if unsure (per day)",
  },
  {
    id: "sleep_hours",
    title: "Sleep last night?",
    type: "number",
    suffix: "hours",
    sub: "Manual entry (overrides sleep tracker)",
  },
];

export default function WellnessQuizScreen({ navigation }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState("quiz"); // 'quiz' | 'review' | 'result'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [fullMetrics, setFullMetrics] = useState(null);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);

  // Default values if user has them
  useEffect(() => {
    const initPermissions = async () => {
      // Avoid crash if mapper not ready
      try {
        requestUsagePermissionSafely();
      } catch (e) {}
    };
    initPermissions();

    if (user) {
      const loadPrefills = async () => {
        const exMins = await AsyncStorage.getItem("@exercise_mins_week");
        if (exMins)
          setAnswers((prev) => ({
            ...prev,
            exercise_minutes_per_week: parseFloat(exMins),
          }));
      };
      loadPrefills();
    }
  }, [user]);

  const progress =
    phase === "quiz" ? (currentIndex / QUESTIONS.length) * 100 : 100;
  const currentQ = QUESTIONS[currentIndex];

  const handleOptionSelect = (val) => {
    handleAnswer(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(handleNext, 400);
  };

  const handleAnswer = (val) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  };

  const handleNext = async () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      prepareReview();
    }
  };

  const prepareReview = async () => {
    setLoading(true);
    try {
      const screenStats = fetchCategorizedScreenTime();
      const kmsLogged = await AsyncStorage.getItem("@kms_walked_daily");
      const sleepHrs = await AsyncStorage.getItem("@sleep_hours");
      const sleepQual = await AsyncStorage.getItem("@sleep_quality");
      const stress = await AsyncStorage.getItem("@journal_stress");
      const prod = await AsyncStorage.getItem("@journal_prod");

      // If manual sleep hours are set, use them; otherwise calculate from timestamps
      let finalSleepHours = sleepHrs ? parseFloat(sleepHrs) : 0;
      if (!finalSleepHours) {
        const sleepStartStr = await AsyncStorage.getItem("@sleep_start_time");
        if (sleepStartStr) {
          const sleepStart = parseInt(sleepStartStr, 10);
          const now = Date.now();
          const elapsedHours = (now - sleepStart) / (1000 * 60 * 60);
          finalSleepHours = Math.max(0, elapsedHours);
        }
      }
      // If user entered sleep in quiz, use it directly (per night)
      if (answers.sleep_hours !== undefined) {
        finalSleepHours = parseFloat(answers.sleep_hours);
      }

      const payload = {
        ...answers,
        age: user.age || 20,
        gender: user.gender || "Other",
        screen_time_hours: screenStats.screen_time_hours || 0,
        work_screen_hours: screenStats.work_screen_hours || 0,
        leisure_screen_hours: screenStats.leisure_screen_hours || 0,
        kms_walked_daily: kmsLogged ? parseFloat(kmsLogged) : 0,
        sleep_hours: finalSleepHours,
        sleep_quality_1_5: sleepQual ? parseInt(sleepQual) : 3,
        stress_level_0_10: stress ? parseInt(stress) : 2,
        productivity_0_100: prod ? parseInt(prod) : 80,
      };

      // Ensure mandatory fields for ML
      if (!payload.exercise_minutes_per_week)
        payload.exercise_minutes_per_week = 0;
      if (!payload.social_hours_per_week) payload.social_hours_per_week = 0;

      setFullMetrics(payload);
      setPhase("review");
    } catch (e) {
      console.error("Review prep failed", e);
    }
    setLoading(false);
  };

  const calculateWellness = async () => {
    setLoading(true);
    try {
      const result = await db.predictWellness(fullMetrics);
      setScore(result.score);
      await db.saveWellnessData(user.id, {
        ...fullMetrics,
        prediction: result.score,
      });
      setPhase("result");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert(
        "AI Offline",
        "Could not connect to the ML engine. Please ensure the backend is running.",
      );
    }
    setLoading(false);
  };

  const renderQuiz = () => (
    <View style={s.quizContainer}>
      <View style={s.questionArea}>
        <Text style={s.questionText}>{currentQ.title}</Text>
        {currentQ.sub && <Text style={s.subText}>{currentQ.sub}</Text>}
        {renderInput()}
      </View>

      {currentQ.type !== "options" && currentQ.type !== "slider" && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.nextBtn, !isAnswered && s.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!isAnswered || loading}
          >
            <Text style={s.nextBtnText}>
              {loading ? "Processing..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderReview = () => (
    <View style={s.reviewContainer}>
      <Text style={s.reviewTitle}>Today's Summary</Text>
      <ScrollView contentContainerStyle={s.reviewScroll}>
        {Object.entries({
          Occupation: fullMetrics.occupation,
          "Work Mode": fullMetrics.work_mode,
          "Exercise (today)": fullMetrics.exercise_minutes_per_week + " mins",
          "Social (today)": fullMetrics.social_hours_per_week + " hrs",
          "Sleep (last night)": fullMetrics.sleep_hours + " hrs",
          "Screen Time": fullMetrics.screen_time_hours?.toFixed(1) + " hrs",
          "Work Screen": fullMetrics.work_screen_hours?.toFixed(1) + " hrs",
          "Leisure Screen":
            fullMetrics.leisure_screen_hours?.toFixed(1) + " hrs",
          Walked: fullMetrics.kms_walked_daily?.toFixed(2) + " km",
          "Sleep Quality": fullMetrics.sleep_quality_1_5 + "/5",
          "Stress Level": fullMetrics.stress_level_0_10 + "/10",
          Productivity: fullMetrics.productivity_0_100 + "/100",
        }).map(([label, value]) => (
          <View key={label} style={s.reviewItem}>
            <Text style={s.reviewLabel}>{label}</Text>
            <Text style={s.reviewValue}>{value}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={s.calcBtn}
        onPress={calculateWellness}
        disabled={loading}
      >
        <LinearGradient
          colors={COLORS.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.calcBtnGradient}
        >
          <Text style={s.calcBtnText}>
            {loading ? "AI is Thinking..." : "Calculate Wellness Score"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderResult = () => (
    <View style={s.resultContainer}>
      <View style={s.scoreCircle}>
        <Text style={s.scoreLabel}>AI Wellness Score</Text>
        <Text style={s.scoreNum}>{Math.round(score)}</Text>
        <Text style={s.scoreScale}>/ 100</Text>
        {(() => {
          const scoreColor =
            score >= 80
              ? COLORS.success
              : score >= 50
                ? COLORS.accent
                : COLORS.coral;
          const scoreEmoji = score >= 80 ? "😄" : score >= 50 ? "😐" : "😔";
          const scoreLabel =
            score >= 80 ? "Great" : score >= 50 ? "Fair" : "Poor";
          const scoreDesc =
            score >= 80
              ? "You're doing great today!"
              : score >= 50
                ? "Room for improvement today."
                : "Focus on self-care today.";
          return (
            <Text
              style={{
                fontSize: FONT_SIZES.md,
                ...FONTS.bold,
                color: scoreColor,
                textAlign: "center",
                marginBottom: SPACING.xl,
              }}
            >
              {`${scoreEmoji} ${scoreLabel} - ${scoreDesc}`}
            </Text>
          );
        })()}
      </View>

      <TouchableOpacity
        style={s.finishBtn}
        onPress={() => navigation.navigate("MainApp")}
      >
        <Text style={s.finishBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInput = () => {
    const val = answers[currentQ.id];
    if (currentQ.type === "options") {
      return (
        <View style={s.optionsContainer}>
          {currentQ.options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.optionBtn, val === opt && s.optionBtnActive]}
              onPress={() => handleOptionSelect(opt)}
            >
              <Text style={[s.optionText, val === opt && s.optionTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (currentQ.type === "number") {
      return (
        <View style={s.numContainer}>
          <TextInput
            style={s.numInput}
            keyboardType="decimal-pad"
            value={val !== undefined ? String(val) : ""}
            onChangeText={(t) => handleAnswer(t ? parseFloat(t) : undefined)}
            placeholder="0"
            autoFocus
          />
          <Text style={s.numSuffix}>{currentQ.suffix}</Text>
        </View>
      );
    }
  };

  const isOptional = currentQ && currentQ.id === "social_hours_per_week";
  const isAnswered =
    currentQ &&
    (isOptional ||
      (answers[currentQ.id] !== undefined && answers[currentQ.id] !== ""));

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.closeBtn}
        >
          <Ionicons name="close" size={28} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {phase === "quiz" && renderQuiz()}
        {phase === "review" && renderReview()}
        {phase === "result" && renderResult()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  closeBtn: { padding: SPACING.xs },
  progressTrack: {
    flex: 1,
    height: 16,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
    marginLeft: SPACING.md,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.success,
    borderRadius: 8,
  },

  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  questionArea: { flex: 1, justifyContent: "center" },
  questionText: {
    fontSize: 32,
    ...FONTS.extraBold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  subText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },

  // Options
  optionsContainer: { gap: SPACING.md },
  optionBtn: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.surface,
  },
  optionBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "15",
  },
  optionText: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text,
    textAlign: "center",
  },
  optionTextActive: { color: COLORS.primary },

  // Number
  numContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  numInput: {
    fontSize: 64,
    ...FONTS.extraBold,
    color: COLORS.primary,
    minWidth: 80,
    textAlign: "center",
  },
  numSuffix: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textMuted,
    ...FONTS.bold,
    marginLeft: SPACING.sm,
  },

  // Slider replacements (buttons to ensure exact discrete values for ML)
  sliderContainer: { marginTop: SPACING.md },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  sliderLabelText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
  },
  sliderBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.glassBorder,
  },
  sliderBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "20",
  },
  sliderBtnText: { fontSize: FONT_SIZES.lg, ...FONTS.bold, color: COLORS.text },
  sliderBtnTextActive: { color: COLORS.primary },

  // Footer
  footer: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },
  nextBtn: {
    backgroundColor: COLORS.success,
    padding: 20,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: "center",
    ...SHADOWS.medium,
  },
  nextBtnDisabled: { backgroundColor: COLORS.surfaceElevated, elevation: 0 },
  nextBtnText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.lg,
    ...FONTS.extraBold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Phase Containers
  quizContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: "space-between",
  },
  reviewContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  reviewScroll: {
    paddingBottom: SPACING.xxl,
  },
  reviewItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  reviewLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    ...FONTS.medium,
    flex: 1,
  },
  reviewValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    marginLeft: SPACING.sm,
  },
  reviewContent: { flex: 1, paddingHorizontal: SPACING.xl },
  reviewTitle: {
    fontSize: 28,
    ...FONTS.extraBold,
    color: COLORS.text,
    marginTop: SPACING.xl,
    textAlign: "center",
  },
  reviewSub: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  metricItem: {
    width: "47%",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.small,
  },
  metricLabel: {
    fontSize: 10,
    ...FONTS.bold,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  metricVal: {
    fontSize: FONT_SIZES.md,
    ...FONTS.extraBold,
    color: COLORS.primary,
    marginTop: 4,
  },

  calcBtn: { marginTop: SPACING.xxl, marginBottom: SPACING.xxl },
  calcBtnGradient: {
    padding: 20,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: "center",
    ...SHADOWS.medium,
  },
  calcBtnText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.lg,
    ...FONTS.extraBold,
  },

  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xxl,
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.surface,
    borderWidth: 8,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.large,
    marginBottom: SPACING.xxl,
  },
  scoreLabel: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
    color: COLORS.textMuted,
  },
  scoreNum: { fontSize: 64, ...FONTS.extraBold, color: COLORS.text },
  scoreScale: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.textMuted,
  },

  resultDesc: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: SPACING.huge,
  },
  finishBtn: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: BORDER_RADIUS.round,
    ...SHADOWS.medium,
  },
  finishBtnText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
  },
});
