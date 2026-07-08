// withTheme HOC - Higher Order Component for backward compatibility
// This wraps a component and provides COLORS as a prop based on current theme
import React, { useContext } from 'react';
import ThemeContext from './ThemeContext';

// Legacy COLORS fallback - returns light colors as default
// This is only used when component is not wrapped in ThemeProvider
const LEGACY_COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primarySubtle: '#EEF2FF',
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentDark: '#D97706',
  accentSubtle: '#FEF3C7',
  coral: '#F472B6',
  coralLight: '#F9A8D4',
  coralDark: '#EC4899',
  mint: '#10B981',
  mintLight: '#34D399',
  mintSubtle: '#D1FAE5',
  sky: '#0EA5E9',
  skyLight: '#38BDF8',
  skySubtle: '#E0F2FE',
  peach: '#FB923C',
  rose: '#FB7185',
  violet: '#8B5CF6',
  violetLight: '#A78BFA',
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceLight: '#F9FAFB',
  surfaceElevated: '#F3F4F6',
  surfaceHighlight: '#EEF2FF',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textLink: '#6366F1',
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
  glass: 'rgba(99, 102, 241, 0.02)',
  glassBorder: 'rgba(99, 102, 241, 0.08)',
  glassHighlight: 'rgba(99, 102, 241, 0.12)',
  glassBorderLight: 'rgba(0, 0, 0, 0.04)',
  chartColors: ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#06B6D4', '#F472B6'],
  gradientPrimary: ['#6366F1', '#4F46E5'],
  gradientPrimaryLight: ['#818CF8', '#6366F1'],
  gradientAccent: ['#F59E0B', '#D97706'],
  gradientSunset: ['#F59E0B', '#EF4444'],
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
  gradientHero: ['#6366F1', '#8B5CF6', '#A78BFA'],
  gradientEnergy: ['#F59E0B', '#FB923C', '#F472B6'],
  gradientCalm: ['#06B6D4', '#38BDF8', '#0EA5E9'],
  gradientNature: ['#10B981', '#34D399', '#6EE7B7'],
};

// Try to get theme colors, fallback to legacy if not available
export function useThemedColors() {
  try {
    const context = useContext(ThemeContext);
    if (context && context.colors) {
      return context.colors;
    }
    return LEGACY_COLORS;
  } catch (e) {
    // Not wrapped in ThemeProvider, use legacy
    return LEGACY_COLORS;
  }
}

// Export legacy COLORS for components that haven't been updated yet
// NOTE: This won't respond to theme changes - use useThemedColors() instead
export { LEGACY_COLORS as COLORS };

