// Home Dashboard — Premium Bento Layout with Wow Factor
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TouchableWithoutFeedback,
  ToastAndroid,
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
import { SectionHeader, Avatar } from "../../components/common";
import EnvironmentWidget from "../../components/EnvironmentWidget";
import AIWellnessCoach from "../../components/AIWellnessCoach";
import CampusZoneRecommender from "../../components/CampusZoneRecommender";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../services/AuthContext";
import db from "../../services/database";
import sensorService from "../../services/SensorService";
import { format } from "date-fns";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  hasUsagePermissionSafely,
  requestUsagePermissionSafely,
} from "../../services/screenTimeMapper";

const { width: W } = Dimensions.get("window");
const CARD_GAP = 12;
const BENTO_W = (W - SPACING.lg * 2 - CARD_GAP) / 2;

// Circular Progress Ring - Premium Style
function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color,
  children,
}) {
  const clamp = Math.min(Math.max(progress, 0), 100);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background ring with gradient effect */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: COLORS.surfaceElevated,
        }}
      />
      {/* Filled ring */}
      {clamp > 0 && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: "transparent",
            borderTopColor: color || COLORS.primary,
            borderRightColor:
              clamp > 25 ? color || COLORS.primary : "transparent",
            borderBottomColor:
              clamp > 50 ? color || COLORS.primary : "transparent",
            borderLeftColor:
              clamp > 75 ? color || COLORS.primary : "transparent",
            transform: [{ rotate: "-45deg" }],
          }}
        />
      )}
      <View style={{ alignItems: "center" }}>{children}</View>
    </View>
  );
}

