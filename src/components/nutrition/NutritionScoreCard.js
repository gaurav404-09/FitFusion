import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../../theme';

export default function NutritionScoreCard({ nutritionData, onLogFood, onRetake }) {
  if (!nutritionData) {
    return null;
  }

  const calories = nutritionData.calories || 0;
  const protein = nutritionData.protein || 0;
  const carbs = nutritionData.carbs || 0;
  const fat = nutritionData.fat || 0;
  const food_name = nutritionData.food_name || 'Unknown Food';

  const getMacroColor = (value, type) => {
    // Simple color coding for macros
    if (type === 'calories') return value > 500 ? COLORS.warning : COLORS.success;
    if (type === 'protein') return value > 20 ? COLORS.success : COLORS.primary;
    if (type === 'carbs') return value > 50 ? COLORS.warning : COLORS.primary;
    if (type === 'fat') return value > 15 ? COLORS.error : COLORS.success;
    return COLORS.primary;
  };

  return (
    <LinearGradient
      colors={COLORS.gradientCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.foodName}>{food_name}</Text>
          <Text style={styles.portionSize}>
            1 serving {nutritionData.is_gemini_only ? ' (AI Estimate)' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onLogFood && onLogFood(nutritionData)}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Log Food</Text>
        </TouchableOpacity>
      </View>

      {/* Macronutrients */}
      <View style={styles.macrosContainer}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: getMacroColor(calories, 'calories') }]}>{calories || 0}</Text>
          <Text style={styles.macroLabel}>Calories</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: getMacroColor(protein, 'protein') }]}>{protein || 0}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: getMacroColor(carbs, 'carbs') }]}>{carbs || 0}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: getMacroColor(fat, 'fat') }]}>{fat || 0}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => onRetake && onRetake()}
          activeOpacity={0.8}
        >
          <Text style={styles.retakeButtonText}>Retake Photo</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  foodName: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  portionSize: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  saveButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.sm,
    ...FONTS.bold,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.md,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: FONT_SIZES.md,
    ...FONTS.bold,
    color: COLORS.text,
  },
  macroLabel: {
    fontSize: FONT_SIZES.xs,
    ...FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  retakeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    flex: 1,
  },
  retakeButtonText: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.text,
  },
});
