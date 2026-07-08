import { Platform } from 'react-native';

// CampusTitan Design System — Premium Light Theme (Wow Factor!)
export const COLORS = {
  // Primary — Premium Indigo/Violet
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primarySubtle: '#EEF2FF',

  // Accent — Warm Amber/Gold
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentDark: '#D97706',
  accentSubtle: '#FEF3C7',

  // Secondary accents — Fresh & Vibrant
  coral: '#F472B6',
  coralLight: '#F9A8D4',
  coralDark: '#EC4899',
  mint: '#10B981',
  mintLight: '#34D399',
  mintSubtle: '#D1FAE5',
  sky: '#0EA5E9',
  skyLight: '#38BDF8',
  skySubtle: '#E0F2FE',

  // Warm colors
  peach: '#FB923C',
  rose: '#FB7185',
  violet: '#8B5CF6',
  violetLight: '#A78BFA',

  // Background — Premium Off-White
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceLight: '#F9FAFB',
  surfaceElevated: '#F3F4F6',
  surfaceHighlight: '#EEF2FF',

  // Text — Crisp & Clear
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textLink: '#6366F1',

  // Status
  success: '#10B981',
  successLight: '#34D399',
  successSubtle: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningSubtle: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#F87171',
  errorSubtle: '#FEE2E2',
  info: '#6366F1',
  infoLight: '#818CF8',
  infoSubtle: '#E0E7FF',

  // Glassmorphism — Premium subtle
  glass: 'rgba(99, 102, 241, 0.02)',
  glassBorder: 'rgba(99, 102, 241, 0.08)',
  glassHighlight: 'rgba(99, 102, 241, 0.12)',
  glassBorderLight: 'rgba(0, 0, 0, 0.04)',

  // Chart colors — Vibrant palette
  chartColors: ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#06B6D4', '#F472B6'],

  // Gradients — Premium Wow Factor!
  gradientPrimary: ['#6366F1', '#4F46E5'],
  gradientPrimaryLight: ['#818CF8', '#6366F1'],
  gradientAccent: ['#F59E0B', '#D97706'],
  gradientSunset: ['#F59E0B', '#EF4444'],
  gradientCoral: ['#FB7185', '#EF4444'],
  gradientOcean: ['#06B6D4', '#0EA5E9'],
  gradientViolet: ['#8B5CF6', '#6366F1'],
  gradientMint: ['#10B981', '#34D399'],
  gradientPeach: ['#FB923C', '#F472B6'],
  gradientRose: ['#FB7185', '#EC4899'],
  gradientSky: ['#38BDF8', '#0EA5E9'],
  gradientCard: ['#6366F1', '#8B5CF6'],
  gradientDark: ['#F9FAFB', '#F3F4F6'],
  gradientSurface: ['#FFFFFF', '#F9FAFB'],
  gradientWarm: ['#FEF3C7', '#FDE68A'],
  gradientSuccess: ['#34D399', '#10B981'],

  // Premium gradient combinations for cards
  gradientHero: ['#6366F1', '#8B5CF6', '#A78BFA'],
  gradientEnergy: ['#F59E0B', '#FB923C', '#F472B6'],
  gradientCalm: ['#06B6D4', '#38BDF8', '#0EA5E9'],
  gradientNature: ['#10B981', '#34D399', '#6EE7B7'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  hero: 36,
  mega: 48,
  display: 56,
};

export const FONTS = {
  light: { fontWeight: '300' },
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semiBold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extraBold: { fontWeight: '800' },
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  round: 999,
  full: 9999,
};

const _SHADOWS = {
  small: Platform.select({
    ios: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0px 2px 4px rgba(99,102,241,0.06)' },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    web: { boxShadow: '0px 4px 12px rgba(99,102,241,0.1)' },
  }),
  large: Platform.select({
    ios: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    web: { boxShadow: '0px 8px 24px rgba(99,102,241,0.12)' },
  }),
  glow: Platform.select({
    ios: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
    web: { boxShadow: '0px 0px 30px rgba(99,102,241,0.25)' },
  }),
  glowAccent: Platform.select({
    ios: {
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
    web: { boxShadow: '0px 0px 30px rgba(245,158,11,0.25)' },
  }),
  glowSuccess: Platform.select({
    ios: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
    web: { boxShadow: '0px 0px 30px rgba(16,185,129,0.25)' },
  }),
  inner: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    android: { elevation: 1 },
    web: { boxShadow: 'inset 0px 2px 4px rgba(0,0,0,0.03)' },
  }),
};