function BottomSheet({
  visible,
  title,
  description,
  primaryLabel,
  onPrimary,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.sheetOverlay}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>{title}</Text>
              <Text style={s.sheetDesc}>{description}</Text>
              <TouchableOpacity style={s.sheetPrimary} onPress={onPrimary}>
                <LinearGradient
                  colors={COLORS.gradientPrimary}
                  style={s.sheetPrimaryGradient}
                >
                  <Text style={s.sheetPrimaryText}>{primaryLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetSecondary} onPress={onClose}>
                <Text style={s.sheetSecondaryText}>Not now</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 });
  const [todayActivity, setTodayActivity] = useState({ minutes: 0, burned: 0, count: 0 });
  const [todayMood, setTodayMood] = useState(null);
  const [steps, setSteps] = useState(0);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [sheet, setSheet] = useState({ visible: false, type: null });
  const [checkInCompleted, setCheckInCompleted] = useState(false);
  const [usagePermission, setUsagePermission] = useState(false);
  const [stepPermissionGranted, setStepPermissionGranted] = useState(false);
  const [stepPermissionStatus, setStepPermissionStatus] = useState("undetermined");
  const [km, setKm] = useState("0.00");
  const [calories, setCalories] = useState(0);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    async function checkStatus() {
      // Check check-in completion
      const lastCheckin = await AsyncStorage.getItem("@last_checkin_date");
      if (lastCheckin === today) {
        setCheckInCompleted(true);
      }

      // Check permissions
      setUsagePermission(hasUsagePermissionSafely());

      // Step tracking status
      // Note: We don't call startTracking here to avoid multi-listeners on every mount
      // unless permission is already granted.
    }
    checkStatus();
  }, [today]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const foods = await db.getFoodLogs(user.id);
      const todayFoods = foods.filter(f => f.date === today);
      const totals = todayFoods.reduce((acc, f) => ({
        calories: acc.calories + (f.calories || 0),
        protein: acc.protein + (f.protein || 0),
        carbs: acc.carbs + (f.carbs || 0),
        fat: acc.fat + (f.fat || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      setTodayStats({ ...totals, meals: todayFoods.length });

      const activities = await db.getActivities(user.id);
      const todayActs = activities.filter(a => a.date === today);
      setTodayActivity({
        minutes: todayActs.reduce((s, a) => s + (a.duration || 0), 0),
        burned: todayActs.reduce((s, a) => s + (a.caloriesBurned || 0), 0),
        count: todayActs.length,
      });
      setRecentActivities(activities.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3));

      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayActs = activities.filter(a => a.date === dateStr);
        last7.push(dayActs.reduce((s, a) => s + (a.duration || 0), 0));
      }
      setWeeklyActivity(last7);

      const moods = await db.getMoodLogs(user.id);
      setTodayMood(moods.find(m => m.date === today));
    } catch (e) {
      console.error('Load error:', e);
    }
  }, [user, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user?.id) return;

    const unsubFood = db.subscribeToFoodLogs(user.id, () => {
      loadData();
    });

    const unsubActs = db.subscribeToActivities(user.id, () => {
      loadData();
    });

    return () => {
      if (typeof unsubFood === "function") unsubFood();
      if (typeof unsubActs === "function") unsubActs();
    };
  }, [user?.id, loadData]);

  // Check Physical Activity permission on mount
  useEffect(() => {
    const checkStepPermission = async () => {
      const { granted } = await sensorService.checkPermissions();
      setStepPermissionGranted(!!granted);
    };
    checkStepPermission();
  }, []);

  // Load persisted steps and subscribe to live updates
  useEffect(() => {
    const loadAndSubscribe = async () => {
      await sensorService.loadPersistedSteps();
      const currentSteps = sensorService.getSteps();
      setSteps(currentSteps);
      setKm(sensorService.getKm().toFixed(2));
      setCalories(Math.round(sensorService.getCalories()));
    };
    loadAndSubscribe();

    const onSteps = (newSteps) => {
      setSteps(newSteps);
      setKm(sensorService.getKm().toFixed(2));
      setCalories(Math.round(sensorService.getCalories()));
    };
    sensorService.addListener(onSteps);
    return () => sensorService.removeListener(onSteps);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Dev mode: long-press logo for 2 seconds to reset check-in lock
  const handleDevReset = async () => {
    await AsyncStorage.removeItem("@last_logged_date");
    await AsyncStorage.removeItem("@last_checkin_date");
    setCheckInCompleted(false);
    if (Platform.OS === "android") {
      ToastAndroid.show("Dev Mode: Check-in Unlocked", ToastAndroid.SHORT);
    } else {
      Alert.alert("Dev Mode", "Check-in Unlocked");
    }
  };

  const openSheet = (type) => setSheet({ visible: true, type });
  const closeSheet = () => setSheet({ visible: false, type: null });

  const handlePrimarySheetAction = async () => {
    const type = sheet.type;
    closeSheet();

    if (type === "usage") {
      requestUsagePermissionSafely();
      setTimeout(() => setUsagePermission(hasUsagePermissionSafely()), 500);
      return;
    }

    if (type === "activity") {
      const granted = await sensorService.requestPermissions();
      setStepPermissionGranted(!!granted);
      setStepPermissionStatus(granted ? "granted" : "denied");
      if (granted) {
        if (Platform.OS === "android") {
          ToastAndroid.show("Activity access enabled ✓", ToastAndroid.SHORT);
        } else {
          Alert.alert("Activity access enabled");
        }
        sensorService.startTracking((newSteps) => {
          setSteps(newSteps);
          setKm(sensorService.getKm().toFixed(2));
          setCalories(Math.round(sensorService.getCalories()));
        });
      }
      return;
    }
  };

  const calorieGoal = 2000;
  const calProg = Math.min((todayStats.calories / calorieGoal) * 100, 100);
  const actGoal = 45;
  const actProg = Math.min((todayActivity.minutes / actGoal) * 100, 100);

  const hour = new Date().getHours();
  const greetEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';
  const greetText = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <View style={s.container}>
      {/* Permission Value-Exchange Bottom Sheet */}
      <BottomSheet
        visible={sheet.visible}
        title={
          sheet.type === "usage"
            ? "Enable App Usage Access"
            : "Enable Activity Access"
        }
        description={
          sheet.type === "usage"
            ? "We use screen-time data only to help you see how usage affects stress and productivity. This is optional — manual entry always works."
            : "We use the device step sensor to auto-fill your daily check-in. This is optional. Manual entry still works if you deny it."
        }
        primaryLabel={sheet.type === "usage" ? "Enable" : "Allow"}
        onPrimary={handlePrimarySheetAction}
        onClose={closeSheet}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ─── PREMIUM HERO GREETING ─── */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <View style={s.brandRow}>
                {/* Long-press for 2 s → Dev Mode unlock */}
                <TouchableOpacity
                  onLongPress={handleDevReset}
                  delayLongPress={2000}
                  activeOpacity={0.9}
                  style={s.logoWrap}
                >
                  <Image
                    source={require("../../../CT.png")}
                    style={s.logoImage}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={s.brandName}>CAMPUS TITAN</Text>
                  <Text style={s.heroGreet}>
                    {greetText} {greetEmoji}
                  </Text>
                </View>
              </View>
              <Text style={s.heroName}>
                {user?.name?.split(" ")[0] || "Champion"}
              </Text>
              {!!user?.college && (
                <View style={s.heroBadge}>
                  <Text style={s.heroBadgeText}>🎓 {user.college}</Text>
                </View>
              )}
            </View>
            <View style={s.heroRight}>
              <View style={s.datePill}>
                <Text style={s.heroDate}>{format(new Date(), "dd MMM")}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── PREMIUM DAILY WELLNESS CHECK-IN CTA ─── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (checkInCompleted) {
              navigation.navigate("Wellness");
            } else {
              navigation.navigate("Wellness", {
                screen: "DailyWellnessCheckIn",
              });
            }
          }}
          style={[s.quizCard, checkInCompleted && { opacity: 0.95 }]}
        >
          <LinearGradient
            colors={
              checkInCompleted ? COLORS.gradientSuccess : COLORS.gradientHero
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.quizGradient}
          >
            {/* Decorative elements */}
            <View style={s.quizDecor1} />
            <View style={s.quizDecor2} />

            <View style={s.quizContent}>
              <View style={s.quizIconWrap}>
                <Text style={s.quizEmoji}>
                  {checkInCompleted ? "✅" : "🧠"}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={s.quizTitle}>
                  {checkInCompleted
                    ? "You're all set!"
                    : "Daily Wellness Check-in"}
                </Text>
                <Text style={s.quizSub}>
                  {checkInCompleted
                    ? "View Today's Insights"
                    : "Train your AI & earn points!"}
                </Text>
              </View>
              {!checkInCompleted && (
                <View style={s.quizBtn}>
                  <LinearGradient
                    colors={["#FFFFFF", "#F3F4F6"]}
                    style={s.quizBtnGradient}
                  >
                    <Text style={s.quizBtnText}>Start</Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ─── AI WELLNESS COACH ─── */}
        <AIWellnessCoach navigation={navigation} />

        {/* ─── VALUE EXCHANGE CARDS ─── */}
        {!checkInCompleted && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: SPACING.lg, marginHorizontal: -SPACING.lg }}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
          >
            {/* Card 1: Auto Step Tracking */}
            <TouchableOpacity
              style={[s.valueCard, { marginRight: SPACING.md }]}
              onPress={() => openSheet("activity")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradientCalm}
                style={s.valueCardGradient}
              >
                <Text style={{ fontSize: 32, marginBottom: SPACING.sm }}>
                  👟
                </Text>
                <Text style={s.valueCardTitle}>Auto Steps</Text>
                <Text style={s.valueCardDesc}>
                  {stepPermissionGranted ? "✓ Enabled" : "Enable Activity"}
                </Text>
                {!stepPermissionGranted && (
                  <View style={s.valueCardBadge}>
                    <Text style={s.valueCardBadgeText}>Enable</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Card 2: Screen Time */}
            <TouchableOpacity
              style={[s.valueCard, { marginRight: SPACING.md }]}
              onPress={() => openSheet("usage")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradientViolet}
                style={s.valueCardGradient}
              >
                <Text style={{ fontSize: 32, marginBottom: SPACING.sm }}>
                  📱
                </Text>
                <Text style={s.valueCardTitle}>Screen Time</Text>
                <Text style={s.valueCardDesc}>
                  {usagePermission ? "✓ Enabled" : "Enable Usage"}
                </Text>
                {!usagePermission && (
                  <View style={s.valueCardBadge}>
                    <Text style={s.valueCardBadgeText}>Enable</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Card 3: Quick Log */}
            <TouchableOpacity
              style={[s.valueCard]}
              onPress={() =>
                navigation.navigate("Wellness", { screen: "MoodLog" })
              }
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradientEnergy}
                style={s.valueCardGradient}
              >
                <Text style={{ fontSize: 32, marginBottom: SPACING.sm }}>
                  😊
                </Text>
                <Text style={s.valueCardTitle}>Log Mood</Text>
                <Text style={s.valueCardDesc}>Track your feelings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ─── PREMIUM BENTO GRID ─── */}
        <View style={s.bentoGrid}>
          {/* Row 1: Two progress rings side by side */}
          <View style={s.bentoRow}>
            {/* Calories Ring */}
            <View style={[s.bentoCard, s.bentoHalf]}>
              <LinearGradient
                colors={COLORS.gradientPeach}
                style={s.ringCardGradient}
              >
                <ProgressRing
                  progress={calProg}
                  size={76}
                  strokeWidth={5}
                  color={COLORS.coral}
                >
                  <Text style={s.ringValue}>{todayStats.calories}</Text>
                  <Text style={s.ringUnit}>kcal</Text>
                </ProgressRing>
                <Text style={s.bentoLabel}>Calories</Text>
                <Text style={s.bentoSub}>
                  {Math.round(calProg)}% of {calorieGoal}
                </Text>
              </LinearGradient>
            </View>

            {/* Activity Ring */}
            <View style={[s.bentoCard, s.bentoHalf]}>
              <LinearGradient
                colors={COLORS.gradientMint}
                style={s.ringCardGradient}
              >
                <ProgressRing
                  progress={actProg}
                  size={76}
                  strokeWidth={5}
                  color={COLORS.mint}
                >
                  <Text style={s.ringValue}>{todayActivity.minutes}</Text>
                  <Text style={s.ringUnit}>min</Text>
                </ProgressRing>
                <Text style={s.bentoLabel}>Activity</Text>
                <Text style={s.bentoSub}>
                  {Math.round(actProg)}% of {actGoal}m
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Row 2: Macro strip - Premium Gradient */}
          <LinearGradient
            colors={["#EEF2FF", "#E0E7FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.macroStrip}
          >
            {[
              {
                label: "Protein",
                val: todayStats.protein,
                color: COLORS.primary,
                suffix: "g",
              },
              {
                label: "Carbs",
                val: todayStats.carbs,
                color: COLORS.accent,
                suffix: "g",
              },
              {
                label: "Fat",
                val: todayStats.fat,
                color: COLORS.coral,
                suffix: "g",
              },
              {
                label: "Meals",
                val: todayStats.meals,
                color: COLORS.violet,
                suffix: "/4",
              },
            ].map((m, i) => (
              <View key={i} style={s.macroCell}>
                <View
                  style={[s.macroIndicator, { backgroundColor: m.color }]}
                />
                <Text style={[s.macroVal, { color: m.color }]}>
                  {Math.round(m.val)}
                  {m.suffix}
                </Text>
                <Text style={s.macroLbl}>{m.label}</Text>
              </View>
            ))}
          </LinearGradient>

          {/* ─── Automate Tracking section ─── */}
          <SectionHeader title="Automate Tracking" />
          <View style={[s.bentoRow, { marginBottom: SPACING.md }]}>
            {/* Auto step tracking value-exchange card */}
            <TouchableOpacity
              style={[
                s.bentoCard,
                s.bentoHalf,
                { paddingHorizontal: SPACING.sm },
              ]}
              activeOpacity={0.85}
              onPress={async () => {
                if (!stepPermissionGranted) {
                  const granted = await sensorService.requestPermissions();
                  if (granted) {
                    setStepPermissionGranted(true);
                    setStepPermissionStatus("granted");
                    sensorService.startTracking((st) => {
                      setSteps(st);
                      setKm(sensorService.getKm().toFixed(2));
                      setCalories(Math.round(sensorService.getCalories()));
                    });
                  } else {
                    Alert.alert(
                      "Permission needed",
                      "Enable Physical Activity in Settings to auto-track steps.",
                    );
                  }
                }
              }}
            >
              <LinearGradient
                colors={
                  stepPermissionGranted
                    ? COLORS.gradientCalm
                    : ["#F0F9FF", "#E0F2FE"]
                }
                style={s.valueExchangeGradient}
              >
                <Text style={s.valueExchangeIcon}>👟</Text>
                <View style={s.valueExchangeContent}>
                  <Text
                    style={[
                      s.valueExchangeTitle,
                      stepPermissionGranted && { color: COLORS.textInverse },
                    ]}
                  >
                    Auto-step tracking
                  </Text>
                  <Text
                    style={[
                      s.valueExchangeDesc,
                      stepPermissionGranted && {
                        color: COLORS.textInverse,
                        opacity: 0.8,
                      },
                    ]}
                  >
                    {stepPermissionGranted
                      ? "Tracking active"
                      : "Enable Physical Activity"}
                  </Text>
                </View>
                {!stepPermissionGranted && (
                  <View style={s.enableBtn}>
                    <Text style={s.enableBtnText}>Enable →</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Screen time value-exchange card */}
            <TouchableOpacity
              style={[
                s.bentoCard,
                s.bentoHalf,
                { paddingHorizontal: SPACING.sm },
              ]}
              activeOpacity={0.85}
              onPress={() => {
                if (!usagePermission) {
                  openSheet("usage");
                }
              }}
            >
              <LinearGradient
                colors={
                  usagePermission
                    ? COLORS.gradientViolet
                    : ["#F5F3FF", "#EDE9FE"]
                }
                style={s.valueExchangeGradient}
              >
                <Text style={s.valueExchangeIcon}>📊</Text>
                <View style={s.valueExchangeContent}>
                  <Text
                    style={[
                      s.valueExchangeTitle,
                      usagePermission && { color: COLORS.textInverse },
                    ]}
                  >
                    Auto screen time
                  </Text>
                  <Text
                    style={[
                      s.valueExchangeDesc,
                      usagePermission && {
                        color: COLORS.textInverse,
                        opacity: 0.8,
                      },
                    ]}
                  >
                    {usagePermission
                      ? "Categorising usage"
                      : "Enable Usage Access"}
                  </Text>
                </View>
                {!usagePermission && (
                  <View style={s.enableBtn}>
                    <Text style={s.enableBtnText}>Enable →</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Row 3: Steps tall card + Mood / Burn */}
          <View style={s.bentoRow}>
            {/* Steps — tall gradient card */}
            <TouchableOpacity
              style={[s.bentoCard, s.bentoHalf, s.bentoTall]}
              activeOpacity={0.85}
              onPress={async () => {
                if (!stepPermissionGranted) {
                  const granted = await sensorService.requestPermissions();
                  if (granted) {
                    setStepPermissionGranted(true);
                    setStepPermissionStatus("granted");
                  }
                } else {
                  await sensorService.incrementStep((st) => {
                    setSteps(st);
                    setKm(sensorService.getKm().toFixed(2));
                    setCalories(Math.round(sensorService.getCalories()));
                  });
                }
              }}
            >
              <LinearGradient
                colors={COLORS.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.stepsGradient}
              >
                <View style={s.stepsDecor} />
                <Text style={s.stepsIcon}>👟</Text>
                <Text style={s.stepsValue}>{steps.toLocaleString()}</Text>
                <Text style={s.stepsLabel}>Steps Today</Text>
                <View style={s.stepsMeta}>
                  <Text style={s.stepsMetaItem}>🏃 {km} km</Text>
                  <Text style={s.stepsMetaDot}>·</Text>
                  <Text style={s.stepsMetaItem}>🔥 {calories} kcal</Text>
                </View>
                <Text style={s.stepsTap}>
                  {!stepPermissionGranted
                    ? "tap to enable tracking"
                    : "tap to sync"}
                </Text>
                {!stepPermissionGranted && (
                  <TouchableOpacity
                    style={s.permissionBtn}
                    onPress={async () => {
                      const granted = await sensorService.requestPermissions();
                      if (granted) {
                        setStepPermissionGranted(true);
                        setStepPermissionStatus("granted");
                      }
                    }}
                  >
                    <Text style={s.permissionBtnText}>Request Permission</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Mood + Burn stack */}
            <View style={[s.bentoHalf, { gap: CARD_GAP }]}>
              <View style={s.bentoCard}>
                <LinearGradient
                  colors={COLORS.gradientSunset}
                  style={s.moodCardGradient}
                >
                  <Text style={s.moodEmoji}>
                    {todayMood
                      ? ["😢", "😔", "😐", "🙂", "😄"][todayMood.mood - 1]
                      : "🫥"}
                  </Text>
                  <Text style={s.bentoLabel}>
                    {todayMood
                      ? ["Bad", "Low", "Okay", "Good", "Great"][
                      todayMood.mood - 1
                      ]
                      : "No mood"}
                  </Text>
                </LinearGradient>
              </View>
              <View style={s.bentoCard}>
                <LinearGradient
                  colors={COLORS.gradientRose}
                  style={s.burnCardGradient}
                >
                  <Text style={s.burnValue}>{todayActivity.burned}</Text>
                  <Text style={s.burnUnit}>kcal burned</Text>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>

        {/* ─── WEEKLY BAR CHART ─── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Weekly Activity</Text>
          <View style={s.barChart}>
            {weeklyActivity.map((val, i) => {
              const maxVal = Math.max(...weeklyActivity, 1);
              const h = Math.max((val / maxVal) * 70, 3);
              const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
              const isToday = i === 6;
              return (
                <View key={i} style={s.barCol}>
                  <LinearGradient
                    colors={isToday ? COLORS.gradientPrimary : [COLORS.surfaceElevated, COLORS.surfaceElevated]}
                    style={[s.bar, { height: h }]}
                  />
                  <Text style={[s.barLabel, isToday && { color: COLORS.primary, ...FONTS.bold }]}>
                    {days[i]}
                  </Text>
                  {isToday && <View style={s.barDot} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* ─── RECENT ACTIVITY ─── */}
        {recentActivities.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            {recentActivities.map((act, i) => (
              <View key={i} style={s.actRow}>
                <LinearGradient
                  colors={[COLORS.primary + "15", COLORS.primary + "08"]}
                  style={s.actIconGradient}
                >
                  <Text style={{ fontSize: 18 }}>
                    {act.type === "running"
                      ? "🏃"
                      : act.type === "gym"
                        ? "🏋️"
                        : act.type === "cycling"
                          ? "🚴"
                          : act.type === "yoga"
                            ? "🧘"
                            : "⚡"}
                  </Text>
                </LinearGradient>
                <View style={s.actInfo}>
                  <Text style={s.actType}>
                    {act.type?.charAt(0).toUpperCase() + act.type?.slice(1)}
                  </Text>
                  <Text style={s.actMeta}>
                    {act.duration}min · {act.caloriesBurned}kcal
                  </Text>
                </View>
                <Text style={s.actDate}>{act.date?.slice(5)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── ENVIRONMENT & ZONE RECOMMENDER ─── */}
        <SectionHeader title="Campus Environment" />
        <CampusZoneRecommender />
        <EnvironmentWidget
          onPress={() =>
            navigation.navigate("Community", { screen: "Environment" })
          }
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    flexGrow: 1,
    paddingBottom: 100,
  },

  // ─── Hero ───
  hero: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  heroTop: { flexDirection: "row", alignItems: "flex-start" },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: SPACING.md,
    ...SHADOWS.medium,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  logoGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "80%", height: "80%" },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textInverse,
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 11,
    letterSpacing: 3,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  heroGreet: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    ...FONTS.medium,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroName: {
    fontSize: 34,
    ...FONTS.extraBold,
    color: COLORS.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  heroBadge: {
    alignSelf: "flex-start",
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primarySubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  heroBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  heroRight: { alignItems: "center" },
  chatButton: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
    ...SHADOWS.medium,
  },
  chatButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  datePill: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  heroDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },

  // ─── Daily Check-in CTA — Premium ───
  quizCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: "hidden",
    ...SHADOWS.large,
  },
  quizGradient: {
    padding: SPACING.xl,
    minHeight: 100,
    justifyContent: "center",
  },
  quizDecor1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  quizDecor2: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  quizContent: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  quizIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quizEmoji: { fontSize: 28 },
  quizTitle: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textInverse,
  },
  quizSub: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textInverse,
    opacity: 0.85,
    marginTop: 2,
  },
  quizBtn: {
    borderRadius: BORDER_RADIUS.round,
    overflow: "hidden",
    marginLeft: SPACING.sm,
    ...SHADOWS.small,
  },
  quizBtnGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  quizBtnText: {
    color: COLORS.primary,
    ...FONTS.bold,
    fontSize: FONT_SIZES.sm,
  },

  // ─── Value Exchange horizontal cards ───
  valueCard: {
    width: W * 0.42,
    height: 160,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  valueCardGradient: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  valueCardTitle: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textInverse,
    marginBottom: 2,
  },
  valueCardDesc: {
    fontSize: FONT_SIZES.xs,
    ...FONTS.medium,
    color: COLORS.textInverse,
    opacity: 0.85,
  },
  valueCardBadge: {
    marginTop: SPACING.sm,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  valueCardBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    ...FONTS.bold,
  },

  // ─── Permission Bottom Sheet ───
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    ...SHADOWS.large,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  sheetTitle: { fontSize: FONT_SIZES.xl, ...FONTS.bold, color: COLORS.text },
  sheetDesc: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  sheetPrimary: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  sheetPrimaryGradient: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  sheetPrimaryText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
  },
  sheetSecondary: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
  },
  sheetSecondaryText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.lg,
    ...FONTS.semiBold,
  },

  // ─── Bento Grid ───
  bentoGrid: { paddingHorizontal: SPACING.lg, gap: CARD_GAP },
  bentoRow: { flexDirection: "row", gap: CARD_GAP },
  bentoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    ...SHADOWS.small,
  },
  bentoHalf: { width: BENTO_W },
  bentoTall: { paddingVertical: 0, overflow: "hidden" },
  bentoLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    ...FONTS.semiBold,
    marginTop: SPACING.sm,
  },
  bentoSub: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },

  // ─── Progress rings ───
  ringCardGradient: {
    padding: SPACING.lg,
    alignItems: "center",
    borderRadius: BORDER_RADIUS.xxl,
  },
  ringValue: {
    fontSize: FONT_SIZES.xxl,
    ...FONTS.extraBold,
    color: COLORS.text,
  },
  ringUnit: {
    fontSize: 9,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginTop: -2,
  },

  // ─── Macro strip ───
  macroStrip: {
    flexDirection: "row",
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
  },
  macroCell: { flex: 1, alignItems: "center" },
  macroIndicator: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  macroVal: { fontSize: FONT_SIZES.lg, ...FONTS.bold },
  macroLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginTop: 2,
  },

  // ─── Value Exchange bento cards ───
  valueExchangeGradient: {
    flex: 1,
    width: "100%",
    borderRadius: BORDER_RADIUS.xxl - 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  valueExchangeIcon: { fontSize: 28, marginBottom: SPACING.xs },
  valueExchangeContent: { alignItems: "center", marginBottom: SPACING.xs },
  valueExchangeTitle: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
    color: COLORS.text,
    textAlign: "center",
  },
  valueExchangeDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },
  enableBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  enableBtnText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    ...FONTS.bold,
  },

  // ─── Steps card ───
  stepsGradient: {
    flex: 1,
    width: "100%",
    borderRadius: BORDER_RADIUS.xxl - 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
    overflow: "hidden",
  },
  stepsDecor: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  stepsIcon: { fontSize: 32 },
  stepsValue: {
    fontSize: 30,
    ...FONTS.extraBold,
    color: COLORS.textInverse,
    marginTop: 4,
  },
  stepsLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    ...FONTS.semiBold,
    opacity: 0.85,
  },
  stepsMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  stepsMetaItem: {
    fontSize: 11,
    color: COLORS.textInverse,
    opacity: 0.8,
    ...FONTS.medium,
  },
  stepsMetaDot: { fontSize: 11, color: COLORS.textInverse, opacity: 0.4 },
  stepsTap: {
    fontSize: 9,
    color: COLORS.textInverse,
    opacity: 0.5,
    marginTop: 6,
    ...FONTS.medium,
  },
  permissionBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    marginTop: 8,
  },
  permissionBtnText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.xs,
    ...FONTS.bold,
  },

  // ─── Mood & Burn ───
  moodCardGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xxl - 1,
  },
  moodEmoji: { fontSize: 36 },
  burnCardGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xxl - 1,
  },
  burnValue: {
    fontSize: FONT_SIZES.xxl + 4,
    ...FONTS.extraBold,
    color: COLORS.textInverse,
  },
  burnUnit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    opacity: 0.85,
    ...FONTS.medium,
  },

  // ─── Section container ───
  section: {
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  // ─── Weekly bar chart ───
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
  },
  barCol: { alignItems: "center", flex: 1 },
  bar: { width: 24, borderRadius: 12, marginBottom: 6 },
  barLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  barDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },

  // ─── Recent Activity rows ───
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorderLight,
  },
  actIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  actInfo: { flex: 1 },
  actType: { fontSize: FONT_SIZES.md, ...FONTS.semiBold, color: COLORS.text },
  actMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  actDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },
});

