// App Navigator
import React from "react";
import { NavigationContainer, getFocusedRouteNameFromRoute, useNavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from "../theme";
import { useAuth } from "../services/AuthContext";
import * as Haptics from "expo-haptics";

// Auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";

// Main screens
import HomeScreen from "../screens/home/HomeScreen";
import NutritionScreen from "../screens/nutrition/NutritionScreen";
import FoodLogScreen from "../screens/nutrition/FoodLogScreen";
import FoodScannerScreen from "../screens/nutrition/FoodScannerScreen";
import FitnessScreen from "../screens/fitness/FitnessScreen";
import LogActivityScreen from "../screens/fitness/LogActivityScreen";
import WellnessScreen from "../screens/wellness/WellnessScreen";
import MoodLogScreen from "../screens/wellness/MoodLogScreen";
import JournalScreen from "../screens/wellness/JournalScreen";
import JournalEntryScreen from "../screens/wellness/JournalEntryScreen";
import WellnessCircleScreen from "../screens/wellness/WellnessCircleScreen";
import EnvironmentScreen from "../screens/environment/EnvironmentScreen";
import AnalyticsScreen from "../screens/analytics/AnalyticsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import LeaderboardScreen from "../screens/leaderboard/LeaderboardScreen";
import CampusPulseLeaderboardScreen from "../screens/community/CampusPulseLeaderboardScreen";
import HealthInsightsScreen from "../screens/community/HealthInsightsScreen";
import WellnessQuizScreen from "../screens/wellness/WellnessQuizScreen";
import DailyWellnessCheckInScreen from "../screens/wellness/DailyWellnessCheckInScreen";
import AIChatInterface from "../components/AIChatInterface";
import AchievementsScreen from "../screens/fitness/AchievementsScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const focusedKey = state.routes[state.index]?.key;
  const focusedOptions = focusedKey ? descriptors?.[focusedKey]?.options : undefined;
  const focusedTabBarStyle = focusedOptions?.tabBarStyle;
  if (focusedTabBarStyle && focusedTabBarStyle.display === "none") {
    return null;
  }
  return (
    <View style={[tabStyles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={tabStyles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = {
            Home: { focused: "home", unfocused: "home-outline" },
            Nutrition: { focused: "nutrition", unfocused: "nutrition-outline" },
            Wellness: { focused: "heart", unfocused: "heart-outline" },
            Community: { focused: "people", unfocused: "people-outline" },
            CampusAnalytics: { focused: "analytics", unfocused: "analytics-outline" },
            Alerts: { focused: "alert", unfocused: "alert-outline" },
            Operations: {
              focused: "construct",
              unfocused: "construct-outline",
            },
          };
          const iconSet = icons[route.name] || { focused: "ellipse", unfocused: "ellipse-outline" };
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name);
              }}
              style={[tabStyles.tab, isFocused && tabStyles.tabActive]}
            >
              <Ionicons name={isFocused ? iconSet.focused : iconSet.unfocused} size={22} color={isFocused ? COLORS.primary : COLORS.textSecondary} />
              {isFocused && <Text style={tabStyles.tabLabel}>{route.name}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "HomeMain";
          const hideTabBar = routeName === "AIChat";
          return {
            tabBarStyle: hideTabBar ? { display: "none" } : undefined,
          };
        }}
      />
      <Tab.Screen name="Fitness" component={FitnessStack} />
      <Tab.Screen name="Nutrition" component={NutritionStack} />
      <Tab.Screen name="Wellness" component={WellnessStack} />
      <Tab.Screen name="Community" component={CommunityStack} />
    </Tab.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="AIChat" component={AIChatInterface} />
    </Stack.Navigator>
  );
}

function NutritionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NutritionMain" component={NutritionScreen} />
      <Stack.Screen name="FoodLog" component={FoodLogScreen} />
      <Stack.Screen name="FoodScanner" component={FoodScannerScreen} />
    </Stack.Navigator>
  );
}

function FitnessStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FitnessMain" component={FitnessScreen} />
      <Stack.Screen name="LogActivity" component={LogActivityScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
    </Stack.Navigator>
  );
}

function WellnessStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WellnessMain" component={WellnessScreen} />
      <Stack.Screen name="MoodLog" component={MoodLogScreen} />
      <Stack.Screen name="Journal" component={JournalScreen} />
      <Stack.Screen name="JournalEntry" component={JournalEntryScreen} />
      <Stack.Screen name="WellnessCircle" component={WellnessCircleScreen} />
      <Stack.Screen name="DailyWellnessCheckIn" component={DailyWellnessCheckInScreen} />
    </Stack.Navigator>
  );
}