export const SHADOWS = _SHADOWS;

export const CARD_STYLE = {
  backgroundColor: '#FFFFFF',
  borderRadius: BORDER_RADIUS.xl,
  borderWidth: 1,
  borderColor: '#F3F4F6',
  padding: SPACING.lg,
  ..._SHADOWS.small,
};

export const GLASS_STYLE = {
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: BORDER_RADIUS.xl,
  borderWidth: 1,
  borderColor: 'rgba(99, 102, 241, 0.1)',
  padding: SPACING.lg,
  overflow: 'hidden',
};

// Mood emojis — Vibrant palette
export const MOOD_EMOJIS = [
  { emoji: '😄', label: 'Great', value: 5, color: '#10B981' },
  { emoji: '🙂', label: 'Good', value: 4, color: '#34D399' },
  { emoji: '😐', label: 'Okay', value: 3, color: '#F59E0B' },
  { emoji: '😔', label: 'Low', value: 2, color: '#FB923C' },
  { emoji: '😢', label: 'Bad', value: 1, color: '#EF4444' },
];

// Activity types — Vibrant palette
export const ACTIVITY_TYPES = [
  { id: 'gym', label: 'Gym Workout', icon: 'fitness-center', color: '#6366F1', unit: 'min' },
  { id: 'running', label: 'Running', icon: 'directions-run', color: '#F59E0B', unit: 'min' },
  { id: 'cycling', label: 'Cycling', icon: 'pedal-bike', color: '#06B6D4', unit: 'min' },
  { id: 'sports', label: 'Sports', icon: 'sports-soccer', color: '#10B981', unit: 'min' },
  { id: 'yoga', label: 'Yoga', icon: 'self-improvement', color: '#8B5CF6', unit: 'min' },
  { id: 'swimming', label: 'Swimming', icon: 'pool', color: '#0EA5E9', unit: 'min' },
  { id: 'walking', label: 'Walking', icon: 'directions-walk', color: '#34D399', unit: 'min' },
  // Bodyweight exercises
  { id: 'pushups', label: 'Push-ups', icon: 'fitness-center', color: '#EF4444', unit: 'reps' },
  { id: 'pullups', label: 'Pull-ups', icon: 'fitness-center', color: '#EC4899', unit: 'reps' },
  { id: 'squats', label: 'Squats', icon: 'fitness-center', color: '#F97316', unit: 'reps' },
  { id: 'planks', label: 'Planks', icon: 'timer', color: '#8B5CF6', unit: 'sec' },
  { id: 'situps', label: 'Sit-ups', icon: 'fitness-center', color: '#14B8A6', unit: 'reps' },
  { id: 'lunges', label: 'Lunges', icon: 'directions-walk', color: '#84CC16', unit: 'reps' },
  { id: 'burpees', label: 'Burpees', icon: 'fitness-center', color: '#EAB308', unit: 'reps' },
  { id: 'other', label: 'Other', icon: 'sports', color: '#EC4899', unit: 'min' },
];

// Meal types
export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'free-breakfast', time: '7:00 - 9:30' },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant', time: '12:00 - 14:00' },
  { id: 'snack', label: 'Snack', icon: 'local-cafe', time: 'Anytime' },
  { id: 'dinner', label: 'Dinner', icon: 'dinner-dining', time: '19:00 - 21:00' },
];

// Animation configs
export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
  },
};

// Helper to get gradient by name
export const getGradient = (name) => {
  const gradients = {
    primary: COLORS.gradientPrimary,
    accent: COLORS.gradientAccent,
    sunset: COLORS.gradientSunset,
    ocean: COLORS.gradientOcean,
    violet: COLORS.gradientViolet,
    mint: COLORS.gradientMint,
    peach: COLORS.gradientPeach,
    rose: COLORS.gradientRose,
    sky: COLORS.gradientSky,
    hero: COLORS.gradientHero,
    energy: COLORS.gradientEnergy,
    calm: COLORS.gradientCalm,
    nature: COLORS.gradientNature,
  };
  return gradients[name] || COLORS.gradientPrimary;
};

