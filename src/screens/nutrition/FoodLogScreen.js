// Food Log Screen
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONTS,
  BORDER_RADIUS,
  MEAL_TYPES,
} from "../../theme";
import { Header, AnimatedButton, Chip } from "../../components/common";
import { useAuth } from "../../services/AuthContext";
import db from "../../services/database";
import backendAPI from "../../services/backendAPI";
import { format } from "date-fns";

export default function FoodLogScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedMealType, setSelectedMealType] = useState("lunch");
  const [servingSize, setServingSize] = useState("");
  const [servingType, setServingType] = useState("number"); // 'number' or 'bowl'
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Food entry fields
  const [foodName, setFoodName] = useState("");
  const [nutritionData, setNutritionData] = useState(null);

  // Analyze food with Gemini when user enters food name and serving
  const analyzeFood = async () => {
    if (!foodName.trim()) {
      Alert.alert("Missing Info", "Please enter a food name.");
      return;
    }
    
    if (!servingSize.trim()) {
      Alert.alert("Missing Info", "Please enter serving size (e.g., 2 rotis, 1 bowl).");
      return;
    }

    setAnalyzing(true);
    try {
      // Build serving info
      const servingInfo = servingType === "bowl" 
        ? `${servingSize} bowl`
        : servingSize;
      
      const result = await backendAPI.analyzeFoodText(foodName, servingInfo);
      
      if (result?.error) {
        throw new Error(result.error);
      }

      // Normalize the result
      const normalized = normalizeNutritionResult(result);
      setNutritionData(normalized);
    } catch (err) {
      console.error("Food analysis error:", err);
      Alert.alert("Analysis Error", err.message || "Could not analyze food. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const normalizeNutritionResult = (result) => {
    if (!result) return null;

    const calories =
      result.calories ??
      result["Caloric Value"] ??
      result["calories"] ??
      0;
    const protein =
      result.protein ??
      result["Protein( in g)"] ??
      result["protein"] ??
      0;
    const carbs =
      result.carbs ??
      result["Carbohydrates( in g)"] ??
      result["carbs"] ??
      0;
    const fat =
      result.fat ??
      result["Fat( in g)"] ??
      result["fat"] ??
      0;

    const foodNameResult =
      result.food_name ??
      result.foodName ??
      result.name ??
      result["Food"] ??
      result["food"] ??
      "Unknown Food";

    const portionG = result.portion_g ?? result.portionG ?? 100;

    return {
      ...result,
      food_name: foodNameResult,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      portion_g: portionG,
    };
  };

  const handleSave = async () => {
    if (!nutritionData) {
      Alert.alert("No Data", "Please analyze a food item first.");
      return;
    }
    
    setSaving(true);
    try {
      // Parse serving size as portion multiplier
      let portionMultiplier = 1;
      const numMatch = servingSize.match(/[\d.]+/);
      if (numMatch) {
        portionMultiplier = parseFloat(numMatch[0]) || 1;
      }

      const logObject = {
        food_name: nutritionData.food_name || foodName,
        calories: Math.round((nutritionData.calories || 0) * portionMultiplier),
        protein: Math.round((nutritionData.protein || 0) * portionMultiplier),
        carbs: Math.round((nutritionData.carbs || 0) * portionMultiplier),
        fat: Math.round((nutritionData.fat || 0) * portionMultiplier),
        meal_type: selectedMealType,
        date: format(new Date(), "yyyy-MM-dd"),
        portion: portionMultiplier,
      };
      
      await db.addFoodLog({
        ...logObject,
        user_id: user?.id,
      });
      
      Alert.alert("Success", "Food logged successfully.");
      // Reset fields
      setFoodName("");
      setServingSize("");
      setNutritionData(null);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Something went wrong: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFoodName("");
    setServingSize("");
    setNutritionData(null);
  };

  return (
    <View style={styles.container}>
      <Header title="Log Food" subtitle="What did you eat?" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Meal Type Selector */}
        <Text style={styles.label}>Meal Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {MEAL_TYPES.map(m => (
            <Chip
              key={m.id}
              label={`${m.id === 'breakfast' ? '🌅' : m.id === 'lunch' ? '☀️' : m.id === 'snack' ? '🍪' : '🌙'} ${m.label}`}
              selected={selectedMealType === m.id}
              onPress={() => setSelectedMealType(m.id)}
              color={COLORS.primary}
            />
          ))}
        </ScrollView>

        {/* Food Entry Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Food Name *</Text>
          <TextInput
            style={styles.input}
            value={foodName}
            onChangeText={(text) => {
              setFoodName(text);
              setNutritionData(null); // Reset nutrition when food changes
            }}
            placeholder="e.g., Grilled Chicken, Rice, Dal"
          />

          {/* Serving Size Input */}
          <Text style={styles.label}>Serving Size *</Text>
          <View style={styles.servingRow}>
            <TextInput
              style={[styles.input, styles.servingInput]}
              value={servingSize}
              onChangeText={(text) => {
                setServingSize(text);
                setNutritionData(null);
              }}
              placeholder="e.g., 2 rotis, 1 bowl, 150g"
            />
            <View style={styles.servingTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.servingTypeBtn,
                  servingType === "number" && styles.servingTypeBtnActive,
                ]}
                onPress={() => setServingType("number")}
              >
                <Text
                  style={[
                    styles.servingTypeText,
                    servingType === "number" && styles.servingTypeTextActive,
                  ]}
                >
                  No.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.servingTypeBtn,
                  servingType === "bowl" && styles.servingTypeBtnActive,
                ]}
                onPress={() => setServingType("bowl")}
              >
                <Text
                  style={[
                    styles.servingTypeText,
                    servingType === "bowl" && styles.servingTypeTextActive,
                  ]}
                >
                  Bowl
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.hint}>
            Enter number of pieces (e.g., "2 rotis") or bowl type (e.g., "1 bowl full")
          </Text>

          {/* Analyze Button */}
          <AnimatedButton
            title={analyzing ? "Analyzing..." : "🔍 Get Nutrition Info"}
            onPress={analyzeFood}
            disabled={analyzing || !foodName.trim() || !servingSize.trim()}
            style={styles.analyzeButton}
          />

          {analyzing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Analyzing with AI...</Text>
            </View>
          )}

          {/* Nutrition Results Display */}
          {nutritionData && !analyzing && (
            <View style={styles.nutritionCard}>
              <View style={styles.nutritionHeader}>
                <Text style={styles.nutritionTitle}>{nutritionData.food_name}</Text>
                {nutritionData.portion_g && (
                  <Text style={styles.portionText}>~{Math.round(nutritionData.portion_g)}g</Text>
                )}
              </View>
              
              <View style={styles.nutrientGrid}>
                <View style={styles.nutrientItem}>
                  <Text style={styles.nutrientValue}>{Math.round(nutritionData.calories || 0)}</Text>
                  <Text style={styles.nutrientLabel}>Calories</Text>
                </View>
                <View style={styles.nutrientItem}>
                  <Text style={[styles.nutrientValue, { color: COLORS.primary }]}>
                    {Math.round(nutritionData.protein || 0)}g
                  </Text>
                  <Text style={styles.nutrientLabel}>Protein</Text>
                </View>
                <View style={styles.nutrientItem}>
                  <Text style={[styles.nutrientValue, { color: COLORS.accent }]}>
                    {Math.round(nutritionData.carbs || 0)}g
                  </Text>
                  <Text style={styles.nutrientLabel}>Carbs</Text>
                </View>
                <View style={styles.nutrientItem}>
                  <Text style={[styles.nutrientValue, { color: COLORS.coral }]}>
                    {Math.round(nutritionData.fat || 0)}g
                  </Text>
                  <Text style={styles.nutrientLabel}>Fat</Text>
                </View>
              </View>
              
              <Text style={styles.disclaimer}>
                * Values are estimated by AI based on typical portions
              </Text>
            </View>
          )}

          {/* Save Button */}
          {nutritionData && !analyzing && (
            <AnimatedButton
              title={saving ? "Saving..." : "✓ Save Food Log"}
              onPress={handleSave}
              disabled={saving}
              style={styles.saveButton}
            />
          )}

          {/* Clear Button */}
          {nutritionData && !analyzing && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={resetForm}
            >
              <Text style={styles.clearButtonText}>Clear & Start Over</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  content: { paddingBottom: SPACING.huge },
  label: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  chipScroll: { paddingLeft: SPACING.lg, marginBottom: SPACING.sm },
  form: {
    padding: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  servingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  servingInput: {
    flex: 1,
  },
  servingTypeButtons: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  servingTypeBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  servingTypeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  servingTypeText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
  },
  servingTypeTextActive: {
    color: COLORS.textInverse,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  analyzeButton: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  nutritionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  nutritionTitle: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text,
    flex: 1,
  },
  portionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  nutrientGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: SPACING.md,
  },
  nutrientItem: {
    alignItems: "center",
  },
  nutrientValue: {
    fontSize: FONT_SIZES.xl,
    ...FONTS.bold,
    color: COLORS.text,
  },
  nutrientLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.md,
    fontStyle: "italic",
  },
  saveButton: {
    marginTop: SPACING.lg,
  },
  clearButton: {
    marginTop: SPACING.md,
    alignItems: "center",
    padding: SPACING.md,
  },
  clearButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
});