function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityMain" component={MoreMenu} />
      <Stack.Screen name="Environment" component={EnvironmentScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="CampusPulse" component={CampusPulseLeaderboardScreen} />
      <Stack.Screen name="HealthInsights" component={HealthInsightsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
    </Stack.Navigator>
  );
}

function MoreMenu({ navigation }) {
  const { isAdmin } = useAuth();
  const items = [
    { icon: "🧠", label: "AI Health Insights", screen: "HealthInsights", color: COLORS.violet },
    { icon: "🔥", label: "Campus Pulse", screen: "CampusPulse", color: COLORS.primary },
    { icon: "🏆", label: "Leaderboard", screen: "Leaderboard", color: COLORS.orange },
    {
      icon: "🏅",
      label: "Achievements",
      screen: "Achievements",
      color: COLORS.mint,
    },
    { icon: "🌍", label: "Environment", screen: "Environment", color: COLORS.accentLight },
    { icon: "👤", label: "Profile", screen: "Profile", color: COLORS.coral },
    { icon: "⚙️", label: "Settings", screen: "Settings", color: COLORS.orange },
  ];
  if (isAdmin) items.unshift({ icon: "🛡️", label: "Admin Dashboard", screen: "AdminDashboard", color: COLORS.error });
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === "ios" ? 60 : 40 }}>
      <Text style={{ fontSize: FONT_SIZES.xxl, ...FONTS.bold, color: COLORS.text, paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl }}>Community</Text>
      {items.map((item, i) => (
        <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(item.screen); }} style={moreStyles.item}>
          <View style={[moreStyles.iconBg, { backgroundColor: item.color + "22" }]}><Text style={{ fontSize: 22 }}>{item.icon}</Text></View>
          <Text style={moreStyles.label}>{item.label}</Text>
          <Text style={moreStyles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="CampusAnalytics" component={CampusAnalyticsStack} />
      <Tab.Screen name="Alerts" component={AdminAlertsStack} />
      <Tab.Screen name="Operations" component={OperationsStack} />
    </Tab.Navigator>
  );
}

function CampusAnalyticsStack() {
  return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="CampusAnalyticsMain" component={AnalyticsScreen} /></Stack.Navigator>;
}

function AdminAlertsStack() {
  return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="AdminAlertsMain" component={AdminDashboardScreen} /></Stack.Navigator>;
}

function OperationsStack() {
  return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="OperationsMain" component={EnvironmentScreen} /></Stack.Navigator>;
}

function RootNavigator() {
  const { userRole } = useAuth();
  return userRole === "admin" ? <AdminTabs /> : <StudentTabs />;
}

// Global Floating Agent Button
function FloatingAgentButton({ navRef }) {
  const { user, userRole } = useAuth();

  if (!user || userRole === "admin") return null;

  return (
    <TouchableOpacity
      style={floatingStyles.button}
      activeOpacity={0.8}
      onPress={() => {
        if (navRef.isReady()) {
          navRef.navigate("MainApp", { screen: "Home", params: { screen: "AIChat" } });
        }
      }}
    >
      <LinearGradient
        colors={COLORS.gradientPrimary}
        style={floatingStyles.gradient}
      >
        <Ionicons name="chatbubbles" size={24} color={COLORS.textInverse} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  const { user, loading, isOnboarded } = useAuth();
  const navRef = useNavigationContainerRef();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: COLORS.primary, fontSize: 24, ...FONTS.bold }}>FitFusion</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>Loading...</Text>
      </View>
    );
  }
  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: Platform.OS !== "web" }}>
        {!user ? (
          isOnboarded ? (
            <><Stack.Screen name="Login" component={LoginScreen} /><Stack.Screen name="Register" component={RegisterScreen} /></>
          ) : (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )
        ) : (
          <><Stack.Screen name="MainApp" component={RootNavigator} /><Stack.Screen name="WellnessQuiz" component={WellnessQuizScreen} /></>
        )}
      </Stack.Navigator>
      <FloatingAgentButton navRef={navRef} />
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingHorizontal: SPACING.lg },
  pill: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.round, paddingVertical: 12, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.glassBorder, ...SHADOWS.medium, gap: SPACING.xs },
  tab: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: BORDER_RADIUS.round },
  tabActive: { backgroundColor: COLORS.primary + "15" },
  tabLabel: { fontSize: 12, ...FONTS.bold, color: COLORS.primary, marginLeft: 8 },
});

const moreStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder },
  iconBg: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  label: { flex: 1, fontSize: FONT_SIZES.lg, color: COLORS.text, ...FONTS.medium },
  arrow: { fontSize: 24, color: COLORS.textMuted },
});

const floatingStyles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 90, // Above the tab bar
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    ...SHADOWS.large,
    zIndex: 999,
  },
  gradient: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});

