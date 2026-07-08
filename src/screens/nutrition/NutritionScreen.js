// Nutrition Screen
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, TouchableOpacity, Modal, RefreshControl, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS, MEAL_TYPES } from '../../theme';
import { GradientCard, SectionHeader, AnimatedButton, ProgressBar } from '../../components/common';
import { useAuth } from '../../services/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import db from '../../services/database';
import nutritionAnalysis from '../../services/nutritionAnalysis';
import { format, subDays } from 'date-fns';
import { calculateNutritionGoals, getDefaultGoals, calculateBMI, ACTIVITY_LEVELS, FITNESS_GOALS } from '../../utils/nutritionCalculator';

const { width } = Dimensions.get('window');

export default function NutritionScreen({ navigation }) {
    const { user, updateProfile } = useAuth();
    const [foodLogs, setFoodLogs] = useState([]);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFood, setSelectedFood] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [goalsModalVisible, setGoalsModalVisible] = useState(false);
    const [nutritionGoals, setNutritionGoals] = useState(getDefaultGoals());
    const [editedGoals, setEditedGoals] = useState(null);
    const [savingGoals, setSavingGoals] = useState(false);

    useEffect(() => {
        if (user) {
            if (user.calorie_goal) {
                setNutritionGoals({
                    calories: user.calorie_goal,
                    protein: user.protein_goal,
                    carbs: user.carbs_goal,
                    fat: user.fat_goal,
                    activityLevel: user.activity_level || 'moderate',
                    fitnessGoal: user.fitness_goal || 'maintain',
                });
            } else if (user.height && user.weight && user.age && user.gender) {
                const goals = calculateNutritionGoals({
                    weight: user.weight, height: user.height, age: user.age, gender: user.gender,
                    activityLevel: 'moderate', fitnessGoal: 'maintain',
                });
                setNutritionGoals(goals);
            }
        }
    }, [user]);

    const loadData = useCallback(async () => {
        if (!user) return;
        const logs = await db.getFoodLogs(user.id);
        setFoodLogs(logs);
    }, [user]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const extractDate = (dateValue) => {
        if (!dateValue) return '';
        if (typeof dateValue === 'string' && dateValue.includes('T')) {
            return dateValue.split('T')[0];
        }
        return dateValue;
    };

    const dayLogs = foodLogs.filter(l => extractDate(l.date) === selectedDate);
    const totals = dayLogs.reduce((acc, l) => ({
        calories: acc.calories + (l.calories || 0),
        protein: acc.protein + (l.protein || 0),
        carbs: acc.carbs + (l.carbs || 0),
        fat: acc.fat + (l.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const calorieGoal = nutritionGoals.calories || 2000;
    const proteinGoal = nutritionGoals.protein || 60;
    const carbGoal = nutritionGoals.carbs || 250;
    const fatGoal = nutritionGoals.fat || 65;

    const bmiInfo = user?.weight && user?.height ? calculateBMI(user.weight, user.height) : null;

    const weekData = Array.from({ length: 7 }, (_, i) => {
        const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
        const dayTotal = foodLogs.filter(l => extractDate(l.date) === date).reduce((s, l) => s + (l.calories || 0), 0);
        return { date, day: format(subDays(new Date(), 6 - i), 'EEE'), calories: dayTotal };
    });

    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { date: format(d, 'yyyy-MM-dd'), day: format(d, 'EEE'), num: format(d, 'dd') };
    });

    function getMealsByType(type) {
        return dayLogs.filter(l => l.mealType === type);
    }

    const handleFoodClick = (food) => {
        setSelectedFood(food);
        setModalVisible(true);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Handle fitness goal change - auto recalculate
    const handleFitnessGoalChange = (fitnessGoal) => {
        if (!user || !user.height || !user.weight || !user.age || !user.gender) {
            setEditedGoals(prev => ({ ...prev, fitnessGoal, useCustom: false }));
            return;
        }
        const newGoals = calculateNutritionGoals({
            weight: user.weight, height: user.height, age: user.age, gender: user.gender,
            activityLevel: editedGoals?.activityLevel || 'moderate', fitnessGoal,
        });
        setEditedGoals({ ...newGoals, fitnessGoal, useCustom: false });
    };

    // Handle activity level change - auto recalculate
    const handleActivityLevelChange = (activityLevel) => {
        if (!user || !user.height || !user.weight || !user.age || !user.gender) {
            setEditedGoals(prev => ({ ...prev, activityLevel, useCustom: false }));
            return;
        }
        const newGoals = calculateNutritionGoals({
            weight: user.weight, height: user.height, age: user.age, gender: user.gender,
            activityLevel, fitnessGoal: editedGoals?.fitnessGoal || 'maintain',
        });
        setEditedGoals({ ...newGoals, activityLevel, useCustom: false });
    };

    // Handle custom goal change
    const handleCustomGoalChange = (field, value) => {
        setEditedGoals(prev => ({ ...prev, [field]: value, useCustom: true }));
    };

    // Toggle between custom and calculated
    const handleToggleCustom = () => {
        if (editedGoals?.useCustom) {
            if (user && user.height && user.weight && user.age && user.gender) {
                const newGoals = calculateNutritionGoals({
                    weight: user.weight, height: user.height, age: user.age, gender: user.gender,
                    activityLevel: editedGoals?.activityLevel || 'moderate', fitnessGoal: editedGoals?.fitnessGoal || 'maintain',
                });
                setEditedGoals({ ...newGoals, useCustom: false });
            }
        } else {
            setEditedGoals(prev => ({ ...prev, useCustom: true }));
        }
    };

    const handleSaveGoals = async () => {
        if (!user || !editedGoals) return;
        setSavingGoals(true);
        try {
            const updates = {
                calorie_goal: parseInt(editedGoals.calories) || 2000,
                protein_goal: parseInt(editedGoals.protein) || 60,
                carbs_goal: parseInt(editedGoals.carbs) || 250,
                fat_goal: parseInt(editedGoals.fat) || 65,
                activity_level: editedGoals.activityLevel || 'moderate',
                fitness_goal: editedGoals.fitnessGoal || 'maintain',
            };
            await updateProfile(user.id, updates);
            setNutritionGoals({
                ...editedGoals,
                calories: parseInt(editedGoals.calories) || 2000,
                protein: parseInt(editedGoals.protein) || 60,
                carbs: parseInt(editedGoals.carbs) || 250,
                fat: parseInt(editedGoals.fat) || 65,
            });
            setGoalsModalVisible(false);
        } catch (error) { console.error('Error saving goals:', error); }
        setSavingGoals(false);
    };

    const handleReset = () => {
        if (user && user.height && user.weight && user.age && user.gender) {
            const newGoals = calculateNutritionGoals({
                weight: user.weight, height: user.height, age: user.age, gender: user.gender,
                activityLevel: 'moderate', fitnessGoal: 'maintain',
            });
            setEditedGoals({ ...newGoals, useCustom: false });
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle} numberOfLines={1}>Nutrition</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.xs }}>

                        <TouchableOpacity style={[styles.logButton, { backgroundColor: COLORS.surfaceElevated }]} onPress={() => navigation.navigate('FoodScanner')}>
                            <Text style={{ fontSize: 18 }}>📷</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.logButton, { backgroundColor: COLORS.primary + '20' }]} onPress={() => { setEditedGoals({ ...nutritionGoals, useCustom: false }); setGoalsModalVisible(true); }}>
                            <Text style={{ fontSize: 16 }}>⚙️</Text>
                        </TouchableOpacity>
                        <AnimatedButton title="+ Log Food" onPress={() => navigation.navigate('FoodLog')} style={styles.logButton} textStyle={{ fontSize: FONT_SIZES.md }} />
                    </View>
                </View>

                {bmiInfo && (
                    <View style={styles.bmiCard}>
                        <Text style={styles.bmiLabel}>Your BMI</Text>
                        <View style={styles.bmiRow}>
                            <Text style={styles.bmiValue}>{bmiInfo.value}</Text>
                            <Text style={styles.bmiCategory}>{bmiInfo.category}</Text>
                        </View>
                        <Text style={styles.goalInfo}>Daily Goal: {calorieGoal} kcal • {proteinGoal}g P • {carbGoal}g C • {fatGoal}g F</Text>
                    </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSelector} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
                    {dates.map((d) => (
                        <TouchableOpacity key={d.date} style={[styles.dateItem, selectedDate === d.date && styles.dateItemActive]} onPress={() => setSelectedDate(d.date)}>
                            <Text style={[styles.dateDay, selectedDate === d.date && styles.dateDayActive]}>{d.day}</Text>
                            <Text style={[styles.dateNum, selectedDate === d.date && styles.dateNumActive]}>{d.num}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <GradientCard gradient={COLORS.gradientCard} style={styles.calorieCard}>
                    <View style={styles.calorieHeader}>
                        <View>
                            <Text style={styles.calorieLabel}>Calories Consumed</Text>
                            <View style={styles.calorieValueRow}>
                                <Text style={styles.calorieValue}>{Math.round(totals.calories)}</Text>
                                <Text style={styles.calorieGoal}>/ {calorieGoal} kcal</Text>
                            </View>
                        </View>
                        <View style={styles.calorieRing}><Text style={styles.caloriePercent}>{Math.round((totals.calories / calorieGoal) * 100)}%</Text></View>
                    </View>
                    <ProgressBar progress={(totals.calories / calorieGoal) * 100} color={COLORS.coral} style={{ marginTop: SPACING.md }} />
                </GradientCard>

                <SectionHeader title="Macro Breakdown" />
                <View style={styles.macroGrid}>
                    {[
                        { label: 'Protein', value: totals.protein, goal: proteinGoal, color: COLORS.primary, unit: 'g' },
                        { label: 'Carbs', value: totals.carbs, goal: carbGoal, color: COLORS.accent, unit: 'g' },
                        { label: 'Fat', value: totals.fat, goal: fatGoal, color: COLORS.coral, unit: 'g' },
                    ].map((m, i) => (
                        <View key={i} style={styles.macroCard}>
                            <Text style={styles.macroLabel}>{m.label}</Text>
                            <Text style={[styles.macroValue, { color: m.color }]}>{Math.round(m.value)}{m.unit}</Text>
                            <ProgressBar progress={(m.value / m.goal) * 100} color={m.color} height={4} style={{ marginTop: SPACING.sm }} />
                            <Text style={styles.macroGoal}>{Math.round(m.value)}/{m.goal}{m.unit}</Text>
                        </View>
                    ))}
                </View>

                {MEAL_TYPES.map((meal) => {
                    const meals = getMealsByType(meal.id);
                    const mealCalories = meals.reduce((s, m) => s + (m.calories || 0), 0);
                    return (
                        <View key={meal.id} style={styles.mealSection}>
                            <View style={styles.mealHeader}>
                                <View style={styles.mealHeaderLeft}>
                                    <Text style={styles.mealEmoji}>{meal.id === 'breakfast' ? '🌅' : meal.id === 'lunch' ? '☀️' : meal.id === 'snack' ? '🍪' : '🌙'}</Text>
                                    <View><Text style={styles.mealTitle}>{meal.label}</Text><Text style={styles.mealTime}>{meal.time}</Text></View>
                                </View>
                                <Text style={styles.mealCalories}>{Math.round(mealCalories)} kcal</Text>
                            </View>
                            {meals.length === 0 ? <Text style={styles.mealEmpty}>No items logged</Text> : meals.map((item, i) => (
                                <TouchableOpacity key={i} style={styles.foodItem} onPress={() => handleFoodClick(item)} activeOpacity={0.7}>
                                    <View style={[styles.vegDot, { backgroundColor: item.isVeg ? COLORS.success : COLORS.error }]} />
                                    <Text style={styles.foodName}>{item.foodName}</Text>
                                    <Text style={styles.foodCalories}>{item.calories} kcal</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    );
                })}

                <SectionHeader title="Weekly Calorie Trend" />
                <View style={styles.weekChart}>
                    {weekData.map((d, i) => {
                        const maxCal = Math.max(...weekData.map(w => w.calories), 1);
                        const barH = Math.max((d.calories / maxCal) * 80, 4);
                        const isToday = d.date === format(new Date(), 'yyyy-MM-dd');
                        return (
                            <TouchableOpacity key={i} style={styles.weekBar} onPress={() => setSelectedDate(d.date)}>
                                <Text style={styles.weekCalValue}>{d.calories > 0 ? Math.round(d.calories) : '-'}</Text>
                                <LinearGradient colors={isToday ? COLORS.gradientPrimary : [COLORS.surfaceElevated, COLORS.surfaceElevated]} style={[styles.weekBarFill, { height: barH }]} />
                                <Text style={[styles.weekDay, isToday && { color: COLORS.primary }]}>{d.day}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Food Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedFood?.foodName}</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}><Text style={styles.closeButtonText}>✕</Text></TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.nutritionGrid}>
                                <View style={styles.nutritionItem}><Text style={styles.nutritionLabel}>Calories</Text><Text style={styles.nutritionValue}>{selectedFood?.calories || 0} kcal</Text></View>
                                <View style={styles.nutritionItem}><Text style={styles.nutritionLabel}>Protein</Text><Text style={styles.nutritionValue}>{selectedFood?.protein || 0}g</Text></View>
                                <View style={styles.nutritionItem}><Text style={styles.nutritionLabel}>Carbs</Text><Text style={styles.nutritionValue}>{selectedFood?.carbs || 0}g</Text></View>
                                <View style={styles.nutritionItem}><Text style={styles.nutritionLabel}>Fat</Text><Text style={styles.nutritionValue}>{selectedFood?.fat || 0}g</Text></View>
                            </View>
                            <View style={styles.mealInfo}><Text style={styles.mealInfoLabel}>Meal Type</Text><Text style={styles.mealInfoValue}>{selectedFood?.mealType || 'Unknown'}</Text></View>
                            <View style={styles.mealInfo}><Text style={styles.mealInfoLabel}>Date</Text><Text style={styles.mealInfoValue}>{selectedFood?.date || 'Unknown'}</Text></View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={goalsModalVisible} onRequestClose={() => setGoalsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Nutrition Goals</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setGoalsModalVisible(false)}><Text style={styles.closeButtonText}>✕</Text></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.goalSectionLabel}>Fitness Goal</Text>
                            <View style={styles.goalChipRow}>
                                {Object.entries(FITNESS_GOALS).map(([key, goal]) => (
                                    <TouchableOpacity key={key} style={[styles.goalChip, editedGoals?.fitnessGoal === key && styles.goalChipActive]} onPress={() => handleFitnessGoalChange(key)}>
                                        <Text style={[styles.goalChipText, editedGoals?.fitnessGoal === key && styles.goalChipTextActive]}>{goal.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.goalSectionLabel}>Activity Level</Text>
                            <View style={styles.goalChipRow}>
                                {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                                    <TouchableOpacity key={key} style={[styles.goalChip, editedGoals?.activityLevel === key && styles.goalChipActive]} onPress={() => handleActivityLevelChange(key)}>
                                        <Text style={[styles.goalChipText, editedGoals?.activityLevel === key && styles.goalChipTextActive]}>{level.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.calculatedGoalsBox}>
                                <Text style={styles.calculatedGoalsTitle}>Your Daily Goals</Text>
                                <View style={styles.calculatedGoalsRow}>
                                    <View style={styles.calculatedGoalItem}><Text style={styles.calculatedGoalValue}>{editedGoals?.calories || '-'}</Text><Text style={styles.calculatedGoalLabel}>Calories</Text></View>
                                    <View style={styles.calculatedGoalItem}><Text style={styles.calculatedGoalValue}>{editedGoals?.protein || '-'}</Text><Text style={styles.calculatedGoalLabel}>Protein</Text></View>
                                    <View style={styles.calculatedGoalItem}><Text style={styles.calculatedGoalValue}>{editedGoals?.carbs || '-'}</Text><Text style={styles.calculatedGoalLabel}>Carbs</Text></View>
                                    <View style={styles.calculatedGoalItem}><Text style={styles.calculatedGoalValue}>{editedGoals?.fat || '-'}</Text><Text style={styles.calculatedGoalLabel}>Fat</Text></View>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.customToggle} onPress={handleToggleCustom}>
                                <View style={[styles.customToggleDot, editedGoals?.useCustom && styles.customToggleDotActive]}>
                                    {editedGoals?.useCustom && <Text style={styles.customToggleCheck}>✓</Text>}
                                </View>
                                <Text style={styles.customToggleText}>{editedGoals?.useCustom ? 'Using custom goals' : 'Use custom goals'}</Text>
                            </TouchableOpacity>

                            <View style={[styles.customGoalsSection, !editedGoals?.useCustom && styles.customGoalsDisabled]}>
                                <Text style={[styles.goalSectionLabel, !editedGoals?.useCustom && styles.textDisabled]}>Custom Goals</Text>
                                <View style={styles.goalInputRow}><Text style={[styles.goalInputLabel, !editedGoals?.useCustom && styles.textDisabled]}>Calories</Text><TextInput style={[styles.goalInput, !editedGoals?.useCustom && styles.inputDisabled]} value={editedGoals?.calories?.toString() || ''} onChangeText={(text) => handleCustomGoalChange('calories', text)} keyboardType="numeric" editable={editedGoals?.useCustom} /></View>
                                <View style={styles.goalInputRow}><Text style={[styles.goalInputLabel, !editedGoals?.useCustom && styles.textDisabled]}>Protein (g)</Text><TextInput style={[styles.goalInput, !editedGoals?.useCustom && styles.inputDisabled]} value={editedGoals?.protein?.toString() || ''} onChangeText={(text) => handleCustomGoalChange('protein', text)} keyboardType="numeric" editable={editedGoals?.useCustom} /></View>
                                <View style={styles.goalInputRow}><Text style={[styles.goalInputLabel, !editedGoals?.useCustom && styles.textDisabled]}>Carbs (g)</Text><TextInput style={[styles.goalInput, !editedGoals?.useCustom && styles.inputDisabled]} value={editedGoals?.carbs?.toString() || ''} onChangeText={(text) => handleCustomGoalChange('carbs', text)} keyboardType="numeric" editable={editedGoals?.useCustom} /></View>
                                <View style={styles.goalInputRow}><Text style={[styles.goalInputLabel, !editedGoals?.useCustom && styles.textDisabled]}>Fat (g)</Text><TextInput style={[styles.goalInput, !editedGoals?.useCustom && styles.inputDisabled]} value={editedGoals?.fat?.toString() || ''} onChangeText={(text) => handleCustomGoalChange('fat', text)} keyboardType="numeric" editable={editedGoals?.useCustom} /></View>

                            </View>

                            <View style={styles.mealInfo}>
                                <Text style={styles.mealInfoLabel}>Meal Type</Text>
                                <Text style={styles.mealInfoValue}>{selectedFood?.mealType || 'Unknown'}</Text>
                            </View>

                            {user?.height && user?.weight && user?.age && (
                                <View style={styles.bodyMetricsBox}>
                                    <Text style={styles.bodyMetricsTitle}>Your Body Metrics</Text>
                                    <Text style={styles.bodyMetricsText}>Height: {user.height}cm • Weight: {user.weight}kg • Age: {user.age}</Text>
                                    <Text style={styles.bodyMetricsHint}>Goals calculated using Mifflin-St Jeor equation</Text>
                                </View>
                            )}

                            <View style={styles.goalButtons}>
                                <TouchableOpacity style={styles.recalcButton} onPress={handleReset}><Text style={styles.recalcButtonText}>Reset</Text></TouchableOpacity>
                                <AnimatedButton title={savingGoals ? "Saving..." : "Save Goals"} onPress={handleSaveGoals} disabled={savingGoals} style={{ flex: 1 }} />

                            </View>

                            <View style={styles.mealInfo}>
                                <Text style={styles.mealInfoLabel}>Date</Text>
                                <Text style={styles.mealInfoValue}>{selectedFood?.date || 'Unknown'}</Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 140 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    headerTitle: { fontSize: FONT_SIZES.xxl, ...FONTS.bold, color: COLORS.text, flexShrink: 1 },
    logButton: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
    dateSelector: { marginBottom: SPACING.lg },
    dateItem: { alignItems: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md, marginRight: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder, minWidth: 48 },
    dateItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    dateDay: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, ...FONTS.medium },
    dateDayActive: { color: COLORS.text },
    dateNum: { color: COLORS.text, fontSize: FONT_SIZES.lg, ...FONTS.bold, marginTop: 2 },
    dateNumActive: { color: COLORS.text },
    calorieCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
    calorieHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    calorieLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
    calorieValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.xs },
    calorieValue: { color: COLORS.text, fontSize: FONT_SIZES.hero, ...FONTS.bold },
    calorieGoal: { color: COLORS.textMuted, fontSize: FONT_SIZES.md, marginLeft: SPACING.sm },
    calorieRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: COLORS.coral, alignItems: 'center', justifyContent: 'center' },
    caloriePercent: { color: COLORS.coral, fontSize: FONT_SIZES.sm, ...FONTS.bold },
    macroGrid: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md },
    macroCard: { flex: 1, backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder, ...SHADOWS.small },
    macroLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, ...FONTS.medium },
    macroValue: { fontSize: FONT_SIZES.xl, ...FONTS.bold, marginTop: SPACING.xs },
    macroGoal: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.xs },
    mealSection: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.lg,
        backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.lg,
    },
    mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    mealHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    mealEmoji: { fontSize: 24, marginRight: SPACING.md },
    mealTitle: { color: COLORS.text, fontSize: FONT_SIZES.lg, ...FONTS.semiBold },
    mealTime: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
    mealCalories: { color: COLORS.coral, fontSize: FONT_SIZES.md, ...FONTS.bold },
    mealEmpty: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontStyle: 'italic' },
    foodItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.glassBorder },
    vegDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.md },
    foodInfo: { flex: 1 },
    foodName: { color: COLORS.text, fontSize: FONT_SIZES.md },
    nutritionScore: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xs,
        gap: SPACING.sm,
    },
    gradeText: {
        fontSize: FONT_SIZES.xs,
        ...FONTS.semiBold,
    },
    scoreText: {
        fontSize: FONT_SIZES.xs,
        ...FONTS.medium,
        color: COLORS.textSecondary,
    },
    foodCalories: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
    weekChart: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
        marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
        padding: SPACING.lg, paddingBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder,
        height: 140,
    },
    weekBar: { alignItems: 'center' },
    weekCalValue: { color: COLORS.textMuted, fontSize: 9, marginBottom: 4 },
    weekBarFill: { width: 28, borderRadius: BORDER_RADIUS.sm },
    weekDay: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, margin: SPACING.lg, width: width * 0.9, maxWidth: 400, ...SHADOWS.large },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
    modalTitle: { fontSize: FONT_SIZES.lg, ...FONTS.bold, color: COLORS.text, flex: 1 },
    closeButton: { padding: SPACING.sm, borderRadius: BORDER_RADIUS.round, backgroundColor: 'rgba(255,255,255,0.1)' },
    closeButtonText: { fontSize: FONT_SIZES.lg, color: COLORS.textSecondary },
    modalBody: { gap: SPACING.lg },
    nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg },
    nutritionItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
    nutritionLabel: { fontSize: FONT_SIZES.sm, ...FONTS.medium, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    nutritionValue: { fontSize: FONT_SIZES.md, ...FONTS.bold, color: COLORS.text },
    mealInfo: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: SPACING.md, borderRadius: BORDER_RADIUS.md },
    mealInfoLabel: { fontSize: FONT_SIZES.sm, ...FONTS.medium, color: COLORS.textSecondary },
    mealInfoValue: { fontSize: FONT_SIZES.sm, ...FONTS.semiBold, color: COLORS.text },
    bmiCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '40', padding: SPACING.md },
    bmiLabel: { fontSize: FONT_SIZES.xs, ...FONTS.medium, color: COLORS.textSecondary },
    bmiRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.xs },
    bmiValue: { fontSize: FONT_SIZES.xxl, ...FONTS.bold, color: COLORS.primary },
    bmiCategory: { fontSize: FONT_SIZES.md, ...FONTS.medium, color: COLORS.textSecondary, marginLeft: SPACING.md },
    goalInfo: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: SPACING.sm },
    goalSectionLabel: { fontSize: FONT_SIZES.sm, ...FONTS.semiBold, color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm },
    goalChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    goalChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.round, borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: COLORS.surface },
    goalChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    goalChipText: { fontSize: FONT_SIZES.sm, ...FONTS.medium, color: COLORS.textSecondary },
    goalChipTextActive: { color: COLORS.textInverse },
    calculatedGoalsBox: { marginTop: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.primary + '15', borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.primary + '30' },
    calculatedGoalsTitle: { fontSize: FONT_SIZES.sm, ...FONTS.bold, color: COLORS.primary },
    calculatedGoalsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING.md },
    calculatedGoalItem: { alignItems: 'center' },
    calculatedGoalValue: { fontSize: FONT_SIZES.lg, ...FONTS.bold, color: COLORS.text },
    calculatedGoalLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    customToggle: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, padding: SPACING.sm },
    customToggleDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.glassBorder, marginRight: SPACING.sm, alignItems: 'center', justifyContent: 'center' },
    customToggleDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    customToggleCheck: { color: COLORS.textInverse, fontSize: 14, ...FONTS.bold },
    customToggleText: { fontSize: FONT_SIZES.sm, ...FONTS.medium, color: COLORS.text },
    customGoalsSection: { marginTop: SPACING.md },
    customGoalsDisabled: { opacity: 0.5 },
    textDisabled: { color: COLORS.textMuted },
    goalInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    goalInputLabel: { fontSize: FONT_SIZES.sm, ...FONTS.medium, color: COLORS.textSecondary },
    goalInput: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, width: 100, textAlign: 'right', color: COLORS.text, fontSize: FONT_SIZES.md },
    inputDisabled: { backgroundColor: COLORS.surface, color: COLORS.textMuted },
    bodyMetricsBox: { marginTop: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.primary + '10', borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.primary + '30' },
    bodyMetricsTitle: { fontSize: FONT_SIZES.sm, ...FONTS.bold, color: COLORS.primary },
    bodyMetricsText: { fontSize: FONT_SIZES.sm, color: COLORS.text, marginTop: SPACING.xs },
    bodyMetricsHint: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.xs },
    goalButtons: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl, marginBottom: SPACING.lg },
    recalcButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder },
    recalcButtonText: { fontSize: FONT_SIZES.sm, ...FONTS.medium, color: COLORS.textSecondary },
});

