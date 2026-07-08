/**
 * Nutrition Calculator - Calculates personalized daily nutrition goals
 * based on body metrics (height, weight, age, gender) and activity level
 * 
 * Uses Mifflin-St Jeor Equation for BMR calculation
 */

// Activity level factors
export const ACTIVITY_LEVELS = {
  sedentary: { label: 'Sedentary', factor: 1.2, description: 'Little or no exercise' },
  light: { label: 'Light', factor: 1.375, description: 'Light exercise 1-3 days/week' },
  moderate: { label: 'Moderate', factor: 1.55, description: 'Moderate exercise 3-5 days/week' },
  active: { label: 'Active', factor: 1.725, description: 'Hard exercise 6-7 days/week' },
  veryActive: { label: 'Very Active', factor: 1.9, description: 'Very hard exercise & physical job' },
};

// Fitness goals
export const FITNESS_GOALS = {
  lose: { label: 'Lose Weight', calorieOffset: -500, description: 'Calorie deficit for weight loss' },
  maintain: { label: 'Maintain', calorieOffset: 0, description: 'Maintain current weight' },
  gain: { label: 'Gain Muscle', calorieOffset: 300, description: 'Calorie surplus for muscle gain' },
};

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {number} age - Age in years
 * @param {string} gender - 'male', 'female', or 'other'
 * @returns {number} BMR in calories
 */
export function calculateBMR(weight, height, age, gender) {
  if (!weight || !height || !age || !gender) {
    return null;
  }

  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age);

  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return Math.round((10 * w) + (6.25 * h) - (5 * a) + 5);
  } else {
    return Math.round((10 * w) + (6.25 * h) - (5 * a) - 161);
  }
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level key
 * @returns {number} TDEE in calories
 */
export function calculateTDEE(bmr, activityLevel = 'moderate') {
  if (!bmr) return null;
  
  const factor = ACTIVITY_LEVELS[activityLevel]?.factor || 1.55;
  return Math.round(bmr * factor);
}

/**
 * Calculate daily nutrition goals based on body metrics
 * @param {Object} params - User parameters
 * @param {number} params.weight - Weight in kg
 * @param {number} params.height - Height in cm
 * @param {number} params.age - Age in years
 * @param {string} params.gender - Gender: 'male', 'female', or 'other'
 * @param {string} params.activityLevel - Activity level key (default: 'moderate')
 * @param {string} params.fitnessGoal - Fitness goal key (default: 'maintain')
 * @returns {Object} Nutrition goals
 */
export function calculateNutritionGoals({ 
  weight, 
  height, 
  age, 
  gender, 
  activityLevel = 'moderate',
  fitnessGoal = 'maintain' 
}) {
  // Calculate BMR
  const bmr = calculateBMR(weight, height, age, gender);
  
  if (!bmr) {
    // Return default goals if insufficient data
    return getDefaultGoals();
  }

  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel);
  
  // Apply fitness goal offset
  const goalOffset = FITNESS_GOALS[fitnessGoal]?.calorieOffset || 0;
  const targetCalories = tdee + goalOffset;

  // Calculate macros based on body weight and calorie target
  // Protein: 1.6-2.2g per kg of body weight (higher for active individuals)
  const proteinFactor = activityLevel === 'sedentary' ? 1.6 : 
                        activityLevel === 'light' ? 1.8 : 
                        activityLevel === 'moderate' ? 2.0 : 2.2;
  const proteinGrams = Math.round(weight * proteinFactor);
  
  // Fat: 25-30% of total calories
  const fatCalories = targetCalories * 0.28;
  const fatGrams = Math.round(fatCalories / 9); // 9 cal per gram of fat
  
  // Carbs: Remaining calories
  const proteinCalories = proteinGrams * 4; // 4 cal per gram of protein
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(Math.max(carbCalories / 4, 50)); // Minimum 50g carbs

  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams,
    bmr,
    tdee,
    activityLevel,
    fitnessGoal,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get default nutrition goals when user data is insufficient
 * @returns {Object} Default goals
 */
export function getDefaultGoals() {
  return {
    calories: 2000,
    protein: 60,
    carbs: 250,
    fat: 65,
    bmr: null,
    tdee: null,
    activityLevel: 'moderate',
    fitnessGoal: 'maintain',
    calculatedAt: null,
  };
}

/**
 * Calculate BMI (Body Mass Index)
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @returns {Object} BMI value and category
 */
export function calculateBMI(weight, height) {
  if (!weight || !height) return null;
  
  const h = height / 100; // convert cm to meters
  const bmi = weight / (h * h);
  
  let category;
  if (bmi < 16) category = 'Severely Underweight';
  else if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  
  return {
    value: Math.round(bmi * 10) / 10,
    category,
  };
}

/**
 * Format nutrition goals for display
 * @param {Object} goals - Nutrition goals
 * @returns {Object} Formatted goals
 */
export function formatGoalsForDisplay(goals) {
  if (!goals) return getDefaultGoals();
  
  return {
    calories: goals.calories || 2000,
    protein: goals.protein || 60,
    carbs: goals.carbs || 250,
    fat: goals.fat || 65,
  };
}

/**
 * Get activity level from fitness level
 * @param {string} fitnessLevel - User's fitness level
 * @returns {string} Activity level key
 */
export function getActivityLevelFromFitness(fitnessLevel) {
  switch (fitnessLevel) {
    case 'beginner': return 'light';
    case 'intermediate': return 'moderate';
    case 'advanced': return 'active';
    case 'athlete': return 'veryActive';
    default: return 'moderate';
  }
}

export default {
  calculateBMR,
  calculateTDEE,
  calculateNutritionGoals,
  getDefaultGoals,
  calculateBMI,
  formatGoalsForDisplay,
  getActivityLevelFromFitness,
  ACTIVITY_LEVELS,
  FITNESS_GOALS,
};

